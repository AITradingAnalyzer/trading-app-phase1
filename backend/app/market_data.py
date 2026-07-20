# app/market_data.py

import logging
import yfinance as yf

logger = logging.getLogger(__name__)


def get_currency_info(symbol: str):
    """Return currency details based on ticker suffix."""
    suffix_map = {
        ".NS": {"currency": "INR", "currency_symbol": "₹"},
        ".BO": {"currency": "INR", "currency_symbol": "₹"},
        ".L": {"currency": "GBP", "currency_symbol": "£"},
        ".TO": {"currency": "CAD", "currency_symbol": "CA$"},
        ".AX": {"currency": "AUD", "currency_symbol": "A$"},
        ".DE": {"currency": "EUR", "currency_symbol": "€"},
        ".PA": {"currency": "EUR", "currency_symbol": "€"},
        ".MI": {"currency": "EUR", "currency_symbol": "€"},
        ".HK": {"currency": "HKD", "currency_symbol": "HK$"},
        ".SS": {"currency": "CNY", "currency_symbol": "¥"},
        ".SZ": {"currency": "CNY", "currency_symbol": "¥"},
        ".TW": {"currency": "TWD", "currency_symbol": "NT$"},
        ".SI": {"currency": "SGD", "currency_symbol": "S$"},
        ".KS": {"currency": "KRW", "currency_symbol": "₩"},
        ".T": {"currency": "JPY", "currency_symbol": "¥"},
    }

    symbol = symbol.upper()
    for suffix, info in suffix_map.items():
        if symbol.endswith(suffix):
            return info

    return {"currency": "USD", "currency_symbol": "$"}


def resolve_ticker(symbol: str) -> tuple:
    """
    Resolve a stock symbol to a valid ticker.
    Returns: (resolved_symbol, source_label)
    """
    symbol = symbol.upper().strip()

    if "." in symbol:
        return symbol, "direct"

    # Try US first
    try:
        test = yf.Ticker(symbol)
        hist = test.history(period="5d")
        if not hist.empty:
            logger.info(f"✅ '{symbol}' resolved as US ticker")
            return symbol, "us"
    except Exception:
        pass

    # Fallback to NSE
    fallback = f"{symbol}.NS"
    try:
        test = yf.Ticker(fallback)
        hist = test.history(period="5d")
        if not hist.empty:
            logger.info(f"✅ '{symbol}' → resolved as Indian ticker '{fallback}'")
            return fallback, "india_fallback"
    except Exception:
        pass

    logger.warning(f"⚠️ '{symbol}' could not be resolved")
    return symbol, "unresolved"


def get_stock_price(symbol: str):
    """
    Fetch stock price data — raw data only.
    main.py handles currency and ticker resolution.
    """
    try:
        stock = yf.Ticker(symbol)
        hist = stock.history(period="5d")

        if hist.empty:
            return {
                "error": f"No price data found for '{symbol}'."
            }

        info = {}
        try:
            info = stock.info or {}
        except Exception:
            info = {}

        current_price = round(float(hist["Close"].iloc[-1]), 2)
        previous_close = info.get("previousClose")
        open_price = info.get("open")
        day_high = info.get("dayHigh")
        day_low = info.get("dayLow")
        volume = info.get("volume")
        market_cap = info.get("marketCap")
        pe_ratio = info.get("trailingPE")
        week_52_high = info.get("fiftyTwoWeekHigh")
        week_52_low = info.get("fiftyTwoWeekLow")
        company_name = info.get("longName") or info.get("shortName") or symbol

        return {
            "symbol": symbol.upper(),
            "company_name": company_name,
            "current_price": current_price,
            "previous_close": previous_close,
            "open": open_price,
            "day_high": day_high,
            "day_low": day_low,
            "volume": volume,
            "market_cap": market_cap,
            "pe_ratio": pe_ratio,
            "fifty_two_week_high": week_52_high,
            "fifty_two_week_low": week_52_low,
        }

    except Exception as e:
        logger.error(f"❌ Error fetching stock price for {symbol}: {e}")
        return {"error": str(e)}