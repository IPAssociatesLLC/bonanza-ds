import sys
import os

# Add the parent directory to sys.path so it can find routes.py, db.py, etc.
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from routes import create_app

# Vercel expects an ASGI application instance named 'app'
app = create_app(static_dir="dist")
