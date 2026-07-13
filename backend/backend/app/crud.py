from sqlalchemy.orm import Session
from . import models, schemas

def create_signal(db: Session, signal: schemas.SignalCreate):
    db_signal = models.Signal(**signal.model_dump())
    db.add(db_signal)
    db.commit()
    db.refresh(db_signal)
    return db_signal

def get_signals(db: Session, skip: int = 0, limit: int = 20):
    return db.query(models.Signal).order_by(models.Signal.created_at.desc()).offset(skip).limit(limit).all()