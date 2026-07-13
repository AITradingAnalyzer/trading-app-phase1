import yfinance as yf

def get_stock_price(symbol: str):
    ticker = yf.Ticker(symbol)
    info = ticker.fast_info

    return {
        "symbol": symbol.upper(),
        "last_price": info.get("lastPrice"),
        "day_high": info.get("dayHigh"),
        "day_low": info.get("dayLow"),
        "previous_close": info.get("previousClose"),
        "volume": info.get("volume"),
    }