import os
import json
import google.generativeai as genai
from dotenv import load_dotenv
from fastapi import HTTPException

load_dotenv()

# Configure Gemini
api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    raise ValueError("GOOGLE_API_KEY not found in environment variables")

genai.configure(api_key=api_key)


def get_ai_analysis(stock_data: dict, news_data: dict) -> dict:
    """
    Returns AI-generated trading analysis with error handling and model fallback.
    """
    prompt = f"""
You are a professional stock market analyst. Analyze the following stock data and news.

Stock Data:
{json.dumps(stock_data, indent=2)}

Latest News:
{json.dumps(news_data, indent=2)}

Return ONLY valid JSON with these exact keys:
- signal: "BUY", "SELL", or "HOLD"
- confidence: a number between 0 and 1
- reasoning: brief explanation of the analysis
- sentiment: "bullish", "bearish", or "neutral"
- key_drivers: main positive factors
- risk_factors: main negative factors

Do NOT include any text outside the JSON block.
"""

    # ---------- Primary model attempt ----------
    try:
        model = genai.GenerativeModel("gemini-3.1-flash-lite")
        response = model.generate_content(prompt)
        return _parse_response(response.text)

    except Exception as e:
        print(f"[WARN] Primary model failed: {e}")

    # ---------- Fallback model attempt ----------
    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(prompt)
        return _parse_response(response.text)

    except Exception as e:
        print(f"[WARN] Fallback model also failed: {e}")

    # ---------- Both failed ----------
    raise HTTPException(
        status_code=500,
        detail="AI analysis unavailable. Both Gemini models failed to respond."
    )


def _parse_response(text: str) -> dict:
    """
    Extracts JSON from model output and returns a Python dict.
    Handles markdown code fences and extra whitespace.
    """
    raw = text.strip()

    # Remove markdown code fences if present
    if raw.startswith("```"):
        lines = raw.splitlines()
        # Remove opening fence
        if lines[0].startswith("```"):
            lines = lines[1:]
        # Remove closing fence
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        raw = "\n".join(lines).strip()

    # Parse JSON
    try:
        result = json.loads(raw)
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI returned invalid JSON: {e}. Raw: {raw[:200]}"
        )

    return result
