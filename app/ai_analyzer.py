import os
import json
import google.generativeai as genai
from dotenv import load_dotenv
from fastapi import HTTPException

load_dotenv()

PRIMARY_MODEL = "gemini-3.1-flash-lite"
FALLBACK_MODEL = "gemini-2.5-flash"


def _configure_genai():
    """
    Configure Gemini only when needed.
    This avoids crashing the whole app at import time.
    """
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="GOOGLE_API_KEY not configured on the server."
        )
    genai.configure(api_key=api_key)


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

    # Handle markdown code fences if model still returns them
    if raw.startswith("```"):
        lines = raw.splitlines()

        if lines and lines[0].startswith("```"):
            lines = lines[1:]

        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]

        raw = "\n".join(lines).strip()

        if raw.lower().startswith("json"):
            raw = raw[4:].strip()

    # First try direct JSON parsing
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    # Second try: extract JSON object from extra surrounding text
    start = raw.find("{")
    end = raw.rfind("}")

    if start != -1 and end != -1 and end > start:
        possible_json = raw[start:end + 1]
        try:
            return json.loads(possible_json)
        except json.JSONDecodeError:
            pass

    raise HTTPException(
        status_code=500,
        detail=f"AI returned invalid JSON: {raw[:300]}"
    )


def _call_model(model_name: str, prompt: str) -> dict:
    model = genai.GenerativeModel(model_name)
    response = model.generate_content(prompt)

    text = getattr(response, "text", None)
    if not text:
        raise ValueError(f"{model_name} returned no text response")

    return _parse_response(text)


def analyze_stock_with_ai(*args, **kwargs) -> dict:
    """
    Backward-compatible public function.

    Supports either:
    - analyze_stock_with_ai(stock_data, news_data)
    - analyze_stock_with_ai(symbol, stock_data, news_data)
    - analyze_stock_with_ai(stock_data=..., news_data=...)
    """
    stock_data = None
    news_data = None

    if len(args) == 2:
        stock_data, news_data = args
    elif len(args) == 3:
        _, stock_data, news_data = args
    else:
        stock_data = kwargs.get("stock_data")
        news_data = kwargs.get("news_data")

    if stock_data is None or news_data is None:
        raise HTTPException(
            status_code=500,
            detail="analyze_stock_with_ai requires stock_data and news_data."
        )

    _configure_genai()
    prompt = _build_prompt(stock_data, news_data)

    try:
        return _call_model(PRIMARY_MODEL, prompt)
    except Exception as primary_error:
        print(f"[WARN] Primary model failed ({PRIMARY_MODEL}): {primary_error}")

    try:
        return _call_model(FALLBACK_MODEL, prompt)
    except Exception as fallback_error:
        print(f"[WARN] Fallback model failed ({FALLBACK_MODEL}): {fallback_error}")
        raise HTTPException(
            status_code=500,
            detail="AI analysis unavailable. Both Gemini models failed."
        )


def get_ai_analysis(stock_data: dict, news_data: dict) -> dict:
    """
    Optional alias so both old and new code work.
    """
    return analyze_stock_with_ai(stock_data, news_data)
