# app/main.py

import os
import json
import logging
import threading
from contextlib import asynccontextmanager

import yfinance as yf

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import Base, engine, SessionLocal
from . import crud, models, schemas
from .market_data import get_stock_price
from .news_fetcher import get_news
from .ai_analyzer import analyze_stock_with_ai

# ✅ Load .env file FIRST — before any code uses environment variables
from dotenv import load_dotenv
load_dotenv()

# ─── Scheduler Imports ───
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

# ─── Logging ───
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ─── Create all DB tables on startup ───
Base.metadata.create_all(bind=engine)


# ─── Helper: Normalize AI Analysis Result ──────────────────────
def normalize_analysis_result(result):
    """Ensure AI analysis result is always a dict with signal, confidence, reasoning."""
    if isinstance(result, dict):
        return result

    if isinstance(result, str):
        text = result.strip()
        # Remove markdown code fences if present
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()

        try:
            parsed = json.loads(text)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            pass

        # Fallback: Treat as reasoning text
        return {
            "signal": "HOLD",
            "confidence": 0.0,
            "reasoning": text
        }

    # Fallback for any other type
    return {
        "signal": "HOLD",
        "confidence": 0.0,
        "reasoning": str(result)
    }


# ─── NEW: Currency Detection ─────────────────────────────────────
def get_currency(symbol: str) -> dict:
    """
    Determine currency and symbol based on stock exchange suffix.
    Returns dict: { "currency": str, "currency_symbol": str }
    """
    suffix_map = {
        '.NS':   { 'currency': 'INR', 'currency_symbol': '₹' },
        '.BO':   { 'currency': 'INR', 'currency_symbol': '₹' },
        '.L':    { 'currency': 'GBP', 'currency_symbol': '£' },
        '.TO':   { 'currency': 'CAD', 'currency_symbol': 'CA$' },
        '.AX':   { 'currency': 'AUD', 'currency_symbol': 'A$' },
        '.DE':   { 'currency': 'EUR', 'currency_symbol': '€' },
        '.PA':   { 'currency': 'EUR', 'currency_symbol': '€' },
        '.MI':   { 'currency': 'EUR', 'currency_symbol': '€' },
        '.HK':   { 'currency': 'HKD', 'currency_symbol': 'HK$' },
        '.SS':   { 'currency': 'CNY', 'currency_symbol': '¥' },
        '.SZ':   { 'currency': 'CNY', 'currency_symbol': '¥' },
        '.TW':   { 'currency': 'TWD', 'currency_symbol': 'NT$' },
        '.SA':   { 'currency': 'SAR', 'currency_symbol': '﷼' },
        '.SI':   { 'currency': 'SGD', 'currency_symbol': 'S$' },
        '.KS':   { 'currency': 'KRW', 'currency_symbol': '₩' },
        '.T':    { 'currency': 'JPY', 'currency_symbol': '¥' },
    }
    
    # Check suffix
    for suffix, info in suffix_map.items():
        if symbol.upper().endswith(suffix):
            return info
    
    # Default to USD
    return { 'currency': 'USD', 'currency_symbol': '$' }


# ─── NEW: Resolve Ticker (auto-add .NS fallback) ────────────────
def resolve_ticker(symbol: str) -> tuple:
    """
    Resolve a stock symbol to a valid ticker.
    Returns: (resolved_symbol, source_label)
    - If symbol contains a dot (e.g., 'TCS.NS'), use as-is.
    - If symbol has no suffix, try it raw first, then fallback to .NS.
    """
    symbol = symbol.upper().strip()
    
    # If already has a suffix, use as-is
    if '.' in symbol:
        return symbol, 'direct'
    
    # Try raw symbol first (for US stocks like AAPL, TSLA)
    try:
        test = yf.Ticker(symbol)
        hist = test.history(period="5d")
        if not hist.empty:
            logger.info(f"✅ '{symbol}' resolved as US ticker")
            return symbol, 'us'
    except Exception:
        pass
    
    # Fallback: try with .NS suffix (Indian stocks)
    fallback = f"{symbol}.NS"
    try:
        test = yf.Ticker(fallback)
        hist = test.history(period="5d")
        if not hist.empty:
            logger.info(f"✅ '{symbol}' → resolved as Indian ticker '{fallback}'")
            return fallback, 'india_fallback'
    except Exception:
        pass
    
    # Return original — let the caller handle error
    logger.warning(f"⚠️ '{symbol}' could not be resolved — returning as-is")
    return symbol, 'unresolved'


