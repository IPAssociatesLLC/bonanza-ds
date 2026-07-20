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
    """Single keyword Google Shopping lookup via DataForSEO task workflow."""
    results = await batch_google_shopping_prices([keyword], email, password)
    return results.get(keyword)


async def batch_google_shopping_prices(
    keywords: List[str],
    email: str,
    password: str
) -> Dict[str, Optional[Dict[str, Any]]]:
    """
    Batch Google Shopping price lookup for multiple keywords.
    Posts all tasks at once, waits, then fetches all results in parallel.
    Much faster than sequential lookups.
    """
    if not email or not password or not keywords:
        return {}

    import asyncio
    headers = {
        "Authorization": _get_auth_header(email, password),
        "Content-Type": "application/json"
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        # Step 1: Post all tasks at once
        payload = [
            {
                "keyword": kw,
                "language_code": "en",
                "location_code": 2840,
                "sort_by": "price_low_to_high",
                "device": "desktop",
                "os": "windows"
            }
            for kw in keywords
        ]
        try:
            logger.info(f"DataForSEO: posting {len(keywords)} Google Shopping tasks")
            post_resp = await client.post(
                f"{DATAFORSEO_BASE_URL}/merchant/google/products/task_post",
                headers=headers, json=payload
            )
            post_data = post_resp.json()
        except Exception as e:
            logger.error(f"DataForSEO batch post failed: {e}")
            return {}

        tasks_posted = post_data.get("tasks") or []
        # Map keyword → task_id
        kw_to_task = {}
        for i, task in enumerate(tasks_posted):
            if task.get("status_code") in (20100, 20000):
                kw = keywords[i] if i < len(keywords) else None
                tid = task.get("id")
                if kw and tid:
                    kw_to_task[kw] = tid
            else:
                kw = keywords[i] if i < len(keywords) else "?"
                logger.error(f"Task post failed for '{kw}': {task.get('status_message')}")

        if not kw_to_task:
            return {}

        # Step 2: Wait for tasks to complete
        logger.info(f"Waiting 12s for {len(kw_to_task)} tasks to complete...")
        await asyncio.sleep(12)

        # Step 3: Fetch all results
        results = {}
        for kw, task_id in kw_to_task.items():
            try:
                get_resp = await client.get(
                    f"{DATAFORSEO_BASE_URL}/merchant/google/products/task_get/advanced/{task_id}",
                    headers=headers
                )
                get_data = get_resp.json()
                result_tasks = get_data.get("tasks") or []
                if not result_tasks:
                    continue

                rt = result_tasks[0]
                status = rt.get("status_code")

                if status == 20000:
                    prices = []
                    for result in (rt.get("result") or []):
                        for item in (result.get("items") or []):
                            p = item.get("price")
                            if p is not None:
                                try: prices.append(float(p))
                                except: pass
                    if prices:
                        results[kw] = {"low": min(prices), "high": max(prices), "count": len(prices)}
                        logger.info(f"  '{kw}': {len(prices)} prices, low=${min(prices)}")
                    else:
                        results[kw] = None
                        logger.info(f"  '{kw}': no prices found")
                elif status == 20100:
                    # Still processing - wait a bit more and retry once
                    logger.info(f"  '{kw}': still processing, retrying in 8s...")
                    await asyncio.sleep(8)
                    retry_resp = await client.get(
                        f"{DATAFORSEO_BASE_URL}/merchant/google/products/task_get/advanced/{task_id}",
                        headers=headers
                    )
                    retry_data = retry_resp.json()
                    retry_task = (retry_data.get("tasks") or [{}])[0]
                    if retry_task.get("status_code") == 20000:
                        prices = []
                        for result in (retry_task.get("result") or []):
                            for item in (result.get("items") or []):
                                p = item.get("price")
                                if p is not None:
                                    try: prices.append(float(p))
                                    except: pass
                        results[kw] = {"low": min(prices), "high": max(prices), "count": len(prices)} if prices else None
                    else:
                        results[kw] = None
                else:
                    logger.error(f"  '{kw}': error {status}: {rt.get('status_message')}")
                    results[kw] = None
            except Exception as e:
                logger.error(f"DataForSEO get failed for '{kw}': {e}")
                results[kw] = None

    return results
