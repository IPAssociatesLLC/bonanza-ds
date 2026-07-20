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
        result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'opportunities'"))
        columns = [row[0] for row in result]
        print("Opportunities columns:", columns)
        
        result2 = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))
        tables = [row[0] for row in result2]
        print("Tables:", tables)
except Exception as e:
    print(e)
