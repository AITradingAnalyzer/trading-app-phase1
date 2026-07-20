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


def resolve_ticker(symbol: str):
    """
    Try original symbol first.
    If not found and no suffix is present, try .NS fallback.
    Returns the resolved ticker symbol.
    """
    symbol = symbol.upper().strip()

    # If already has a suffix, use as-is
    if "." in symbol:
        return symbol

    # Try original symbol first (for US stocks)
    try:
        stock = yf.Ticker(symbol)
        hist = stock.history(period="5d")
        if not hist.empty:
            logger.info(f"✅ Resolved '{symbol}' as direct ticker (US market)")
            return symbol
    except Exception:
        pass

    # Fallback to NSE (for Indian stocks)
    ns_symbol = f"{symbol}.NS"
    try:
        stock = yf.Ticker(ns_symbol)
        hist = stock.history(period="5d")
        if not hist.empty:
            logger.info(f"✅ Resolved '{symbol}' as NSE ticker '{ns_symbol}'")
            return ns_symbol
    except Exception:
        pass

    # Return original if both fail (let the caller handle error)
    logger.warning(f"⚠️ Could not resolve '{symbol}' — returning as-is")
    return symbol


def get_stock_price(symbol: str):
    """
    Fetch stock price data with:
    - Auto .NS fallback for Indian stocks
    - Currency detection (₹ for INR, $ for USD, etc.)
    - Full stock info (PE ratio, market cap, 52-week high/low, etc.)
    """
    try:
        # Resolve the ticker
        resolved_symbol = resolve_ticker(symbol)

        # Fetch data
        stock = yf.Ticker(resolved_symbol)
        hist = stock.history(period="5d")

        if hist.empty:
            return {
                "error": f"No price data found for '{symbol}'. It may be delisted or invalid."
            }

        # Get additional info
        info = {}
        try:
            info = stock.info or {}
        except Exception:
            info = {}

        # Extract values
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
        company_name = info.get("longName") or info.get("shortName") or resolved_symbol

        # Determine currency
        currency = info.get("currency")  # Try getting from Yahoo Finance first
        currency_symbol_map = {
            "USD": "$",
            "INR": "₹",
            "GBP": "£",
            "EUR": "€",
            "JPY": "¥",
            "AUD": "A$",
            "CAD": "CA$",
            "HKD": "HK$",
            "SGD": "S$",
            "CNY": "¥",
            "KRW": "₩",
            "TWD": "NT$",
            "SAR": "﷼",
        }

        if currency:
            currency_symbol = currency_symbol_map.get(currency, currency)
        else:
            # Fallback: detect from suffix
            currency_info = get_currency_info(resolved_symbol)
            currency = currency_info["currency"]
            currency_symbol = currency_info["currency_symbol"]

        return {
            "symbol": resolved_symbol.upper(),
            "original_query": symbol.upper(),
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
            "currency": currency,
            "currency_symbol": currency_symbol,
            "resolved_symbol": resolved_symbol.upper(),
        }

    except Exception as e:
        logger.error(f"❌ Error fetching stock price for {symbol}: {e}")
        return {"error": str(e)}