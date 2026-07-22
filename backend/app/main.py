# app/main.py

import os
import json
import logging
import threading
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import yfinance as yf
import pandas as pd

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import Base, engine, SessionLocal
from . import crud, models, schemas
from .market_data import get_stock_price, resolve_ticker, get_currency_info
from .news_fetcher import get_news
try:
    from .ai_analyzer import analyze_stock_with_ai
except ImportError:
    from .ai_analyzer import analyze_with_ai as analyze_stock_with_ai

from dotenv import load_dotenv
load_dotenv()

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

Base.metadata.create_all(bind=engine)


# ─── Indian Stocks Master List ────────────────────────────────────
INDIAN_STOCKS = {
    "RELIANCE.NS":   "Reliance Industries Ltd",
    "TCS.NS":        "Tata Consultancy Services Ltd",
    "INFY.NS":       "Infosys Ltd",
    "HDFCBANK.NS":   "HDFC Bank Ltd",
    "ICICIBANK.NS":  "ICICI Bank Ltd",
    "SBIN.NS":       "State Bank of India",
    "BHARTIARTL.NS": "Bharti Airtel Ltd",
    "ITC.NS":        "ITC Ltd",
    "LT.NS":         "Larsen & Toubro Ltd",
    "AXISBANK.NS":   "Axis Bank Ltd",
    "ASIANPAINT.NS": "Asian Paints Ltd",
    "BAJFINANCE.NS": "Bajaj Finance Ltd",
    "BAJAJFINSV.NS": "Bajaj Finserv Ltd",
    "ADANIENT.NS":   "Adani Enterprises Ltd",
    "ADANIPORTS.NS": "Adani Ports & SEZ Ltd",
    "NTPC.NS":       "NTPC Ltd",
    "POWERGRID.NS":  "Power Grid Corporation Ltd",
    "ONGC.NS":       "Oil & Natural Gas Corporation Ltd",
    "COALINDIA.NS":  "Coal India Ltd",
    "TATAMOTORS.NS": "Tata Motors Ltd",
    "WIPRO.NS":      "Wipro Ltd",
    "HCLTECH.NS":    "HCL Technologies Ltd",
    "TECHM.NS":      "Tech Mahindra Ltd",
    "MARUTI.NS":     "Maruti Suzuki India Ltd",
    "TATSTEEL.NS":   "Tata Steel Ltd",
    "JSWSTEEL.NS":   "JSW Steel Ltd",
    "SUNPHARMA.NS":  "Sun Pharmaceutical Industries Ltd",
    "DRREDDY.NS":    "Dr. Reddy's Laboratories Ltd",
    "CIPLA.NS":      "Cipla Ltd",
    "ULTRACEMCO.NS": "UltraTech Cement Ltd",
    "HINDUNILVR.NS": "Hindustan Unilever Ltd",
    "NESTLEIND.NS":  "Nestlé India Ltd",
    "BRITANNIA.NS":  "Britannia Industries Ltd",
    "TITAN.NS":      "Titan Company Ltd",
    "DMART.NS":      "Avenue Supermarts Ltd",
    "TRENT.NS":      "Trent Ltd",
    "ZOMATO.NS":     "Zomato Ltd",
    "PAGEIND.NS":    "Page Industries Ltd",
}

# ─── US Tickers Blocklist ─────────────────────────────────────────
US_TICKERS = {
    "AAPL", "MSFT", "GOOGL", "GOOG", "AMZN", "META", "TSLA",
    "NVDA", "JPM", "V", "WMT", "JNJ", "MA", "PG", "UNH", "HD",
    "BAC", "DIS", "ADBE", "CRM", "NFLX", "CMCSA", "XOM", "VZ",
    "KO", "PEP", "ABT", "MRK", "ORCL", "COST", "AMD", "INTC",
    "QCOM", "IBM", "BA", "F", "GM", "GE", "CAT", "MMM", "T",
    "NKE", "MCD", "SBUX", "UPS", "DOW", "CSCO", "PYPL", "UBER",
    "SNAP", "SPOT", "BABA", "TCEHY",
}


