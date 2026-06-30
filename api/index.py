import sys
import os

# Add the parent directory to sys.path so it can find routes.py, db.py, etc.
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from routes import create_app
    app = create_app(static_dir="dist")
except Exception as e:
    import traceback
    err_str = traceback.format_exc()
    
    async def app(scope, receive, send):
        assert scope['type'] == 'http'
        await send({
            'type': 'http.response.start',
            'status': 500,
            'headers': [
                (b'content-type', b'application/json'),
            ],
        })
        import json
        await send({
            'type': 'http.response.body',
            'body': json.dumps({"startup_error": err_str}).encode('utf-8'),
        })
