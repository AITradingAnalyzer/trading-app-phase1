import os
from anthropic import Anthropic

client = Anthropic()

async def analyze_stock_with_ai(symbol: str, stock_data: dict, news_data: dict) -> str:
    """
    Send stock data + news to Claude for intelligent analysis
    """
    
    claude_api_key = os.getenv("CLAUDE_API_KEY")
    if not claude_api_key:
        return "Error: CLAUDE_API_KEY not set"
    
    # Prepare the prompt
    prompt = f"""
    Analyze the following stock data and recent news for {symbol}:
    
    STOCK DATA:
    {stock_data}
    
    RECENT NEWS:
    {news_data}
    
    Provide:
    1. Market sentiment (bullish/bearish/neutral)
    2. Key drivers from the news
    3. Trading recommendation (buy/sell/hold)
    4. Risk factors to watch
    5. 2-3 sentence summary
    
    Keep it concise and actionable for traders.
    """
    
    try:
        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        return message.content[0].text
    
    except Exception as e:
        return f"Error analyzing stock: {str(e)}"