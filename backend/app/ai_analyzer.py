# app/ai_analyzer.py

import os
import json
import asyncio

from google import genai                       # ✅ New SDK only — old one removed
from google.genai import types
from dotenv import load_dotenv
from fastapi import HTTPException

load_dotenv()

# ✅ Fixed model names — gemini-3.1-flash-lite does NOT exist
PRIMARY_MODEL  = "gemini-2.0-flash-lite"
FALLBACK_MODEL = "gemini-2.5-flash"


def _get_client() -> genai.Client:
    """
    Create and return a new Google GenAI client.
    Replaces the old genai.configure() pattern.
    """
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="GOOGLE_API_KEY not configured on the server."
        )
    return genai.Client(api_key=api_key)       # ✅ New SDK client pattern


def _build_prompt(stock_data: dict, news_data: dict) -> str:
    return f"""
You are a professional stock market analyst.

Analyze the following stock data and recent news, then return ONLY valid JSON.

Stock Data:
{json.dumps(stock_data, indent=2)}

Latest News:
{json.dumps(news_data, indent=2)}

Return ONLY valid JSON with these exact keys:
- signal: "BUY", "SELL", or "HOLD"
- confidence: number between 0 and 1
- reasoning: short explanation
- sentiment: "bullish", "bearish", or "neutral"
- key_drivers: short summary of positive factors
- risk_factors: short summary of negative factors

Do not include markdown.
Do not include code fences.
Do not include any extra text outside the JSON.
"""


def _parse_response(text: str) -> dict:
    raw = (text or "").strip()

    if not raw:
        raise HTTPException(
            status_code=500,
            detail="AI returned an empty response."
        )

    # Strip markdown code fences if present
    if raw.startswith("```"):
        lines = raw.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        raw = "\n".join(lines).strip()
        if raw.lower().startswith("json"):
            raw = raw[4:].strip()

    # Try direct JSON parse
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    # Try extracting JSON object from mixed text
    start = raw.find("{")
    end = raw.rfind("}")
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(raw[start:end + 1])
        except json.JSONDecodeError:
            pass

    raise HTTPException(
        status_code=500,
        detail=f"AI returned invalid JSON: {raw[:300]}"
    )


def _call_model(client: genai.Client, model_name: str, prompt: str) -> dict:
    """
    Call a Gemini model using the new google.genai SDK.
    Replaces the old genai.GenerativeModel().generate_content() pattern.
    """
    response = client.models.generate_content(  # ✅ New SDK call pattern
        model=model_name,
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.3,                    # Lower = more consistent/factual
            max_output_tokens=1024,
        )
    )

    text = getattr(response, "text", None)
    if not text:
        raise ValueError(f"{model_name} returned no text response")

    return _parse_response(text)


def _analyze_sync(stock_data: dict, news_data: dict) -> dict:
    client = _get_client()
    prompt = _build_prompt(stock_data, news_data)

    # Try primary model first
    try:
        return _call_model(client, PRIMARY_MODEL, prompt)
    except HTTPException:
        raise
    except Exception as primary_error:
        print(f"[WARN] Primary model failed ({PRIMARY_MODEL}): {primary_error}")

    # Fallback to second model
    try:
        return _call_model(client, FALLBACK_MODEL, prompt)
    except HTTPException:
        raise
    except Exception as fallback_error:
        print(f"[WARN] Fallback model failed ({FALLBACK_MODEL}): {fallback_error}")
        raise HTTPException(
            status_code=500,
            detail="AI analysis unavailable. Both Gemini models failed."
        )


async def analyze_stock_with_ai(*args, **kwargs) -> dict:
    """
    Async wrapper for FastAPI routes and scheduler.

    Supports:
    - analyze_stock_with_ai(stock_data, news_data)
    - analyze_stock_with_ai(symbol, stock_data, news_data)
    - analyze_stock_with_ai(stock_data=..., news_data=...)
    """
    stock_data = None
    news_data  = None

    if len(args) == 2:
        stock_data, news_data = args
    elif len(args) == 3:
        _, stock_data, news_data = args
    else:
        stock_data = kwargs.get("stock_data")
        news_data  = kwargs.get("news_data")

    if stock_data is None or news_data is None:
        raise HTTPException(
            status_code=500,
            detail="analyze_stock_with_ai requires stock_data and news_data."
        )

    return await asyncio.to_thread(_analyze_sync, stock_data, news_data)


def get_ai_analysis(stock_data: dict, news_data: dict) -> dict:
    """Sync helper for non-async usage."""
    return _analyze_sync(stock_data, news_data)