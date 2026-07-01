import os
import json
import httpx
from typing import List, Dict, Any, Optional

BRIGHT_DATA_API_KEY = os.environ.get("BRIGHT_DATA_API_KEY", "b1dd9580-ccc3-4c0d-ba87-672aa99d8221")
BRIGHT_DATA_ZONE = os.environ.get("BRIGHT_DATA_ZONE", "serp_api1") # Default zone name

async def search_google_shopping(query: str) -> Optional[Dict[str, Any]]:
    """
    Searches Google Shopping using Bright Data's SERP API.
    Returns parsed statistics (high, low, average prices) for the product.
    """
    if not BRIGHT_DATA_API_KEY:
        print("Warning: BRIGHT_DATA_API_KEY is not set.")
        return None
        
    url = "https://api.brightdata.com/request"
    headers = {
        "Authorization": f"Bearer {BRIGHT_DATA_API_KEY}",
        "Content-Type": "application/json"
    }
    
    # tbm=shop forces Google Shopping tab.
    google_url = f"https://www.google.com/search?q={query}&tbm=shop&hl=en&gl=us"
    
    payload = {
        "zone": BRIGHT_DATA_ZONE,
        "url": google_url,
        "format": "raw",
        "data_format": "parsed"
    }
    
    async with httpx.AsyncClient(timeout=30.0, verify=False) as client:
        try:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
            
            # Bright Data often encapsulates the parsed result in 'body'
            parsed_data = data
            if "body" in data:
                body = data["body"]
                if isinstance(body, str):
                    parsed_data = json.loads(body)
                else:
                    parsed_data = body

            items = parsed_data.get("shopping") or parsed_data.get("organic") or []
            
            if not items:
                return None
                
            prices = []
            for item in items:
                price_str = item.get("price") or item.get("extracted_price") or ""
                if isinstance(price_str, (int, float)):
                    prices.append(float(price_str))
                elif isinstance(price_str, str) and "$" in price_str:
                    try:
                        # Extract the numeric value e.g. "$89.99" -> 89.99
                        val = float(price_str.replace("$", "").replace(",", "").strip())
                        prices.append(val)
                    except ValueError:
                        continue
                        
            if not prices:
                return None
                
            return {
                "count": len(prices),
                "low": min(prices),
                "high": max(prices),
                "average": round(sum(prices) / len(prices), 2),
                "raw_results": items[:5] # Store top 5 for reference
            }
            
        except Exception as e:
            print(f"Bright Data API Error: {e}")
            return None
