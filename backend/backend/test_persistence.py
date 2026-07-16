# backend/test_persistence.py
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from sqlalchemy import text

def check_persistence():
    db = SessionLocal()
    try:
        # Check signals table
        try:
            result = db.execute(text("SELECT COUNT(*) FROM signals"))
            print(f"✅ Signals in DB: {result.scalar()}")
        except Exception as e:
            print(f"❌ Signals table issue: {e}")

        # Check news table
        try:
            result = db.execute(text("SELECT COUNT(*) FROM news"))
            print(f"✅ News in DB: {result.scalar()}")
        except Exception as e:
            print(f"❌ News table issue: {e}")

        # Show recent signals
        try:
            result = db.execute(text(
                "SELECT symbol, signal, confidence, created_at FROM signals ORDER BY created_at DESC LIMIT 5"
            ))
            rows = result.fetchall()
            if rows:
                print("\n📊 Recent Signals:")
                for row in rows:
                    print(f"   {row[0]}: {row[1]} | Confidence: {row[2]} | Time: {row[3]}")
            else:
                print("\n📊 No signals yet (DB is empty — that's okay!)")
        except Exception as e:
            print(f"❌ Could not fetch signals: {e}")

    finally:
        db.close()

if __name__ == "__main__":
    check_persistence()