"""Octoparse Open API client — triggers AliExpress scraping tasks and fetches results."""
import os
import time
import httpx
import logging

logger = logging.getLogger("bonanza_ds.octoparse")

OPENAPI_BASE = "https://openapi.octoparse.com"
DATAAPI_BASE = "https://dataapi.octoparse.com"


class OctoparseClient:
    """Wraps the Octoparse Open API for product scraping (AliExpress, etc.)."""

    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or os.environ.get("OCTOPARSE_API_KEY", "op_sk_788dda5ae51b4fa5aa51c655483382c5")
        self.client = httpx.Client(timeout=120.0, verify=False)
        self._token: str | None = None

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    # ─── Task Control (OpenAPI) ───────────────────────────────────────────

    def start_task(self, task_id: str) -> dict:
        """Start a scraping task by ID."""
        url = f"{OPENAPI_BASE}/api/task/start"
        resp = self.client.post(url, json={"taskId": task_id}, headers=self._headers())
        resp.raise_for_status()
        logger.info("Octoparse task started: %s", task_id)
        return resp.json()

    def stop_task(self, task_id: str) -> dict:
        """Stop a running scraping task."""
        url = f"{OPENAPI_BASE}/api/task/stop"
        resp = self.client.post(url, json={"taskId": task_id}, headers=self._headers())
        resp.raise_for_status()
        return resp.json()

    def get_task_status(self, task_id: str) -> dict:
        """Check the status of a scraping task."""
        url = f"{OPENAPI_BASE}/api/task/status"
        resp = self.client.post(url, json={"taskId": task_id}, headers=self._headers())
        resp.raise_for_status()
        return resp.json()

    # ─── Data Retrieval (DataAPI) ─────────────────────────────────────────

    def get_data(self, task_id: str, size: int = 100, offset: int = 0) -> dict:
        """Fetch extracted data from a completed task.

        Returns JSON with extracted product fields.
        """
        url = f"{DATAAPI_BASE}/api/data"
        params = {
            "taskId": task_id,
            "size": size,
            "offset": offset,
        }
        resp = self.client.get(url, params=params, headers=self._headers())
        resp.raise_for_status()
        return resp.json()

    def get_data_all(self, task_id: str, max_items: int = 500) -> list[dict]:
        """Fetch all extracted data with pagination."""
        all_data: list[dict] = []
        offset = 0
        size = 100
        while len(all_data) < max_items:
            result = self.get_data(task_id, size=size, offset=offset)
            data_list = result.get("data", result.get("dataList", []))
            if not data_list:
                break
            all_data.extend(data_list)
            if len(data_list) < size:
                break
            offset += size
            time.sleep(0.5)
        return all_data

    # ─── High-level: Run a full scrape ────────────────────────────────────

    def run_scrape(self, task_id: str, poll_interval: int = 10, max_wait: int = 300) -> list[dict]:
        """Start a task, wait for completion, and return all scraped data.

        Args:
            task_id: The Octoparse task ID to run.
            poll_interval: Seconds between status checks.
            max_wait: Maximum seconds to wait for task completion.

        Returns:
            List of extracted product data dictionaries.
        """
        self.start_task(task_id)
        elapsed = 0
        while elapsed < max_wait:
            time.sleep(poll_interval)
            elapsed += poll_interval
            status_resp = self.get_task_status(task_id)
            status = status_resp.get("status", "").lower()
            logger.info("Octoparse task %s status: %s (%ds elapsed)", task_id, status, elapsed)
            if status in ("finished", "completed", "not_started"):
                break
            if status == "error":
                raise RuntimeError(f"Octoparse task {task_id} failed: {status_resp}")
        return self.get_data_all(task_id)

    def get_tasks(self) -> list[dict]:
        """Fetch all tasks in the user's Octoparse account across all groups."""
        try:
            # 1. Fetch Task Groups
            url_groups = f"{OPENAPI_BASE}/api/TaskGroup"
            resp_groups = self.client.get(url_groups, headers=self._headers())
            resp_groups.raise_for_status()
            groups = resp_groups.json().get("data", [])
            
            all_tasks = []
            # 2. Fetch Tasks for each group
            for group in groups:
                group_id = group.get("taskGroupId")
                if group_id is not None:
                    url_tasks = f"{OPENAPI_BASE}/api/Task"
                    resp_tasks = self.client.get(url_tasks, params={"taskGroupId": group_id}, headers=self._headers())
                    resp_tasks.raise_for_status()
                    tasks = resp_tasks.json().get("data", [])
                    for t in tasks:
                        all_tasks.append({
                            "id": t.get("taskId"),
                            "name": t.get("taskName"),
                            "groupName": group.get("taskGroupName")
                        })
            return all_tasks
        except Exception as e:
            logger.error("Failed to fetch Octoparse tasks: %s", e)
            return []

    def update_task_urls(self, task_id: str, urls: list[str]) -> bool:
        """Update the start URLs of a task before running it."""
        try:
            # Octoparse OpenAPI v1.0 task URL update endpoint:
            # Let's try both /task/updateLoopItems (common for loop URL tasks)
            # and /task/updateTaskParameters (general navigate URLs)
            
            # Let's try updateTaskParameters first
            url = f"{OPENAPI_BASE}/task/updateTaskParameters"
            payload = {
                "taskId": task_id,
                "parameterName": "navigateAction1.Url",
                "parameterValue": urls[0] if urls else ""
            }
            resp = self.client.post(url, json=payload, headers=self._headers())
            
            # If that fails or isn't standard, try loopAction1.UrlList under updateTaskParameters
            if resp.status_code != 200:
                payload = {
                    "taskId": task_id,
                    "parameterName": "loopAction1.UrlList",
                    "parameterValue": "\n".join(urls)
                }
                resp = self.client.post(url, json=payload, headers=self._headers())

            # Try /task/updateLoopItems as final fallback
            if resp.status_code != 200:
                url_loop = f"{OPENAPI_BASE}/task/updateLoopItems"
                payload_loop = {
                    "taskId": task_id,
                    "name": "loopAction1.UrlList",
                    "value": "\n".join(urls)
                }
                resp = self.client.post(url_loop, json=payload_loop, headers=self._headers())
                
            return resp.status_code == 200
        except Exception as e:
            logger.error("Failed to update task URLs: %s", e)
            return False

    def close(self):
        self.client.close()


