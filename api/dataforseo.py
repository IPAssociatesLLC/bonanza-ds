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
    Searches Google Shopping using DataForSEO merchant/google/products task workflow.
    POST task → poll → GET results.
    """
    if not email or not password:
        return None

    import asyncio
    headers = {
        "Authorization": _get_auth_header(email, password),
        "Content-Type": "application/json"
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            # Step 1: Create task
            post_url = f"{DATAFORSEO_BASE_URL}/merchant/google/products/task_post"
            payload = [{
                "keyword": keyword,
                "language_code": "en",
                "location_code": 2840,
                "sort_by": "price_low_to_high"
            }]
            logger.info(f"DataForSEO: posting Google Shopping task for '{keyword}'")
            post_resp = await client.post(post_url, headers=headers, json=payload)
            post_data = post_resp.json()
            
            tasks = post_data.get("tasks") or []
            if not tasks or tasks[0].get("status_code") != 20100:
                logger.error(f"Task post failed: {tasks[0].get('status_message') if tasks else 'no tasks'}")
                return None
            
            task_id = tasks[0].get("id")
            if not task_id:
                return None
            
            # Step 2: Poll for results
            get_url = f"{DATAFORSEO_BASE_URL}/merchant/google/products/task_get/advanced/{task_id}"
            for attempt in range(6):
                await asyncio.sleep(5)
                logger.info(f"DataForSEO: fetching task {task_id}, attempt {attempt+1}")
                get_resp = await client.get(get_url, headers=headers)
                get_data = get_resp.json()
                
                result_tasks = get_data.get("tasks") or []
                if not result_tasks:
                    continue
                    
                result_task = result_tasks[0]
                status = result_task.get("status_code")
                
                if status == 20000:
                    prices = []
                    for result in (result_task.get("result") or []):
                        for item in (result.get("items") or []):
                            p = item.get("price") or item.get("price_from")
                            if p:
                                try: prices.append(float(p))
                                except: pass
                    if prices:
                        logger.info(f"DataForSEO: found {len(prices)} prices for '{keyword}', low=${min(prices)}")
                        return {"low": min(prices), "high": max(prices), "count": len(prices)}
                    logger.info(f"DataForSEO: no prices found for '{keyword}'")
                    return None
                elif status == 40602:
                    logger.info(f"Task still in queue, waiting...")
                    continue
                else:
                    logger.error(f"Task get error {status}: {result_task.get('status_message')}")
                    return None
                    
            logger.warning(f"DataForSEO task timed out for '{keyword}'")
            return None
            
        except Exception as e:
            logger.error(f"DataForSEO Google Shopping error: {e}")
            return None