# ─── Scheduler Setup ────────────────────────────────────────────
scheduler = BackgroundScheduler()
DEFAULT_SYMBOLS = ["AAPL", "TSLA", "GOOGL", "MSFT", "AMZN"]

INTERVAL_HOURS = int(os.getenv("SCHEDULER_INTERVAL_HOURS", "4"))
RUN_SCHEDULER_ON_STARTUP = os.getenv("RUN_SCHEDULER_ON_STARTUP", "false").lower() == "true"


def run_scheduled_analysis():
    """Background task: analyze all watched symbols and save to DB."""
    from .database import SessionLocal as db_session

    symbols = os.getenv("WATCH_SYMBOLS", ",".join(DEFAULT_SYMBOLS)).split(",")
    logger.info(f"🔄 [Scheduler] Starting analysis for {symbols}")

    db = db_session()
    try:
        for symbol in symbols:
            symbol = symbol.strip().upper()
            if not symbol:
                continue

            try:
                import asyncio

                # Fetch stock data
                stock_data = get_stock_price(symbol)
                if "error" in stock_data:
                    logger.warning(f"⚠️ [Scheduler] Skipping {symbol}: {stock_data['error']}")
                    continue

                # Fetch news — gracefully handle failure (e.g., 429)
                news_data = asyncio.run(get_news(symbol))
                if isinstance(news_data, dict) and "error" in news_data:
                    logger.warning(f"⚠️ [Scheduler] News unavailable for {symbol}: {news_data['error']}")
                    news_data = []

                # Run AI analysis
                analysis = asyncio.run(
                    analyze_stock_with_ai(
                        symbol=symbol,
                        stock_data=stock_data,
                        news_data=news_data
                    )
                )
                analysis = normalize_analysis_result(analysis)

                # Save signal
                crud.save_analysis_signal(
                    db=db,
                    symbol=symbol,
                    signal=analysis.get("signal", "HOLD"),
                    confidence=float(analysis.get("confidence", 0.0)),
                    analysis_text=analysis.get("reasoning", str(analysis))
                )
                logger.info(f"✅ [Scheduler] {symbol} → {analysis.get('signal', 'HOLD')}")

                # Save news articles (only if we have them)
                if news_data:
                    articles = news_data if isinstance(news_data, list) else news_data.get("articles", [])
                    for article in articles[:5]:
                        crud.save_news_article(
                            db=db,
                            symbol=symbol,
                            headline=article.get("headline", article.get("title", "No headline")),
                            summary=article.get("summary", ""),
                            url=article.get("url", ""),
                            published_at=article.get("published_at", None)
                        )

            except Exception as e:
                logger.error(f"❌ [Scheduler] Error for {symbol}: {e}")

        db.commit()
        logger.info(f"✅ [Scheduler] Run complete for {len(symbols)} symbols")

    except Exception as e:
        logger.error(f"❌ [Scheduler] Fatal error: {e}")
        db.rollback()
    finally:
        db.close()


def start_scheduler():
    """Start the background scheduler."""
    if scheduler.running:
        logger.warning("[Scheduler] Already running — skipping")
        return

    scheduler.add_job(
        run_scheduled_analysis,
        IntervalTrigger(hours=INTERVAL_HOURS),
        id="analyze_all_symbols",
        name=f"Analyze all symbols every {INTERVAL_HOURS} hour(s)",
        replace_existing=True,
    )

    scheduler.start()
    logger.info(f"🚀 [Scheduler] Started — running every {INTERVAL_HOURS} hour(s)")

    # Optionally run once immediately at startup
    if RUN_SCHEDULER_ON_STARTUP:
        threading.Thread(target=run_scheduled_analysis, daemon=True).start()
        logger.info("⚡ [Scheduler] Immediate startup analysis triggered")
    else:
        logger.info("⏭️ [Scheduler] Immediate startup analysis disabled — waiting for interval")


