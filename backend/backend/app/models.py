from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from datetime import datetime
from .database import Base

class Signal(Base):
    __tablename__ = "signals"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, index=True, nullable=False)
    signal = Column(String, nullable=False)  # BUY / SELL / HOLD
    confidence = Column(Float, nullable=False)
    news_summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)