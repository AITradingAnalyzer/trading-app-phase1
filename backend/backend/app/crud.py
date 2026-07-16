# app/crud.py
from sqlalchemy.orm import Session
from datetime import datetime
from . import models, schemas


# ─────────────────────────────────────────
# SIGNALS
# ─────────────────────────────────────────

def get_signals(db: Session):
    """Get all signals (for GET /signals endpoint)"""
    return db.query(models.Signal).order_by(models.Signal.created_at.desc()).all()

def create_signal(db: Session, signal: schemas.SignalCreate):
    """Create signal from schema (for POST /signals endpoint)"""
    db_signal = models.Signal(
        symbol=signal.symbol,
        signal=signal.signal,
        confidence=getattr(signal, "confidence", None),
        analysis=getattr(signal, "analysis", None)
    )
    db.add(db_signal)
    db.commit()
    db.refresh(db_signal)
    return db_signal

def save_analysis_signal(db: Session, symbol: str, signal: str, confidence: float = 0.0, analysis_text: str = ""):
    """Save signal generated from AI analysis (for /analyze endpoint)"""
    db_signal = models.Signal(
        symbol=symbol,
        signal=signal,
        confidence=confidence,
        analysis=analysis_text
    )
    db.add(db_signal)
    db.commit()
    db.refresh(db_signal)
    return db_signal

def get_latest_signal(db: Session, symbol: str):
    """Get the most recent signal for a stock"""
    return db.query(models.Signal).filter(
        models.Signal.symbol == symbol
    ).order_by(models.Signal.created_at.desc()).first()

def get_signal_history(db: Session, symbol: str, limit: int = 10):
    """Get signal history for a stock"""
    return db.query(models.Signal).filter(
        models.Signal.symbol == symbol
    ).order_by(models.Signal.created_at.desc()).limit(limit).all()


# ─────────────────────────────────────────
# NEWS
# ─────────────────────────────────────────

def save_news_article(db: Session, symbol: str, headline: str, summary: str = "", url: str = "", published_at=None):
    """Save a news article to the database"""
    db_news = models.News(
        symbol=symbol,
        headline=headline,
        summary=summary,
        url=url,
        published_at=published_at or datetime.utcnow()
    )
    db.add(db_news)
    db.commit()
    db.refresh(db_news)
    return db_news

def get_news_history(db: Session, symbol: str, limit: int = 10):
    """Get news history for a stock"""
    return db.query(models.News).filter(
        models.News.symbol == symbol
    ).order_by(models.News.published_at.desc()).limit(limit).all()