# ─── Technical Helpers ────────────────────────────────────────────
def calculate_rsi(close: pd.Series, period: int = 14) -> pd.Series:
    delta    = close.diff()
    gain     = delta.clip(lower=0)
    loss     = -delta.clip(upper=0)
    avg_gain = gain.rolling(period).mean()
    avg_loss = loss.rolling(period).mean()
    rs       = avg_gain / avg_loss.replace(0, 1e-9)
    return 100 - (100 / (1 + rs))


def build_justification(price, prev_close, sma20, sma50, rsi, signal):
    """Build a structured list of bullet-point justifications + timeframe."""
    bullets = []
    timeframe = "Medium-term: 2–4 weeks"

    # Price vs MA
    if price > sma20:
        bullets.append(f"Price (₹{price}) is trading **above** the 20-day MA (₹{sma20:.2f}) — short-term uptrend.")
    else:
        bullets.append(f"Price (₹{price}) is trading **below** the 20-day MA (₹{sma20:.2f}) — short-term weakness.")

    # MA crossover
    if sma20 > sma50:
        bullets.append(f"20-day MA (₹{sma20:.2f}) is **above** 50-day MA (₹{sma50:.2f}) — bullish crossover.")
    else:
        bullets.append(f"20-day MA (₹{sma20:.2f}) is **below** 50-day MA (₹{sma50:.2f}) — bearish crossover.")

    # RSI
    if rsi < 35:
        bullets.append(f"RSI at {rsi:.1f} — stock is in **oversold** territory (potential bounce).")
    elif rsi > 70:
        bullets.append(f"RSI at {rsi:.1f} — stock is in **overbought** territory (caution advised).")
    elif 45 <= rsi <= 65:
        bullets.append(f"RSI at {rsi:.1f} — in **healthy neutral** range, no extreme momentum.")
    else:
        bullets.append(f"RSI at {rsi:.1f} — slightly weak momentum.")

    # Daily change
    change_pct = 0.0
    if prev_close and prev_close > 0:
        change_pct = round(((price - prev_close) / prev_close) * 100, 2)
    if change_pct > 1.5:
        bullets.append(f"Daily change of {change_pct:+.2f}% — **strong upward** momentum today.")
    elif change_pct < -1.5:
        bullets.append(f"Daily change of {change_pct:+.2f}% — **strong downward** momentum today.")
    else:
        bullets.append(f"Daily change of {change_pct:+.2f}% — relatively stable session.")

    # Timeframe logic based on signal
    if signal == "BUY":
        timeframe = "Short-term: 3–10 days | Medium-term: 2–6 weeks"
    elif signal == "SELL":
        timeframe = "Consider exiting within 1–5 days | Avoid fresh positions"
    else:
        timeframe = "Hold and reassess in 1–2 weeks | Await clearer signals"

    return bullets, timeframe


def build_technical_signal(price, prev_close, sma20, sma50, rsi):
    score           = 0
    bullish_reasons = []
    bearish_reasons = []

    change_pct = 0.0
    if prev_close and prev_close > 0:
        change_pct = round(((price - prev_close) / prev_close) * 100, 2)

    if price > sma20:
        score += 1
        bullish_reasons.append("price above 20-day MA")
    else:
        score -= 1
        bearish_reasons.append("price below 20-day MA")

    if sma20 > sma50:
        score += 1
        bullish_reasons.append("short-term trend stronger than medium-term")
    else:
        score -= 1
        bearish_reasons.append("short-term trend weaker than medium-term")

    if rsi < 35:
        score += 0.5
        bullish_reasons.append("near oversold levels (RSI)")
    elif 45 <= rsi <= 65:
        score += 0.5
        bullish_reasons.append("healthy RSI range")
    elif rsi > 70:
        score -= 0.5
        bearish_reasons.append("overbought RSI")

    if change_pct > 1.5:
        score += 0.5
        bullish_reasons.append("strong daily momentum")
    elif change_pct < -1.5:
        score -= 0.5
        bearish_reasons.append("weak daily momentum")

    if score >= 2:
        signal    = "BUY"
        sentiment = "bullish"
    elif score <= -2:
        signal    = "SELL"
        sentiment = "bearish"
    else:
        signal    = "HOLD"
        sentiment = "neutral"

    confidence = min(92, max(55, int(58 + abs(score) * 12)))

    parts = []
    if bullish_reasons:
        parts.append("Positive: " + ", ".join(bullish_reasons[:3]) + ".")
    if bearish_reasons:
        parts.append("Risk: " + ", ".join(bearish_reasons[:3]) + ".")
    if not parts:
        parts.append("The stock is in a neutral zone with mixed signals.")
    reasoning = " ".join(parts)

    return {
        "signal":       signal,
        "confidence":   confidence,
        "sentiment":    sentiment,
        "reasoning":    reasoning,
        "key_drivers":  ", ".join(bullish_reasons[:3]) if bullish_reasons else "No major positive drivers",
        "risk_factors": ", ".join(bearish_reasons[:3]) if bearish_reasons else "No major risks detected",
        "change_pct":   change_pct,
    }


