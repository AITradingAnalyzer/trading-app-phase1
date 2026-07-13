from pydantic import BaseModel
from datetime import datetime

class SignalBase(BaseModel):
    symbol: str
    signal: str
    confidence: float
    news_summary: str | None = None

class SignalCreate(SignalBase):
    pass

class SignalOut(SignalBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True