import urllib.request
import json

url = "https://bonanza-ds.vercel.app/api/import/walmart"
payload = {
    "id": "test-webhook",
    "status": "finished",
    "response": {
        "body": {
            "organic_results": [
                {
                    "title": "Test Walmart Product 123",
                    "price": 25.99,
                    "product_id": "999888777666",
                    "product_url": "https://www.walmart.com/ip/999888777666"
                }
            ]
        }
    }
}
data = json.dumps(payload).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})

try:
    with urllib.request.urlopen(req) as response:
        print("Status:", response.status)
        print("Body:", response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code)
    print("Body:", e.read().decode('utf-8'))
except Exception as e:
    print("Error:", e)
