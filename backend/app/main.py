from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from .database import Base, engine, SessionLocal
from . import crud, models, schemas

Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Trading Analyzer API")

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