def fetch_news_simple(ticker: str) -> list:
    """Fetch news directly from yfinance — strictly strings to avoid React crash."""
    try:
        raw = yf.Ticker(ticker).news or []
        items = []
        for item in raw[:6]:
            title_val = (
                item.get("title")
                or (item.get("content") or {}).get("title")
                or item.get("headline")
                or ""
            )
            title = str(title_val) if not isinstance(title_val, (str, bytes, type(None))) else (title_val or "")
            
            if not title or len(title) < 5:
                continue

            pub_data = item.get("publisher") or (item.get("content") or {}).get("provider") or "News"
            if isinstance(pub_data, dict):
                source = str(pub_data.get("name", "News"))
            else:
                source = str(pub_data)

            ts = item.get("providerPublishTime")
            pub_time = "Latest"
            if ts:
                try:
                    pub_time = datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%d %b, %I:%M %p")
                except:
                    pub_time = "Latest"

            t = title.lower()
            sentiment = "neutral"
            if any(w in t for w in ["surge", "gain", "beats", "growth", "rally", "rise", "profit", "bullish", "up "]):
                sentiment = "bullish"
            elif any(w in t for w in ["fall", "drops", "weak", "cuts", "miss", "decline", "loss", "bearish", "down "]):
                sentiment = "bearish"

            items.append({
                "title": title,
                "source": source,
                "published_at": pub_time,
                "sentiment": sentiment,
            })
        return items
    except Exception as e:
        logger.warning(f"News fetch error for {ticker}: {e}")
        return []


def normalize_ticker_indian(raw: str) -> str:
    """Reject US tickers; auto-add .NS for Indian stocks."""
    ticker = raw.upper().strip().replace(" ", "")
    if ticker in US_TICKERS:
        raise HTTPException(
            status_code=400,
            detail="Kindly search Indian stocks only. (e.g. RELIANCE, TCS, INFY, HDFCBANK)"
        )
    if ticker.endswith(".NS") or ticker.endswith(".BO"):
        return ticker
    return ticker + ".NS"


def normalize_analysis_result(result):
    if isinstance(result, dict):
        return result
    if isinstance(result, str):
        text = result.strip()
        for prefix in ("```json", "```"):
            if text.startswith(prefix):
                text = text[len(prefix):]
                break
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
        try:
            parsed = json.loads(text)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            pass
        return {"signal": "HOLD", "confidence": 0.0, "reasoning": text}
    return {"signal": "HOLD", "confidence": 0.0, "reasoning": str(result)}


def get_news_query(original_symbol: str, resolved_symbol: str) -> str:
    original = (original_symbol or "").upper().strip()
    resolved = (resolved_symbol or "").upper().strip()
    if original and "." not in original:
        return original
    if resolved:
        return resolved.split(".")[0]
    return original or resolved


# ─── Scheduler ────────────────────────────────────────────────────
scheduler                = BackgroundScheduler()
DEFAULT_SYMBOLS          = ["RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS", "SBIN.NS"]
INTERVAL_HOURS           = int(os.getenv("SCHEDULER_INTERVAL_HOURS", "4"))
RUN_SCHEDULER_ON_STARTUP = os.getenv("RUN_SCHEDULER_ON_STARTUP", "false").lower() == "true"


