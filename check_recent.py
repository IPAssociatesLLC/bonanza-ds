import sqlite3

db_path = "bonanza_ds.db"
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

print("--- Recent Opportunities (Products) ---")
try:
    cursor.execute("SELECT id, title, source_url, created_at FROM opportunities ORDER BY created_at DESC LIMIT 5")
    rows = cursor.fetchall()
    for row in rows:
        print(dict(row))
except Exception as e:
    print("Error querying opportunities:", e)

print("\n--- Recent Scan Logs ---")
try:
    cursor.execute("SELECT id, level, message, details, timestamp FROM scan_logs ORDER BY timestamp DESC LIMIT 10")
    rows = cursor.fetchall()
    for row in rows:
        print(dict(row))
except Exception as e:
    print("Error querying scan logs:", e)

conn.close()
