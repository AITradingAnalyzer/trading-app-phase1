import httpx
import os
from pathlib import Path
from dotenv import load_dotenv

# Explicitly point to the .env file
env_path = Path(__file__).resolve().parent.parent / ".env"
print(f"[DEBUG] Loading .env from: {env_path}")
print(f"[DEBUG] .env file exists: {env_path.exists()}")

load_dotenv(dotenv_path=env_path, override=True)

NEWS_API_KEY = os.getenv("NEWS_API_KEY")
print(f"[DEBUG] NEWS_API_KEY loaded: {NEWS_API_KEY}")

async def get_news(symbol: str):
    if not NEWS_API_KEY:
        return {
            "error": "NEWS_API_KEY not set in .env file",
            "env_path_checked": str(env_path),
            "env_file_exists": env_path.exists()
        }

    url = "https://newsapi.org/v2/everything"
    params = {
        "q": symbol,
        "sortBy": "publishedAt",
        "pageSize": 5,
        "language": "en",
        "apiKey": NEWS_API_KEY,
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params)

    if response.status_code != 200:
        return {
            "error": f"News API error: {response.status_code}",
            "details": response.text
        }

    articles = response.json().get("articles", [])
    headlines = [
        {
            "title": a["title"],
            "source": a["source"]["name"],
            "url": a["url"],
            "publishedAt": a["publishedAt"],
        }
        for a in articles
    ]

    return {"symbol": symbol.upper(), "headlines": headlines}