def run_scheduled_analysis():
    from .database import SessionLocal as db_session

    symbols = os.getenv("WATCH_SYMBOLS", ",".join(DEFAULT_SYMBOLS)).split(",")
    logger.info(f"🔄 [Scheduler] Starting for {symbols}")

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

                news_query = get_news_query(symbol, resolved)
                news_data  = asyncio.run(get_news(news_query))
                if isinstance(news_data, dict) and "error" in news_data:
                    news_data = []

                analysis = asyncio.run(
                    analyze_stock_with_ai(symbol=resolved, stock_data=stock_data, news_data=news_data)
                )
                analysis = normalize_analysis_result(analysis)

                crud.save_analysis_signal(
                    db=db,
                    symbol=resolved.upper(),
                    signal=analysis.get("signal", "HOLD"),
                    confidence=float(analysis.get("confidence", 0.0)),
                    analysis_text=analysis.get("reasoning", str(analysis)),
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
                            published_at=article.get("published_at", None),
                        )
            except Exception as e:
                logger.error(f"❌ [Scheduler] Error for {symbol}: {e}")

        db.commit()
        logger.info(f"✅ [Scheduler] Complete for {len(symbols)} symbols")
    except Exception as e:
        logger.error(f"❌ [Scheduler] Fatal: {e}")
        db.rollback()
    finally:
        db.close()


def start_scheduler():
    if scheduler.running:
        return
    scheduler.add_job(
        run_scheduled_analysis,
        IntervalTrigger(hours=INTERVAL_HOURS),
        id="analyze_all_symbols",
        replace_existing=True,
    )
    scheduler.start()
    logger.info(f"🚀 [Scheduler] Started — every {INTERVAL_HOURS}h")
    if RUN_SCHEDULER_ON_STARTUP:
        threading.Thread(target=run_scheduled_analysis, daemon=True).start()


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("🛑 [Scheduler] Stopped")


# ─── Lifespan ─────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Starting up...")
    start_scheduler()
    yield
    logger.info("🛑 Shutting down...")
    stop_scheduler()


