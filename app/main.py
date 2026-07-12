# app/main.py
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from .database import Base, engine, SessionLocal
from . import crud, models, schemas
from .market_data import get_stock_price
from .news_fetcher import get_news
from .ai_analyzer import analyze_stock_with_ai

# ─── Create all DB tables on startup ───
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Trading Analyzer API")

# ─── CORS Middleware ───
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://trading-app-phase1.netlify.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── DB Dependency ───
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ─────────────────────────────────────────
# ROOT
# ─────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "AI Trading Analyzer backend is running ✅"}


# ─────────────────────────────────────────
# SIGNALS
# ─────────────────────────────────────────

@app.get("/signals", response_model=list[schemas.SignalOut])
def read_signals(db: Session = Depends(get_db)):
    """Get all signals from the database"""
    return crud.get_signals(db)

@app.post("/signals", response_model=schemas.SignalOut)
def create_signal(signal: schemas.SignalCreate, db: Session = Depends(get_db)):
    """Manually create a signal"""
    return crud.create_signal(db, signal)

@app.get("/signals/history/{symbol}")
def signal_history(symbol: str, limit: int = 10, db: Session = Depends(get_db)):
    """Get signal history for a specific stock"""
    history = crud.get_signal_history(db, symbol=symbol.upper(), limit=limit)
    if not history:
        raise HTTPException(status_code=404, detail=f"No signal history found for {symbol.upper()}")
    return history


# ─────────────────────────────────────────
# STOCK DATA
# ─────────────────────────────────────────

@app.get("/stock/{symbol}")
def stock_price(symbol: str):
    """Get real-time stock price"""
    return get_stock_price(symbol)


# ─────────────────────────────────────────
# NEWS
# ─────────────────────────────────────────

@app.get("/news/{symbol}")
async def news_headlines(symbol: str):
    """Get latest news for a stock"""
    return await get_news(symbol)

@app.get("/news/history/{symbol}")
def news_history(symbol: str, limit: int = 10, db: Session = Depends(get_db)):
    """Get saved news history for a stock"""
    history = crud.get_news_history(db, symbol=symbol.upper(), limit=limit)
    if not history:
        raise HTTPException(status_code=404, detail=f"No news history found for {symbol.upper()}")
    return history


# ─────────────────────────────────────────
# AI ANALYSIS (Main Endpoint)
# ─────────────────────────────────────────

@app.get("/analyze/{symbol}")
async def analyze_stock(symbol: str, db: Session = Depends(get_db)):
    """
    Full pipeline:
    1. Fetch real-time stock data
    2. Fetch latest news
    3. Run Claude AI analysis
    4. Save signal + news to DB
    5. Return full result
    """

    # Step 1: Stock Data
    stock_data = get_stock_price(symbol)
    if "error" in stock_data:
        raise HTTPException(status_code=400, detail=stock_data["error"])

    # Step 2: News Data
    news_data = await get_news(symbol)
    if isinstance(news_data, dict) and "error" in news_data:
        raise HTTPException(status_code=400, detail=news_data["error"])

    # Step 3: Claude AI Analysis
    analysis = await analyze_stock_with_ai(
        symbol=symbol,
        stock_data=stock_data,
        news_data=news_data
    )

    # Step 4a: Save Signal to DB
    try:
        crud.save_analysis_signal(
            db=db,
            symbol=symbol.upper(),
            signal=analysis.get("signal", "HOLD"),
            confidence=float(analysis.get("confidence", 0.0)),
            analysis_text=analysis.get("reasoning", str(analysis))
        )
        print(f"✅ Signal saved: {symbol.upper()} → {analysis.get('signal')}")
    except Exception as e:
        print(f"⚠️ Could not save signal: {e}")

    # Step 4b: Save News Articles to DB
    try:
        articles = news_data if isinstance(news_data, list) else news_data.get("articles", [])
        for article in articles[:5]:  # Save top 5
            crud.save_news_article(
                db=db,
                symbol=symbol.upper(),
                headline=article.get("headline", article.get("title", "No headline")),
                summary=article.get("summary", ""),
                url=article.get("url", ""),
                published_at=article.get("published_at", None)
            )
        print(f"✅ News saved: {len(articles[:5])} articles for {symbol.upper()}")
    except Exception as e:
        print(f"⚠️ Could not save news: {e}")

    # Step 5: Return Full Result
    return {
        "symbol": symbol.upper(),
        "stock_data": stock_data,
        "news": news_data,
        "ai_analysis": analysis
    }