def stop_scheduler():
    """Gracefully stop the scheduler."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("🛑 [Scheduler] Stopped")


# ─── Lifespan (Startup / Shutdown) ──────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("🚀 Starting up — initializing scheduler...")
    start_scheduler()
    yield
    # Shutdown
    logger.info("🛑 Shutting down — stopping scheduler...")
    stop_scheduler()


# ─── CORS Middleware ───
app = FastAPI(
    title="AI Trading Analyzer API",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://trading-app-phase1.netlify.app",
        "https://aitradinganalyze.netlify.app", 
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── DB Dependency ───
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ─────────────────────────────────────────
# ROOT
# ─────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "AI Trading Analyzer backend is running ✅"}


# ─────────────────────────────────────────
# SIGNALS
# ─────────────────────────────────────────

@app.get("/signals", response_model=list[schemas.SignalOut])
def read_signals(db: Session = Depends(get_db)):
    """Get all signals from the database"""
    return crud.get_signals(db)


@app.post("/signals", response_model=schemas.SignalOut)
def create_signal(signal: schemas.SignalCreate, db: Session = Depends(get_db)):
    """Manually create a signal"""
    return crud.create_signal(db, signal)


@app.get("/signals/history/{symbol}")
def signal_history(symbol: str, limit: int = 10, db: Session = Depends(get_db)):
    """Get signal history for a specific stock"""
    resolved, _ = resolve_ticker(symbol)
    history = crud.get_signal_history(db, symbol=resolved.upper(), limit=limit)
    if not history:
        raise HTTPException(
            status_code=404,
            detail=f"No signal history found for {resolved.upper()}",
        )
    return history


# ─────────────────────────────────────────
# STOCK DATA (Real-time + History)
# ─────────────────────────────────────────

@app.get("/stock/{symbol}")
def stock_price(symbol: str):
    """Get real-time stock price with currency info"""
    resolved, source = resolve_ticker(symbol)
    
    stock_data = get_stock_price(resolved)
    if "error" in stock_data:
        # If raw failed and we were in fallback mode, it's truly not found
        raise HTTPException(status_code=404, detail=stock_data["error"])
    
    # Add currency info
    currency_info = get_currency(resolved)
    stock_data["currency"] = currency_info["currency"]
    stock_data["currency_symbol"] = currency_info["currency_symbol"]
    stock_data["resolved_symbol"] = resolved
    
    return stock_data


@app.get("/stock/history/{symbol}")
def stock_history(symbol: str, period: str = "1mo"):
    """
    Get historical stock price data.
    
    Params:
    - symbol: Stock symbol (e.g., AAPL, TSLA, TCS)
    - period: Time period (1d, 1mo, 3mo, 1y, 5y, 10y, ytd, max)
    
    Returns:
    - historical_data: List of {date, open, high, low, close, volume}
    - currency + currency_symbol
    """
    resolved, source = resolve_ticker(symbol)
    
    try:
        stock = yf.Ticker(resolved)
        hist = stock.history(period=period)
        
        if hist.empty:
            raise HTTPException(status_code=404, detail=f"No historical data found for {resolved}")
        
        # Format the data
        historical_data = []
        for date, row in hist.iterrows():
            historical_data.append({
                "date": date.strftime("%Y-%m-%d"),
                "open": round(float(row["Open"]), 2),
                "high": round(float(row["High"]), 2),
                "low": round(float(row["Low"]), 2),
                "close": round(float(row["Close"]), 2),
                "volume": int(row["Volume"])
            })
        
        currency_info = get_currency(resolved)
        
        return {
            "symbol": resolved.upper(),
            "original_query": symbol.upper(),
            "period": period,
            "currency": currency_info["currency"],
            "currency_symbol": currency_info["currency_symbol"],
            "historical_data": historical_data,
            "total_records": len(historical_data)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Stock history error for {resolved}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────
# NEWS
# ─────────────────────────────────────────

@app.get("/news/{symbol}")
async def news_headlines(symbol: str):
    """Get latest news for a stock"""
    return await get_news(symbol)


@app.get("/news/history/{symbol}")
def news_history(symbol: str, limit: int = 10, db: Session = Depends(get_db)):
    """Get saved news history for a stock"""
    resolved, _ = resolve_ticker(symbol)
    history = crud.get_news_history(db, symbol=resolved.upper(), limit=limit)
    if not history:
        raise HTTPException(
            status_code=404,
            detail=f"No news history found for {resolved.upper()}",
        )
    return history


# ─────────────────────────────────────────
# SCHEDULER STATUS
# ─────────────────────────────────────────

@app.get("/scheduler/status")
def scheduler_status():
    """Check if the background scheduler is running"""
    next_run = (
        str(scheduler.get_job("analyze_all_symbols").next_run_time)
        if scheduler.get_job("analyze_all_symbols")
        else None
    )
    return {
        "running": scheduler.running,
        "interval_hours": INTERVAL_HOURS,
        "run_on_startup": RUN_SCHEDULER_ON_STARTUP,
        "next_run_time": next_run,
    }


# ─────────────────────────────────────────
# AI ANALYSIS (Main Endpoint) — UPDATED ✅
# ─────────────────────────────────────────

@app.get("/analyze/{symbol}")
async def analyze_stock(symbol: str, db: Session = Depends(get_db)):
    """
    Full pipeline:
    1. Resolve ticker (auto .NS fallback for Indian stocks)
    2. Fetch real-time stock data
    3. Fetch latest news
    4. Run AI analysis
    5. Save signal + news to DB
    6. Return full result with currency info
    """

    # Step 0: Resolve the ticker (auto-detect .NS)
    resolved, source = resolve_ticker(symbol)
    logger.info(f"📈 Analyzing '{symbol}' → resolved to '{resolved}' (source: {source})")

    # Step 1: Stock Data
    stock_data = get_stock_price(resolved)
    if "error" in stock_data:
        raise HTTPException(status_code=400, detail=stock_data["error"])

    # Add currency info to stock_data
    currency_info = get_currency(resolved)
    stock_data["currency"] = currency_info["currency"]
    stock_data["currency_symbol"] = currency_info["currency_symbol"]
    stock_data["resolved_symbol"] = resolved

    # Step 2: News Data — gracefully handle failure
    news_warning = None
    news_data = await get_news(resolved)
    if isinstance(news_data, dict) and "error" in news_data:
        news_warning = news_data["error"]
        news_data = []  # Don't raise — proceed with empty news

    # Step 3: AI Analysis
    try:
        analysis = await analyze_stock_with_ai(
            symbol=resolved,
            stock_data=stock_data,
            news_data=news_data
        )
        analysis = normalize_analysis_result(analysis)
    except Exception as e:
        logger.exception(f"AI analysis failed for {resolved}: {e}")
        analysis = {
            "signal": "HOLD",
            "confidence": 0.0,
            "reasoning": f"AI analysis temporarily unavailable: {str(e)}"
        }

    # Step 4a: Save Signal to DB
    try:
        crud.save_analysis_signal(
            db=db,
            symbol=resolved.upper(),
            signal=analysis.get("signal", "HOLD"),
            confidence=float(analysis.get("confidence", 0.0)),
            analysis_text=analysis.get("reasoning", str(analysis)),
        )
        logger.info(f"✅ Signal saved: {resolved.upper()} → {analysis.get('signal')}")
    except Exception as e:
        logger.warning(f"⚠️ Could not save signal: {e}")

    # Step 4b: Save News Articles to DB (only if available)
    if news_data:
        try:
            articles = (
                news_data
                if isinstance(news_data, list)
                else news_data.get("articles", [])
            )
            for article in articles[:5]:
                crud.save_news_article(
                    db=db,
                    symbol=resolved.upper(),
                    headline=article.get("headline", article.get("title", "No headline")),
                    summary=article.get("summary", ""),
                    url=article.get("url", ""),
                    published_at=article.get("published_at", None),
                )
            logger.info(f"✅ News saved: {len(articles[:5])} articles for {resolved.upper()}")
        except Exception as e:
            logger.warning(f"⚠️ Could not save news: {e}")

    # Step 5: Return Full Result with Currency
    return {
        "symbol": resolved.upper(),
        "original_query": symbol.upper(),
        "stock_data": stock_data,
        "news": news_data,
        "news_warning": news_warning,
        "ai_analysis": analysis,
    }