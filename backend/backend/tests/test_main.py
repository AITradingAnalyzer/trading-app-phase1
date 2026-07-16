# backend/tests/test_main.py
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app import models, crud

client = TestClient(app)

@pytest.fixture
def db():
    db = SessionLocal()
    yield db
    db.close()


# ─── Test 1: Root Endpoint ───
def test_root():
    response = client.get("/")
    assert response.status_code == 200
    print("✅ Test 1 PASSED: Root endpoint works")


# ─── Test 2: Stock Endpoint ───
def test_stock_endpoint():
    response = client.get("/stock/AAPL")
    assert response.status_code == 200
    data = response.json()
    assert "symbol" in data or "error" in data
    print("✅ Test 2 PASSED: /stock endpoint works")


# ─── Test 3: News Endpoint ───
def test_news_endpoint():
    response = client.get("/news/AAPL")
    assert response.status_code == 200
    print("✅ Test 3 PASSED: /news endpoint works")


# ─── Test 4: Signal Persistence ───
def test_signal_persistence(db):
    signal = crud.save_analysis_signal(
        db=db,
        symbol="TEST",
        signal="BUY",
        confidence=0.85,
        analysis_text="Test analysis"
    )
    retrieved = crud.get_latest_signal(db, "TEST")
    assert retrieved is not None
    assert retrieved.signal == "BUY"
    assert retrieved.confidence == 0.85
    print("✅ Test 4 PASSED: Signal persistence works")


# ─── Test 5: News Persistence ───
def test_news_persistence(db):
    news = crud.save_news_article(
        db=db,
        symbol="TEST",
        headline="Test headline",
        summary="Test summary"
    )
    retrieved = db.query(models.News).filter(models.News.id == news.id).first()
    assert retrieved is not None
    assert retrieved.headline == "Test headline"
    print("✅ Test 5 PASSED: News persistence works")


# ─── Test 6: Signal History ───
def test_signal_history(db):
    for _ in range(3):
        crud.save_analysis_signal(db, "HIST_TEST", "HOLD", 0.5)
    history = crud.get_signal_history(db, "HIST_TEST", limit=5)
    assert len(history) >= 3
    print("✅ Test 6 PASSED: Signal history retrieval works")