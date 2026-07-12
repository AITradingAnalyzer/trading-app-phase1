# app/ai_analyzer.py

import os
import json
import logging
from anthropic import Anthropic

logger = logging.getLogger(__name__)


async def analyze_stock_with_ai(symbol: str, stock_data: dict, news_data: dict) -> dict:
    """
    Send stock data + news to Claude for intelligent analysis.
    Always returns a dict with: signal, confidence, reasoning
    """

    # ✅ FIX 1: Read key at call-time, not at module load
    # ✅ FIX 2: Support both ANTHROPIC_API_KEY (standard) and CLAUDE_API_KEY (legacy)
    api_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("CLAUDE_API_KEY")

    if not api_key:
        logger.error("❌ No Anthropic API key found in environment variables.")
        return {
            "signal": "HOLD",
            "confidence": 0.0,
            "reasoning": "Error: ANTHROPIC_API_KEY not set in environment variables."
        }

    # ✅ FIX 3: Pass key explicitly to client — no reliance on env auto-detection
    client = Anthropic(api_key=api_key)

    # Format news cleanly
    if isinstance(news_data, list):
        headlines = news_data
    elif isinstance(news_data, dict):
        headlines = news_data.get("headlines", news_data.get("articles", []))
    else:
        headlines = []

    news_text = "\n".join(
        f"- {item.get('title', item.get('headline', 'No title'))} ({item.get('source', 'Unknown')})"
        for item in headlines[:5]
    ) or "No recent news available."

    # ✅ FIX 4: Prompt now demands structured JSON output
    prompt = f"""You are an expert stock market analyst. Analyze the following data for {symbol} and return a JSON response.

STOCK DATA:
- Symbol: {symbol}
- Last Price: {stock_data.get('last_price', 'N/A')}
- Day High: {stock_data.get('day_high', 'N/A')}
- Day Low: {stock_data.get('day_low', 'N/A')}
- Previous Close: {stock_data.get('previous_close', 'N/A')}
- Volume: {stock_data.get('volume', 'N/A')}

RECENT NEWS:
{news_text}

Based on the stock data and news, return ONLY a valid JSON object (no extra text, no markdown, no code fences) in this exact format:

{{
  "signal": "BUY" or "SELL" or "HOLD",
  "confidence": <float between 0.0 and 1.0>,
  "reasoning": "<2-3 sentence explanation of your recommendation>",
  "sentiment": "bullish" or "bearish" or "neutral",
  "key_drivers": "<main factors influencing this recommendation>",
  "risk_factors": "<key risks to watch>"
}}

Rules:
- signal must be exactly one of: BUY, SELL, HOLD
- confidence must be a number from 0.0 (very uncertain) to 1.0 (very confident)
- Be decisive — only use HOLD if truly mixed signals
- Base your analysis on both price action and news sentiment
"""

    try:
        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )

        raw_text = message.content[0].text.strip()
        logger.info(f"🤖 [AI] Raw response for {symbol}: {raw_text[:200]}")

        # ✅ FIX 5: Safely parse the JSON response
        # Strip any accidental markdown code fences
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        elif raw_text.startswith("```"):
            raw_text = raw_text[3:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
        raw_text = raw_text.strip()

        parsed = json.loads(raw_text)

        # Validate signal field
        if parsed.get("signal") not in ("BUY", "SELL", "HOLD"):
            parsed["signal"] = "HOLD"

        # Validate confidence field
        try:
            parsed["confidence"] = float(parsed.get("confidence", 0.5))
            parsed["confidence"] = max(0.0, min(1.0, parsed["confidence"]))
        except (TypeError, ValueError):
            parsed["confidence"] = 0.5

        logger.info(f"✅ [AI] {symbol} → {parsed.get('signal')} ({parsed.get('confidence'):.0%} confidence)")
        return parsed

    except json.JSONDecodeError as e:
        logger.error(f"❌ [AI] JSON parse error for {symbol}: {e} | Raw: {raw_text[:300]}")
        return {
            "signal": "HOLD",
            "confidence": 0.0,
            "reasoning": f"AI returned unstructured response: {raw_text[:300]}"
        }

    except Exception as e:
        logger.error(f"❌ [AI] Error analyzing {symbol}: {e}")
        return {
            "signal": "HOLD",
            "confidence": 0.0,
            "reasoning": f"Error analyzing stock: {str(e)}"
        }