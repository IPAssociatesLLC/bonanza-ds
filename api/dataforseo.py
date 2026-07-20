import base64
import logging
import httpx
from typing import List, Dict, Any, Optional

logger = logging.getLogger("bonanza_ds.dataforseo")

DATAFORSEO_BASE_URL = "https://api.dataforseo.com/v3"

def _get_auth_header(email: str, password: str) -> str:
    """Helper to create base64 basic auth header."""
    auth_str = f"{email}:{password}"
    b64_auth = base64.b64encode(auth_str.encode("utf-8")).decode("utf-8")
    return f"Basic {b64_auth}"

async def check_search_volume(
    keywords: List[str], 
    email: str, 
    password: str
) -> Dict[str, int]:
    """
    Checks Google monthly search volume in batch using DataForSEO.
    Returns a dictionary mapping {keyword: search_volume}.
    """
    if not email or not password:
        logger.warning("DataForSEO email or password not configured.")
        return {}

    url = f"{DATAFORSEO_BASE_URL}/keywords_data/google_ads/search_volume/live"
    headers = {
        "Authorization": _get_auth_header(email, password),
        "Content-Type": "application/json"
    }
    
    # DataForSEO requires location_code and language_code
    payload = [
        {"keyword": kw, "location_code": 2840, "language_code": "en"}
        for kw in keywords
    ]
    
    results = {}
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            logger.info(f"Checking DataForSEO search volume for {len(keywords)} keywords...")
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
            
            tasks = data.get("tasks") or []
            for task in tasks:
                if task.get("status_code") == 20000:
                    task_results = task.get("result") or []
                    for res in task_results:
                        kw = res.get("keyword")
                        sv = res.get("search_volume") or 0
                        if kw:
                            results[kw] = int(sv)
                            logger.info(f"Search volume for '{kw}': {sv}")
                else:
                    logger.error(f"DataForSEO SV task error {task.get('status_code')}: {task.get('status_message')} | data: {str(task)[:300]}")
        except Exception as e:
            logger.error(f"DataForSEO search volume API error: {e}")
            
    return results

async def search_google_shopping_prices(
    keyword: str, 
    email: str, 
    password: str
) -> Optional[Dict[str, Any]]:
    """
    Searches Google Shopping using DataForSEO SERP API to find lowest competition prices.
    Uses /serp/google/shopping/live/advanced endpoint.
    """
    if not email or not password:
        return None

    url = f"{DATAFORSEO_BASE_URL}/serp/google/shopping/live/advanced"
    headers = {
        "Authorization": _get_auth_header(email, password),
        "Content-Type": "application/json"
    }
    payload = [{
        "keyword": keyword,
        "location_code": 2840,
        "language_code": "en",
        "device": "desktop",
        "os": "windows"
    }]
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            logger.info(f"DataForSEO Google Shopping SERP for: {keyword}")
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
            tasks = data.get("tasks") or []
            for task in tasks:
                if task.get("status_code") == 20000:
                    for result in (task.get("result") or []):
                        items = result.get("items") or []
                        prices = []
                        for item in items:
                            if item.get("type") == "shopping":
                                p = item.get("price")
                                if p:
                                    try: prices.append(float(p))
                                    except: pass
                        if prices:
                            return {"low": min(prices), "high": max(prices), "count": len(prices)}
                else:
                    logger.error(f"DataForSEO Shopping error {task.get('status_code')}: {task.get('status_message')}")
        except Exception as e:
            logger.error(f"DataForSEO Google Shopping API error: {e}")
    return None
