import os
import json
import yfinance as yf
import google.generativeai as genai
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

genai.configure(api_key=os.environ.get("GOOGLE_API_KEY", ""))


def get_stock_data(ticker: str):
    """Fetch stock info and recent history from Yahoo Finance."""
    try:
        stock = yf.Ticker(ticker)
        info  = stock.info or {}
        hist  = stock.history(period="5d")

        # ── current price — try multiple fields ──────────────────────
        price = (
            info.get("currentPrice")
            or info.get("regularMarketPrice")
            or info.get("previousClose")
        )
        if price is None and not hist.empty:
            price = float(hist["Close"].iloc[-1])

        # ── price change ──────────────────────────────────────────────
        prev  = info.get("previousClose") or info.get("regularMarketPreviousClose")
        change_pct = None
        if price and prev and prev != 0:
            change_pct = round(((price - prev) / prev) * 100, 2)

        # ── 52-week range ─────────────────────────────────────────────
        week52_low  = info.get("fiftyTwoWeekLow")
        week52_high = info.get("fiftyTwoWeekHigh")

        # ── volume ────────────────────────────────────────────────────
        volume = info.get("regularMarketVolume") or info.get("volume")

        return {
            "current_price": round(float(price), 2) if price else None,
            "previous_close": round(float(prev), 2)  if prev  else None,
            "change_pct":     change_pct,
            "week52_low":     week52_low,
            "week52_high":    week52_high,
            "volume":         volume,
            "company_name":   info.get("longName") or info.get("shortName") or ticker,
            "sector":         info.get("sector", ""),
            "industry":       info.get("industry", ""),
            "market_cap":     info.get("marketCap"),
            "pe_ratio":       info.get("trailingPE"),
        }
    except Exception as e:
        print(f"[yfinance error] {ticker}: {e}")
        return {}


def analyze_with_ai(ticker: str, stock_data: dict) -> dict:
    """Call Gemini to produce a structured signal."""
    prompt = f"""
You are a professional Indian stock market analyst specializing in NSE/BSE equities.

Stock: {ticker}
Company: {stock_data.get('company_name', ticker)}
Current Price: ₹{stock_data.get('current_price', 'N/A')}
Previous Close: ₹{stock_data.get('previous_close', 'N/A')}
Change: {stock_data.get('change_pct', 'N/A')}%
52-Week Low: ₹{stock_data.get('week52_low', 'N/A')}
52-Week High: ₹{stock_data.get('week52_high', 'N/A')}
Sector: {stock_data.get('sector', 'N/A')}
Industry: {stock_data.get('industry', 'N/A')}
P/E Ratio: {stock_data.get('pe_ratio', 'N/A')}
Market Cap: {stock_data.get('market_cap', 'N/A')}

Based on this data, provide a trading signal for Indian retail investors.

Respond ONLY with valid JSON in this exact format:
{{
  "signal": "BUY" or "SELL" or "HOLD",
  "confidence": 0.0 to 1.0,
  "sentiment": "bullish" or "bearish" or "neutral",
  "reasoning": "2-3 sentence explanation",
  "key_drivers": "Main positive factors driving this signal",
  "risk_factors": "Key risks to watch out for"
}}
"""
    try:
        model    = genai.GenerativeModel("gemini-2.0-flash")
        response = model.generate_content(prompt)
        text     = response.text.strip()

        # strip markdown code fences if present
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        text = text.strip()

        result = json.loads(text)

        # normalize signal
        result["signal"] = str(result.get("signal", "HOLD")).upper()
        if result["signal"] not in ("BUY", "SELL", "HOLD"):
            result["signal"] = "HOLD"

        # normalize confidence
        conf = float(result.get("confidence", 0.5))
        result["confidence"] = conf if conf <= 1.0 else conf / 100.0

        return result

    except Exception as e:
        print(f"[AI error] {ticker}: {e}")
        return {
            "signal":      "HOLD",
            "confidence":  0.5,
            "sentiment":   "neutral",
            "reasoning":   "AI analysis temporarily unavailable. Defaulting to HOLD.",
            "key_drivers": "Insufficient data at this time.",
            "risk_factors": "Please retry in a few minutes.",
        }


@app.get("/")
def root():
    return {"status": "Trading Companion API is running", "market": "NSE/BSE India"}


@app.get("/analyze/{ticker}")
def analyze(ticker: str):
    ticker = ticker.upper().strip()

    # auto-add .NS if no suffix
    if not ticker.endswith(".NS") and not ticker.endswith(".BO"):
        ticker = f"{ticker}.NS"

    stock_data = get_stock_data(ticker)

    if not stock_data:
        raise HTTPException(
            status_code=404,
            detail=f"Could not fetch data for {ticker}. Check the ticker symbol and try again."
        )

    ai_result = analyze_with_ai(ticker, stock_data)

    return {
        "ticker":        ticker.replace(".NS", "").replace(".BO", ""),
        "current_price": stock_data.get("current_price"),
        "previous_close":stock_data.get("previous_close"),
        "change_pct":    stock_data.get("change_pct"),
        "company_name":  stock_data.get("company_name"),
        "signal":        ai_result.get("signal", "HOLD"),
        "confidence":    ai_result.get("confidence", 0.5),
        "sentiment":     ai_result.get("sentiment", "neutral"),
        "reasoning":     ai_result.get("reasoning", ""),
        "key_drivers":   ai_result.get("key_drivers", ""),
        "risk_factors":  ai_result.get("risk_factors", ""),
        "news":          [],
    }