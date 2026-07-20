import sqlalchemy
from sqlalchemy import create_engine, text

db_url = "postgresql://postgres.wljnjwfeybdlgxvnywpk:BDSoffice-2026@aws-1-us-east-2.pooler.supabase.com:6543/postgres"
engine = create_engine(db_url)

with engine.connect() as conn:
    print("--- Recent Opportunities (Products) ---")
    try:
        result = conn.execute(text("SELECT id, title, source_url, created_at FROM opportunities ORDER BY created_at DESC LIMIT 5"))
        for row in result.mappings():
            print(dict(row))
    except Exception as e:
        print("Error:", e)

    print("\n--- Recent Scan Logs ---")
    try:
        result = conn.execute(text("SELECT id, status, products_found, error_message, started_at, completed_at FROM scan_logs ORDER BY id DESC LIMIT 5"))
        for row in result.mappings():
            print(dict(row))
    except Exception as e:
        print("Error:", e)
