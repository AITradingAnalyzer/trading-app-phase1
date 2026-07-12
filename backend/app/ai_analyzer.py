# app/ai_analyzer.py

import os
import json
import logging
import google.generativeai as genai

logger = logging.getLogger(__name__)

async def analyze_stock_with_ai(symbol: str, stock_data: dict, news_data: dict) -> dict:
    """
    Send stock data + news to Google Gemini for intelligent analysis.
    Always returns a dict with: signal, confidence, reasoning
    """

    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        logger.error("❌ No GOOGLE_API_KEY found in environment variables.")
        return {
            "signal": "HOLD",
            "confidence": 0.0,
            "reasoning": "Error: GOOGLE_API_KEY not set in environment variables."
        }

    genai.configure(api_key=api_key)

    # ✅ Updated model name
    model = genai.GenerativeModel("gemini-3.1-flash-lite")

    # Format news
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

    prompt = f"""You are an expert stock market analyst. Analyze the following data for {symbol} and return ONLY valid JSON.

STOCK DATA:
- Symbol: {symbol}
- Last Price: {stock_data.get('last_price', 'N/A')}
- Day High: {stock_data.get('day_high', 'N/A')}
- Day Low: {stock_data.get('day_low', 'N/A')}
- Previous Close: {stock_data.get('previous_close', 'N/A')}
- Volume: {stock_data.get('volume', 'N/A')}

RECENT NEWS:
{news_text}

Return ONLY a valid JSON object (no markdown, no code fences, no extra text) in this exact format:
{{
  "signal": "BUY" or "SELL" or "HOLD",
  "confidence": <float between 0.0 and 1.0>,
  "reasoning": "<2-3 sentence explanation>",
  "sentiment": "bullish" or "bearish" or "neutral",
  "key_drivers": "<main factors>",
  "risk_factors": "<key risks>"
}}

Rules:
- signal: exactly one of BUY, SELL, HOLD
- confidence: 0.0 to 1.0
- Be decisive — only HOLD if truly mixed signals
- Base analysis on both price action and news sentiment
"""

    try:
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.3,
                max_output_tokens=1024,
            )
        )

        raw_text = response.text.strip()
        logger.info(f"🤖 [AI] Raw response for {symbol}: {raw_text[:200]}")

        # Strip any accidental markdown fences
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        elif raw_text.startswith("```"):
            raw_text = raw_text[3:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
        raw_text = raw_text.strip()

        parsed = json.loads(raw_text)

        # Validate signal
        if parsed.get("signal") not in ("BUY", "SELL", "HOLD"):
            parsed["signal"] = "HOLD"

        # Validate confidence
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