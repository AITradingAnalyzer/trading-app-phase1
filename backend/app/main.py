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
from .market_data import get_stock_price, resolve_ticker, get_currency_info
from .news_fetcher import get_news
from .ai_analyzer import analyze_stock_with_ai

from dotenv import load_dotenv
load_dotenv()

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

Base.metadata.create_all(bind=engine)


# ─── Helper: Normalize AI Analysis Result ──────────────────────
def normalize_analysis_result(result):
    if isinstance(result, dict):
        return result

    if isinstance(result, str):
        text = result.strip()
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

        return {
            "signal": "HOLD",
            "confidence": 0.0,
            "reasoning": text
        }

    return {
        "signal": "HOLD",
        "confidence": 0.0,
        "reasoning": str(result)
    }


# ══════════════════════════════════════════════════════════════
# 🔧 FIX 1: Add this helper function for news query cleaning
# ══════════════════════════════════════════════════════════════
def get_news_query(original_symbol: str, resolved_symbol: str) -> str:
    """
    For news search, strip the .NS/.BO suffix.
    NewsAPI searches for 'TCS', not 'TCS.NS'.
    """
    original = (original_symbol or "").upper().strip()
    resolved = (resolved_symbol or "").upper().strip()

    # If user typed 'TCS' (no dot), use that directly
    if original and "." not in original:
        return original

    # If resolved to TCS.NS, strip the suffix
    if resolved:
        return resolved.split(".")[0]

    return original or resolved


# ─── Scheduler Setup ────────────────────────────────────────────
scheduler = BackgroundScheduler()
DEFAULT_SYMBOLS = ["AAPL", "TSLA", "GOOGL", "MSFT", "AMZN"]

INTERVAL_HOURS = int(os.getenv("SCHEDULER_INTERVAL_HOURS", "4"))
RUN_SCHEDULER_ON_STARTUP = os.getenv("RUN_SCHEDULER_ON_STARTUP", "false").lower() == "true"


def run_scheduled_analysis():
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

                resolved, source = resolve_ticker(symbol)

                stock_data = get_stock_price(resolved)
                if "error" in stock_data:
                    logger.warning(f"⚠️ [Scheduler] Skipping {resolved}: {stock_data['error']}")
                    continue

                # ══════════════════════════════════════════════════
                # 🔧 FIX 2: Use cleaned query for news in scheduler
                # ══════════════════════════════════════════════════
                news_query = get_news_query(symbol, resolved)
                news_data = asyncio.run(get_news(news_query))
                if isinstance(news_data, dict) and "error" in news_data:
                    logger.warning(f"⚠️ [Scheduler] News unavailable for {resolved}: {news_data['error']}")
                    news_data = []

                analysis = asyncio.run(
                    analyze_stock_with_ai(
                        symbol=resolved,
                        stock_data=stock_data,
                        news_data=news_data
                    )
                )
                analysis = normalize_analysis_result(analysis)

                crud.save_analysis_signal(
                    db=db,
                    symbol=resolved.upper(),
                    signal=analysis.get("signal", "HOLD"),
                    confidence=float(analysis.get("confidence", 0.0)),
                    analysis_text=analysis.get("reasoning", str(analysis))
                )
                logger.info(f"✅ [Scheduler] {resolved} → {analysis.get('signal', 'HOLD')}")

                if news_data:
                    articles = news_data if isinstance(news_data, list) else news_data.get("articles", [])
                    for article in articles[:5]:
                        crud.save_news_article(
                            db=db,
                            symbol=resolved.upper(),
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

    if RUN_SCHEDULER_ON_STARTUP:
        threading.Thread(target=run_scheduled_analysis, daemon=True).start()
        logger.info("⚡ [Scheduler] Immediate startup analysis triggered")
    else:
        logger.info("⏭️ [Scheduler] Immediate startup analysis disabled — waiting for interval")


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("🛑 [Scheduler] Stopped")


# ─── Lifespan (Startup / Shutdown) ──────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Starting up — initializing scheduler...")
    start_scheduler()
    yield
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
    return crud.get_signals(db)


@app.post("/signals", response_model=schemas.SignalOut)
def create_signal(signal: schemas.SignalCreate, db: Session = Depends(get_db)):
    return crud.create_signal(db, signal)


@app.get("/signals/history/{symbol}")
def signal_history(symbol: str, limit: int = 10, db: Session = Depends(get_db)):
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
    resolved, source = resolve_ticker(symbol)

    stock_data = get_stock_price(resolved)
    if "error" in stock_data:
        raise HTTPException(status_code=404, detail=stock_data["error"])

    currency_info = get_currency_info(resolved)
    stock_data["currency"] = currency_info["currency"]
    stock_data["currency_symbol"] = currency_info["currency_symbol"]
    stock_data["resolved_symbol"] = resolved

    return stock_data


@app.get("/stock/history/{symbol}")
def stock_history(symbol: str, period: str = "1mo"):
    resolved, source = resolve_ticker(symbol)

    try:
        stock = yf.Ticker(resolved)
        hist = stock.history(period=period)

        if hist.empty:
            raise HTTPException(status_code=404, detail=f"No historical data found for {resolved}")

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

        currency_info = get_currency_info(resolved)

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

# ══════════════════════════════════════════════════════════════
# 🔧 FIX 3: Updated news route — uses cleaned query
# ══════════════════════════════════════════════════════════════
@app.get("/news/{symbol}")
async def news_headlines(symbol: str):
    """Get latest news for a stock"""
    resolved, _ = resolve_ticker(symbol)
    news_query = get_news_query(symbol, resolved)   # ✅ Use cleaned name
    return await get_news(news_query)


@app.get("/news/history/{symbol}")
def news_history(symbol: str, limit: int = 10, db: Session = Depends(get_db)):
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
# AI ANALYSIS (Main Endpoint)
# ─────────────────────────────────────────

# ══════════════════════════════════════════════════════════════
# 🔧 FIX 4: Updated analyze route — uses cleaned query for news
# ══════════════════════════════════════════════════════════════
@app.get("/analyze/{symbol}")
async def analyze_stock(symbol: str, db: Session = Depends(get_db)):
    """
    Full pipeline:
    1. Resolve ticker (auto .NS fallback for Indian stocks via market_data.py)
    2. Fetch real-time stock data
    3. Fetch latest news (using cleaned query — e.g. TCS not TCS.NS)
    4. Run AI analysis
    5. Save signal + news to DB
    6. Return full result with currency info
    """

    # Step 0: Resolve the ticker
    resolved, source = resolve_ticker(symbol)
    logger.info(f"📈 Analyzing '{symbol}' → resolved to '{resolved}' (source: {source})")

    # Step 1: Stock Data
    stock_data = get_stock_price(resolved)
    if "error" in stock_data:
        raise HTTPException(status_code=400, detail=stock_data["error"])

    # Add currency info to stock_data
    currency_info = get_currency_info(resolved)
    stock_data["currency"] = currency_info["currency"]
    stock_data["currency_symbol"] = currency_info["currency_symbol"]
    stock_data["resolved_symbol"] = resolved

    # Step 2: News Data — use cleaned query (e.g. "TCS" not "TCS.NS")
    news_warning = None
    news_query = get_news_query(symbol, resolved)   # ✅ Use cleaned name
    news_data = await get_news(news_query)
    if isinstance(news_data, dict) and "error" in news_data:
        news_warning = news_data["error"]
        news_data = []

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

    # Step 4b: Save News Articles to DB
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