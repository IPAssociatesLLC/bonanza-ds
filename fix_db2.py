import os
from sqlalchemy import create_engine, text

db_url = None
with open('.env', 'r') as f:
    for line in f:
        if line.startswith('DATABASE_URL='):
            db_url = line.strip().split('=', 1)[1]

if db_url and db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

engine = create_engine(db_url)

columns_to_add = [
    "required_sell_price FLOAT",
    "google_avg_price FLOAT",
    "discount_pct FLOAT",
    "deal_duration_days INTEGER",
    "monthly_search_volume INTEGER",
    "seller_count INTEGER",
    "actual_markup_pct FLOAT",
    "est_monthly_sales INTEGER",
    "est_sales_for_window INTEGER",
    "est_income FLOAT",
]

try:
    with engine.begin() as conn:
        for col in columns_to_add:
            try:
                conn.execute(text(f"ALTER TABLE opportunities ADD COLUMN {col}"))
                print(f"Added {col}")
            except Exception as e:
                print(f"Skipping {col} (might already exist): {e}")
    print("Database sync complete!")
except Exception as e:
    print("Fatal error:", e)
