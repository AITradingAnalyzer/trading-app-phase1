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

    symbol = symbol.upper().strip()
    for suffix, info in suffix_map.items():
        if symbol.endswith(suffix):
            return info

    return {"currency": "USD", "currency_symbol": "$"}


def _has_price_history(symbol: str) -> bool:
    """Check whether yfinance can return price history for a ticker."""
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period="5d", interval="1d")
        return not hist.empty
    except Exception as e:
        logger.warning(f"Ticker check failed for {symbol}: {e}")
        return False


def resolve_ticker(symbol: str) -> tuple:
    """
    Resolve a stock symbol to a valid ticker dynamically.
    Returns: (resolved_symbol, source_label)
    """
    symbol = symbol.upper().strip()

    if not symbol:
        return symbol, "empty"

    # If user already entered exchange suffix, validate it directly
    if "." in symbol:
        if _has_price_history(symbol):
            logger.info(f"✅ '{symbol}' resolved directly")
            return symbol, "direct"
        logger.warning(f"⚠️ '{symbol}' with suffix could not be resolved")
        return symbol, "unresolved"

    # Dynamically try common possibilities
    candidates = [
        (symbol, "us"),
        (f"{symbol}.NS", "india_nse"),
        (f"{symbol}.BO", "india_bse"),
    ]

    for candidate, source in candidates:
        if _has_price_history(candidate):
            logger.info(f"✅ '{symbol}' resolved to '{candidate}' via {source}")
            return candidate, source

    logger.warning(f"⚠️ '{symbol}' could not be resolved")
    return symbol, "unresolved"


def get_stock_price(symbol: str):
    """
    Fetch stock price data — raw data only.
    More robust for international tickers.
    """
    try:
        stock = yf.Ticker(symbol)
        hist = stock.history(period="5d", interval="1d")

        if hist.empty:
            return {"error": f"No price data found for '{symbol}'."}

        fast_info = {}
        info = {}

        try:
            if stock.fast_info:
                fast_info = dict(stock.fast_info)
        except Exception as e:
            logger.warning(f"fast_info failed for {symbol}: {e}")

        try:
            info = stock.info or {}
        except Exception as e:
            logger.warning(f"info failed for {symbol}: {e}")
            info = {}

        current_price = round(float(hist["Close"].iloc[-1]), 2)

        previous_close = (
            fast_info.get("previousClose")
            or info.get("previousClose")
        )
        open_price = (
            fast_info.get("open")
            or info.get("open")
        )
        day_high = (
            fast_info.get("dayHigh")
            or info.get("dayHigh")
        )
        day_low = (
            fast_info.get("dayLow")
            or info.get("dayLow")
        )
        volume = (
            fast_info.get("lastVolume")
            or info.get("volume")
        )
        market_cap = (
            fast_info.get("marketCap")
            or info.get("marketCap")
        )
        pe_ratio = info.get("trailingPE")
        week_52_high = (
            fast_info.get("yearHigh")
            or info.get("fiftyTwoWeekHigh")
        )
        week_52_low = (
            fast_info.get("yearLow")
            or info.get("fiftyTwoWeekLow")
        )

        company_name = (
            info.get("longName")
            or info.get("shortName")
            or symbol
        )

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