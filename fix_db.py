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
try:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE opportunities ADD COLUMN origin VARCHAR(50) DEFAULT 'manual_scout'"))
    print("Column added successfully!")
except Exception as e:
    print(e)
