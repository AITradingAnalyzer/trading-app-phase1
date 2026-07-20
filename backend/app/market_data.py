import math
import logging
import yfinance as yf

logger = logging.getLogger(__name__)


def _first_present(*values):
    for value in values:
        if value is not None:
            return value
    return None


def _clean_number(value, digits=None):
    if value is None:
        return None
    try:
        num = float(value)
        if math.isnan(num) or math.isinf(num):
            return None
        return round(num, digits) if digits is not None else num
    except (TypeError, ValueError):
        return None


def _clean_int(value):
    if value is None:
        return None
    try:
        num = float(value)
        if math.isnan(num) or math.isinf(num):
            return None
        return int(num)
    except (TypeError, ValueError):
        return None


def get_currency_info(symbol: str):
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
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period="5d", interval="1d")

        if hist.empty or "Close" not in hist:
            return False

        close_series = hist["Close"].dropna()
        return not close_series.empty
    except Exception as e:
        logger.warning(f"Ticker check failed for {symbol}: {e}")
        return False


def resolve_ticker(symbol: str) -> tuple:
    """
    Resolve a stock symbol dynamically.
    Returns: (resolved_symbol, source_label)
    """
    symbol = symbol.upper().strip()

    if not symbol:
        return symbol, "empty"

    if "." in symbol:
        if _has_price_history(symbol):
            logger.info(f"✅ '{symbol}' resolved directly")
            return symbol, "direct"
        logger.warning(f"⚠️ '{symbol}' with suffix could not be resolved")
        return symbol, "unresolved"

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
    try:
        stock = yf.Ticker(symbol)
        hist = stock.history(period="5d", interval="1d")

        if hist.empty or "Close" not in hist:
            return {"error": f"No price data found for '{symbol}'."}

        close_series = hist["Close"].dropna()
        if close_series.empty:
            return {"error": f"No valid closing price found for '{symbol}'."}

        current_price = _clean_number(close_series.iloc[-1], 2)

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

        previous_close = _clean_number(
            _first_present(fast_info.get("previousClose"), info.get("previousClose")),
            2
        )
        open_price = _clean_number(
            _first_present(fast_info.get("open"), info.get("open")),
            2
        )
        day_high = _clean_number(
            _first_present(fast_info.get("dayHigh"), info.get("dayHigh")),
            2
        )
        day_low = _clean_number(
            _first_present(fast_info.get("dayLow"), info.get("dayLow")),
            2
        )
        volume = _clean_int(
            _first_present(fast_info.get("lastVolume"), info.get("volume"))
        )
        market_cap = _clean_int(
            _first_present(fast_info.get("marketCap"), info.get("marketCap"))
        )
        pe_ratio = _clean_number(info.get("trailingPE"), 2)
        week_52_high = _clean_number(
            _first_present(fast_info.get("yearHigh"), info.get("fiftyTwoWeekHigh")),
            2
        )
        week_52_low = _clean_number(
            _first_present(fast_info.get("yearLow"), info.get("fiftyTwoWeekLow")),
            2
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