# ─── AliExpress Product Normalization ─────────────────────────────────────────

def normalize_aliexpress_product(raw: dict) -> dict:
    """Convert raw Octoparse AliExpress data to a standard product format.

    Handles varying field names from different Octoparse templates.
    """
    def _get(*keys, default=""):
        for k in keys:
            v = raw.get(k) or raw.get(k.lower()) or raw.get(k.replace("_", " "))
            if v:
                return v
        return default

    # Parse price — handle string prices with currency symbols
    price_str = str(_get("Price", "price", "productPrice", default="0"))
    price_str = price_str.replace("$", "").replace(",", "").replace("USD", "").strip()
    try:
        price = float(price_str)
    except (ValueError, TypeError):
        price = 0.0

    shipping_str = str(_get("Shipping", "shippingCost", "shipping", default="0"))
    shipping_str = shipping_str.replace("$", "").replace(",", "").strip()
    try:
        shipping = float(shipping_str)
    except (ValueError, TypeError):
        shipping = 0.0

    orders_str = str(_get("Orders", "orders", "soldCount", "sold", default="0"))
    try:
        orders = int(orders_str.replace(",", "").strip())
    except (ValueError, TypeError):
        orders = 0

    rating_str = str(_get("Rating", "rating", "storeRating", default="0"))
    try:
        rating = float(rating_str)
    except (ValueError, TypeError):
        rating = 0.0

    stock_str = str(_get("Stock", "stock", "quantity", default="0"))
    try:
        stock = int(stock_str)
    except (ValueError, TypeError):
        stock = 0

    images_str = _get("Images", "imageURL", "imageUrl", "image", "imageUrls", default="")
    if isinstance(images_str, list):
        images = images_str
    else:
        images = [u.strip() for u in str(images_str).split(",") if u.strip()]

    return {
        "source": "aliexpress",
        "source_url": _get("URL", "url", "productUrl", "link", default=""),
        "source_product_id": _get("ProductID", "productId", "item_id", default=""),
        "title": _get("Title", "title", "productName", "name", default="Unknown Product"),
        "description": _get("Description", "description", "desc", default=""),
        "image_urls": images,
        "category": _get("Category", "category", default=""),
        "source_price": price,
        "shipping_cost": shipping,
        "monthly_sales": orders,
        "rating": rating,
        "review_count": int(_get("Reviews", "reviewCount", "reviews", default="0") or 0),
        "stock": stock,
        "seller_name": _get("Seller", "sellerName", "storeName", "shopName", default=""),
        "seller_rating": float(_get("SellerRating", "storeRating", "shopRating", default="0") or 0),
        "seller_years": float(_get("SellerYears", "yearsInBusiness", "storeAge", default="0") or 0),
    }
