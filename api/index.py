import sys
import os
import traceback
import json

# Add the parent directory to sys.path so it can find routes.py, db.py, etc.
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

async def app(scope, receive, send):
    try:
        from routes import create_app
        real_app = create_app(static_dir="dist")
        await real_app(scope, receive, send)
    except Exception as e:
        err_str = traceback.format_exc()
        if scope['type'] == 'http':
            await send({
                'type': 'http.response.start',
                'status': 500,
                'headers': [
                    (b'content-type', b'application/json'),
                ],
            })
            await send({
                'type': 'http.response.body',
                'body': json.dumps({"startup_error": err_str}).encode('utf-8'),
            })
