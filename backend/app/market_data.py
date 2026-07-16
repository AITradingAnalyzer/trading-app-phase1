# app/market_data.py

import yfinance as yf
import logging

logger = logging.getLogger(__name__)


def get_stock_price(symbol: str) -> dict:
    """
    Fetch real-time stock data for a given symbol.
    Returns a dict with stock info, or {"error": "..."} on failure.
    """
    try:
        ticker = yf.Ticker(symbol)

        # ─── Fetch fast_info (safer than .info for basic price data) ───
        try:
            fast = ticker.fast_info
            last_price = fast.last_price
            prev_close = fast.previous_close
            market_cap = fast.market_cap
            currency = fast.currency
        except Exception as e:
            logger.warning(f"fast_info failed for {symbol}: {e}")
            last_price = None
            prev_close = None
            market_cap = None
            currency = None

        # ─── Validate: symbol must have at least a price ───
        if last_price is None:
            return {"error": f"No price data found for '{symbol}'. It may be delisted or invalid."}

        # ─── Calculate change ───
        change = None
        change_pct = None
        if last_price is not None and prev_close:
            change = round(last_price - prev_close, 2)
            change_pct = round((change / prev_close) * 100, 2)

        # ─── Try to get extra info (optional, won't crash if fails) ───
        company_name = symbol
        sector = None
        industry = None
        pe_ratio = None
        week_52_high = None
        week_52_low = None

        try:
            info = ticker.info
            company_name = info.get("longName") or info.get("shortName") or symbol
            sector = info.get("sector")
            industry = info.get("industry")
            pe_ratio = info.get("trailingPE")
            week_52_high = info.get("fiftyTwoWeekHigh")
            week_52_low = info.get("fiftyTwoWeekLow")
        except Exception as e:
            logger.warning(f"ticker.info failed for {symbol}: {e}")

        return {
            "symbol": symbol.upper(),
            "company_name": company_name,
            "last_price": round(float(last_price), 2) if last_price else None,
            "previous_close": round(float(prev_close), 2) if prev_close else None,
            "change": change,
            "change_pct": change_pct,
            "market_cap": market_cap,
            "currency": currency,
            "sector": sector,
            "industry": industry,
            "pe_ratio": pe_ratio,
            "week_52_high": week_52_high,
            "week_52_low": week_52_low,
        }

    except Exception as e:
        logger.error(f"get_stock_price failed for {symbol}: {e}")
        return {"error": f"Could not fetch stock data for '{symbol}': {str(e)}"}