# ─── App + CORS ───────────────────────────────────────────────────
app = FastAPI(title="AI Trading Analyzer API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── DB Dependency ────────────────────────────────────────────────
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ═════════════════════════════════════════════════════════════════
# ROOT
# ═════════════════════════════════════════════════════════════════
@app.get("/")
def root():
    return {
        "status":  "ok",
        "market":  "India",
        "message": "Trading Companion backend is running",
    }


# ═════════════════════════════════════════════════════════════════
# /search — autocomplete for stock names & tickers
# ═════════════════════════════════════════════════════════════════
@app.get("/search")
def search_stocks(q: str = Query("", min_length=1)):
    """Return up to 5 matching stocks by ticker or company name (prefix match)."""
    query = q.strip().upper()
    if not query:
        return {"results": []}

    matches = []
    for ticker, name in INDIAN_STOCKS.items():
        short_ticker = ticker.replace(".NS", "").replace(".BO", "")
        # Match by ticker code or company name
        if short_ticker.startswith(query) or name.upper().startswith(query):
            matches.append({
                "ticker": short_ticker,
                "name": name,
            })
        if len(matches) >= 5:
            break

    return {"results": matches}


# ═════════════════════════════════════════════════════════════════
# /market-movers  — live top gainers, losers, sentiment
# ═════════════════════════════════════════════════════════════════
@app.get("/market-movers")
def get_market_movers():
    symbols = list(INDIAN_STOCKS.keys())

    try:
        data = yf.download(
            tickers=symbols,
            period="5d",
            interval="1d",
            auto_adjust=True,
            progress=False,
            threads=True,
            group_by="ticker",
        )

        rows = []
        for symbol in symbols:
            try:
                close = data[symbol]["Close"].dropna()
                if len(close) < 2:
                    continue
                last_price = round(float(close.iloc[-1]), 2)
                prev_price = float(close.iloc[-2])
                if prev_price == 0:
                    continue
                change_pct = round(((last_price - prev_price) / prev_price) * 100, 2)
                rows.append({
                    "ticker":     symbol.replace(".NS", ""),
                    "name":       INDIAN_STOCKS.get(symbol, symbol.replace(".NS", "")),
                    "price":      last_price,
                    "change_pct": change_pct,
                })
            except Exception:
                continue

        if not rows:
            raise HTTPException(status_code=503, detail="Unable to fetch live market data right now.")

        gainers = sorted(rows, key=lambda x: x["change_pct"], reverse=True)[:5]
        losers  = sorted(rows, key=lambda x: x["change_pct"])[:5]

        total         = len(rows)
        bullish_count = sum(1 for r in rows if r["change_pct"] > 0.5)
        bearish_count = sum(1 for r in rows if r["change_pct"] < -0.5)
        bullish       = round((bullish_count / total) * 100) if total > 0 else 34
        bearish       = round((bearish_count / total) * 100) if total > 0 else 33
        neutral       = max(0, 100 - bullish - bearish)

        if bullish >= bearish and bullish >= neutral:
            overall = "bullish"
        elif bearish >= bullish and bearish >= neutral:
            overall = "bearish"
        else:
            overall = "neutral"

        return {
            "top_gainers": gainers,
            "top_losers":  losers,
            "sentiment": {
                "bullish": bullish,
                "neutral": neutral,
                "bearish": bearish,
                "overall": overall,
            },
            "last_updated": datetime.now().strftime("%d %b %Y, %I:%M:%S %p"),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Market movers error: {e}")
        raise HTTPException(status_code=500, detail=f"Market movers failed: {str(e)}")


# ═════════════════════════════════════════════════════════════════
# /analyze/{ticker}  — flat response for frontend
# ═════════════════════════════════════════════════════════════════
@app.get("/analyze/{ticker}")
async def analyze_stock_new(ticker: str):
    symbol = normalize_ticker_indian(ticker)
    logger.info(f"📈 Analyzing: {symbol}")

    try:
        tk   = yf.Ticker(symbol)
        hist = tk.history(period="6mo", interval="1d", auto_adjust=True)

        if hist.empty or len(hist) < 20:
            raise HTTPException(
                status_code=404,
                detail=f"No market data found for {symbol}. Please check the ticker.",
            )

        close     = hist["Close"].dropna()
        price     = round(float(close.iloc[-1]), 2)
        prev      = round(float(close.iloc[-2]), 2) if len(close) > 1 else price
        sma20     = float(close.tail(20).mean())
        sma50     = float(close.tail(50).mean()) if len(close) >= 50 else float(close.mean())
        rsi_s     = calculate_rsi(close).dropna()
        rsi_val   = float(rsi_s.iloc[-1]) if not rsi_s.empty else 50.0

        sig_data  = build_technical_signal(price, prev, sma20, sma50, rsi_val)
        company   = INDIAN_STOCKS.get(symbol, symbol.replace(".NS", "").replace(".BO", ""))
        news      = fetch_news_simple(symbol)

        # Build structured justification + timeframe
        justification, timeframe = build_justification(
            price, prev, sma20, sma50, rsi_val, sig_data["signal"]
        )

        return {
            "ticker":         symbol.replace(".NS", "").replace(".BO", ""),
            "company_name":   company,
            "current_price":  price,
            "previous_close": prev,
            "signal":         sig_data["signal"],
            "confidence":     sig_data["confidence"],
            "sentiment":      sig_data["sentiment"],
            "reasoning":      sig_data["reasoning"],
            "key_drivers":    sig_data["key_drivers"],
            "risk_factors":   sig_data["risk_factors"],
            "change_pct":     sig_data["change_pct"],
            "sma20":          round(sma20, 2),
            "sma50":          round(sma50, 2),
            "rsi":            round(rsi_val, 2),
            "news":           news,
            "justification":  justification,
            "timeframe":      timeframe,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Analyze failed for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


# ═════════════════════════════════════════════════════════════════
# EXISTING ENDPOINTS — unchanged
# ═════════════════════════════════════════════════════════════════

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
        raise HTTPException(status_code=404, detail=f"No signal history for {resolved.upper()}")
    return history


@app.get("/stock/{symbol}")
def stock_price(symbol: str):
    resolved, source = resolve_ticker(symbol)
    stock_data = get_stock_price(resolved)
    if "error" in stock_data:
        raise HTTPException(status_code=404, detail=stock_data["error"])
    currency_info = get_currency_info(resolved)
    stock_data["currency"]          = currency_info["currency"]
    stock_data["currency_symbol"]   = currency_info["currency_symbol"]
    stock_data["resolved_symbol"]   = resolved
    stock_data["source"]            = source
    return stock_data


@app.get("/stock/history/{symbol}")
def stock_history(symbol: str, range: str = "1mo"):
    resolved, _ = resolve_ticker(symbol)
    try:
        tk = yf.Ticker(resolved)
        hist = tk.history(period=range, interval="1d", auto_adjust=True)
        if hist.empty:
            raise HTTPException(status_code=404, detail=f"No data for {resolved} in range '{range}'")

        historical_data = []
        for idx, row in hist.iterrows():
            historical_data.append({
                "date":  idx.strftime("%Y-%m-%d"),
                "open":  round(float(row["Open"]), 2),
                "high":  round(float(row["High"]), 2),
                "low":   round(float(row["Low"]), 2),
                "close": round(float(row["Close"]), 2),
                "volume": int(row["Volume"]),
            })

        stock_data = get_stock_price(resolved)
        currency_info = get_currency_info(resolved)
        return {
            "symbol":          resolved,
            "company_name":    INDIAN_STOCKS.get(resolved, resolved.split(".")[0]),
            "currency":        currency_info["currency"],
            "currency_symbol": currency_info["currency_symbol"],
            "historical_data": historical_data,
            "total_records":   len(historical_data),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Stock history error for {resolved}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/news/{symbol}")
async def news_headlines(symbol: str):
    resolved, _  = resolve_ticker(symbol)
    news_query   = get_news_query(symbol, resolved)
    return await get_news(news_query)


@app.get("/news/history/{symbol}")
def news_history(symbol: str, limit: int = 10, db: Session = Depends(get_db)):
    resolved, _ = resolve_ticker(symbol)
    history = crud.get_news_history(db, symbol=resolved.upper(), limit=limit)
    if not history:
        raise HTTPException(status_code=404, detail=f"No news history for {resolved.upper()}")
    return history


@app.get("/scheduler/status")
def scheduler_status():
    job      = scheduler.get_job("analyze_all_symbols")
    next_run = str(job.next_run_time) if job else None
    return {
        "running":        scheduler.running,
        "interval_hours": INTERVAL_HOURS,
        "run_on_startup": RUN_SCHEDULER_ON_STARTUP,
        "next_run_time":  next_run,
    }


@app.get("/analyze/v1/{symbol}")
async def analyze_stock_v1(symbol: str, db: Session = Depends(get_db)):
    """Original pipeline — kept for backward compatibility."""
    resolved, source = resolve_ticker(symbol)
    logger.info(f"📈 [v1] Analyzing '{symbol}' → '{resolved}'")

    stock_data = get_stock_price(resolved)
    if "error" in stock_data:
        raise HTTPException(status_code=400, detail=stock_data["error"])

    currency_info = get_currency_info(resolved)
    stock_data["currency"]        = currency_info["currency"]
    stock_data["currency_symbol"] = currency_info["currency_symbol"]
    stock_data["resolved_symbol"] = resolved

    news_warning = None
    news_query   = get_news_query(symbol, resolved)
    news_data    = await get_news(news_query)
    if isinstance(news_data, dict) and "error" in news_data:
        news_warning = news_data["error"]
        news_data    = []

    try:
        analysis = await analyze_stock_with_ai(
            symbol=resolved, stock_data=stock_data, news_data=news_data
        )
        analysis = normalize_analysis_result(analysis)
    except Exception as e:
        logger.exception(f"AI analysis failed for {resolved}: {e}")
        analysis = {
            "signal":     "HOLD",
            "confidence": 0.0,
            "reasoning":  f"AI analysis unavailable: {str(e)}",
        }

    try:
        crud.save_analysis_signal(
            db=db,
            symbol=resolved.upper(),
            signal=analysis.get("signal", "HOLD"),
            confidence=float(analysis.get("confidence", 0.0)),
            analysis_text=analysis.get("reasoning", str(analysis)),
        )
    except Exception as e:
        logger.warning(f"⚠️ Could not save signal: {e}")

    if news_data:
        try:
            articles = news_data if isinstance(news_data, list) else news_data.get("articles", [])
            for article in articles[:5]:
                crud.save_news_article(
                    db=db,
                    symbol=resolved.upper(),
                    headline=article.get("headline", article.get("title", "No headline")),
                    summary=article.get("summary", ""),
                    url=article.get("url", ""),
                    published_at=article.get("published_at", None),
                )
        except Exception as e:
            logger.warning(f"⚠️ Could not save news: {e}")

    return {
        "symbol":         resolved.upper(),
        "original_query": symbol.upper(),
        "stock_data":     stock_data,
        "news":           news_data,
        "news_warning":   news_warning,
        "ai_analysis":    analysis,
    }