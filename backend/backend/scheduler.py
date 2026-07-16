# backend/scheduler.py

import os
import logging
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
import requests

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ─── Config ─────────────────────────────────────────────────────────
DEFAULT_SYMBOLS = ["AAPL", "TSLA", "GOOGL", "MSFT", "AMZN"]
ANALYZE_URL = os.getenv("BASE_URL", "http://localhost:8000") + "/analyze"
NEWS_URL = os.getenv("BASE_URL", "http://localhost:8000") + "/news"
INTERVAL_MINUTES = int(os.getenv("SCHEDULER_INTERVAL", "15"))

# ─── Tasks ──────────────────────────────────────────────────────────

def fetch_and_analyze(symbol: str):
    """Fetch news and analyze a single stock symbol."""
    try:
        logger.info(f"[Scheduler] Fetching news for {symbol}...")
        news_resp = requests.get(f"{NEWS_URL}/{symbol}", timeout=30)
        if news_resp.status_code == 200:
            news_data = news_resp.json()
            logger.info(f"[Scheduler] ✓ News for {symbol}: {len(news_data.get('articles', []))} articles")
        else:
            logger.warning(f"[Scheduler] News API returned {news_resp.status_code} for {symbol}")

        logger.info(f"[Scheduler] Running analysis for {symbol}...")
        analysis_resp = requests.get(f"{ANALYZE_URL}/{symbol}", timeout=30)
        if analysis_resp.status_code == 200:
            analysis = analysis_resp.json()
            logger.info(f"[Scheduler] ✓ Analysis for {symbol}: {analysis.get('signal', 'N/A')}")
        else:
            logger.warning(f"[Scheduler] Analysis API returned {analysis_resp.status_code} for {symbol}")

    except requests.exceptions.Timeout:
        logger.error(f"[Scheduler] ⏱ Timeout for {symbol}")
    except requests.exceptions.ConnectionError:
        logger.error(f"[Scheduler] 🔌 Connection error for {symbol} — is the server running?")
    except Exception as e:
        logger.error(f"[Scheduler] ❌ Error for {symbol}: {e}")


def run_all_analyses():
    """Run news fetch + analysis for all configured symbols."""
    logger.info(f"\n{'='*50}")
    logger.info(f"[Scheduler] 🔄 Starting scheduled run at {datetime.now().isoformat()}")
    logger.info(f"{'='*50}")

    symbols = os.getenv("WATCH_SYMBOLS", ",".join(DEFAULT_SYMBOLS)).split(",")
    for symbol in symbols:
        symbol = symbol.strip().upper()
        if symbol:
            fetch_and_analyze(symbol)

    logger.info(f"[Scheduler] ✅ Scheduled run complete at {datetime.now().isoformat()}")
    logger.info(f"{'='*50}\n")


# ─── Scheduler Setup ────────────────────────────────────────────────

scheduler = BackgroundScheduler()


def start_scheduler():
    """Start the background scheduler."""
    if scheduler.running:
        logger.warning("[Scheduler] Already running — skipping")
        return

    scheduler.add_job(
        run_all_analyses,
        IntervalTrigger(minutes=INTERVAL_MINUTES),
        id="analyze_all_symbols",
        name=f"Analyze all symbols every {INTERVAL_MINUTES} min",
        replace_existing=True,
    )

    scheduler.start()
    logger.info(f"[Scheduler] 🚀 Started — running every {INTERVAL_MINUTES} minutes")


def stop_scheduler():
    """Gracefully stop the scheduler."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("[Scheduler] 🛑 Stopped")


# ─── Manual Trigger (for testing) ───────────────────────────────────

if __name__ == "__main__":
    print("Running manual scheduler job...")
    run_all_analyses()
    print("Done.")