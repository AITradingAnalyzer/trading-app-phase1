from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from .database import Base, engine, SessionLocal
from . import crud, models, schemas
from .market_data import get_stock_price
from .news_fetcher import get_news
from .ai_analyzer import analyze_stock_with_ai


Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Trading Analyzer API")

# Allow your frontend (localhost + Netlify) to call the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",           # local Vite dev server
        "https://trading-app-phase1.netlify.app"   # replace with your actual Netlify domain
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def root():
    return {"message": "AI Trading Analyzer backend is running"}

@app.get("/signals", response_model=list[schemas.SignalOut])
def read_signals(db: Session = Depends(get_db)):
    return crud.get_signals(db)

@app.post("/signals", response_model=schemas.SignalOut)
def create_signal(signal: schemas.SignalCreate, db: Session = Depends(get_db)):
    return crud.create_signal(db, signal)
    
@app.get("/stock/{symbol}")
def stock_price(symbol: str):
    return get_stock_price(symbol)
    
@app.get("/news/{symbol}")
async def news_headlines(symbol: str):
    return await get_news(symbol)
    
    
@app.get("/analyze/{symbol}")
async def analyze_stock(symbol: str):
    """
    Get stock data + news + AI analysis all in one endpoint
    """
    # get_stock_price is a normal function, so NO await here
    stock_data = get_stock_price(symbol)
    if "error" in stock_data:
        return stock_data

    # get_news is async, so YES await here
    news_data = await get_news(symbol)
    if "error" in news_data:
        return news_data

    # analyze_stock_with_ai is async, so YES await here
    analysis = await analyze_stock_with_ai(
        symbol=symbol,
        stock_data=stock_data,
        news_data=news_data
    )

    return {
        "symbol": symbol.upper(),
        "stock_data": stock_data,
        "news": news_data,
        "ai_analysis": analysis
    }