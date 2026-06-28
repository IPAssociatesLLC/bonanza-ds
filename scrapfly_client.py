"""Scrapfly client for scraping AliExpress."""
import os
import json
import logging
from urllib.parse import quote_plus
import httpx

logger = logging.getLogger("bonanza_ds.scrapfly")

class ScrapflyClient:
    """Wraps the Scrapfly API for scraping AliExpress."""

    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or os.environ.get("SCRAPFLY_API_KEY")
        self.client = httpx.Client(timeout=120.0, verify=False)
        self.base_url = "https://api.scrapfly.io/scrape"

    def scrape_aliexpress_search(self, keyword: str, max_pages: int = 1) -> list[dict]:
        """Scrape AliExpress search results using Scrapfly ASP."""
        if not self.api_key:
            raise ValueError("Scrapfly API key is not configured.")

        products = []
        kw_clean = quote_plus(keyword)
        
        for page in range(1, max_pages + 1):
            url = f"https://www.aliexpress.com/w/wholesale-{kw_clean}.html?page={page}"
            logger.info(f"Scraping {url} with Scrapfly...")
            
            params = {
                "key": self.api_key,
                "url": url,
                "asp": "true",
                "country": "us"
            }
            
            # Use Aliexpress localization cookie as recommended by Scrapfly
            params["headers[cookie]"] = "aep_usuc_f=site=glo&province=&city=&c_tp=USD&region=US&b_locale=en_US&ae_u_p_s=2"
            
            try:
                # Add verify=False for local dev proxy issues
                resp = self.client.get(self.base_url, params=params)
                resp.raise_for_status()
                data = resp.json()
                
                content = data.get("result", {}).get("content", "")
                
                import re
                # Use Scrapfly's exact extraction regex for Aliexpress
                match = re.search(r'_init_data_\s*=\s*{\s*data:\s*({.+}) }', content)
                
                if match:
                    try:
                        run_params = json.loads(match.group(1))
                        items = run_params.get("data", {}).get("root", {}).get("fields", {}).get("mods", {}).get("itemList", {}).get("content", [])
                        
                        for item in items:
                            products.append(self._normalize_product(item))
                    except json.JSONDecodeError:
                        logger.error("Failed to parse init_data JSON.")
                    except Exception as e:
                        logger.error(f"Error parsing item list: {e}")
                else:
                    logger.warning("Could not find _init_data_. Scrapfly ASP might need tuning for AliExpress, or page structure changed.")
                    
            except Exception as e:
                logger.error(f"Error scraping AliExpress with Scrapfly: {e}")
                
        return products
        
    def _normalize_product(self, raw: dict) -> dict:
        """Convert AliExpress raw item data to standard product format."""
        title_obj = raw.get("title", {})
        title = title_obj.get("displayTitle", "Unknown Product") if isinstance(title_obj, dict) else str(raw.get("title", "Unknown Product"))
        
        product_id = raw.get("productId", "")
        
        prices = raw.get("prices", {})
        sale_price = prices.get("salePrice", {})
        try:
            price = float(sale_price.get("minPrice", 0.0))
        except ValueError:
            price = 0.0
            
        image_obj = raw.get("image", {})
        image_url = image_obj.get("imgUrl", "") if isinstance(image_obj, dict) else str(raw.get("image", ""))
        if image_url and not image_url.startswith("http"):
            image_url = "https:" + image_url
            
        trade = raw.get("trade", {})
        orders_str = str(trade.get("tradeDesc", "0")).split(" ")[0]
        try:
            orders = int(orders_str.replace("+", "").replace(",", ""))
        except ValueError:
            orders = 0
            
        evaluation = raw.get("evaluation", {})
        rating = evaluation.get("starRating", 0.0)
        
        store = raw.get("store", {})
        seller_name = store.get("storeName", "AliExpress Seller")
        
        brand = seller_name if seller_name != "AliExpress Seller" else "Unbranded"
        condition = "New"
        
        return {
            "source": "aliexpress",
            "source_url": f"https://www.aliexpress.com/item/{product_id}.html" if product_id else "",
            "source_product_id": str(product_id),
            "title": title,
            "description": title,
            "image_urls": [image_url] if image_url else [],
            "category": "",
            "source_price": price,
            "shipping_cost": 0.0,
            "monthly_sales": orders,
            "rating": float(rating),
            "review_count": 0,
            "stock": 100,
            "seller_name": seller_name,
            "seller_rating": 0.0,
            "seller_years": 0.0,
            # Google Shopping specific
            "brand": brand,
            "condition": condition,
            "gtin": "",
            "mpn": str(product_id),
        }

    def close(self):
        self.client.close()

def normalize_aliexpress_product(raw: dict) -> dict:
    if "source" in raw and raw["source"] == "aliexpress":
        return raw
    return ScrapflyClient()._normalize_product(raw)
