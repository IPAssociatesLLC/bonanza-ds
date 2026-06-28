"""Bonanza API client — handles listing, updating, and fetching booth items."""
import os
import httpx
import json
import logging

logger = logging.getLogger("bonanza_ds.bonanza")

BONANZA_API_URL = "https://api.bonanza.com/api_requests"
SECURE_ENDPOINT = f"{BONANZA_API_URL}/secure_request"
STANDARD_ENDPOINT = f"{BONANZA_API_URL}/standard_request"


class BonanzaClient:
    """Wraps the Bonanza REST API for drop-shipping automation."""

    def __init__(self, dev_name: str | None = None, cert_name: str | None = None, auth_token: str | None = None):
        self.dev_name = dev_name or os.environ.get("BONANZA_DEV_NAME", "")
        self.cert_name = cert_name or os.environ.get("BONANZA_CERT_NAME", "")
        self.auth_token = auth_token or os.environ.get("BONANZA_AUTH_TOKEN", "")
        self.client = httpx.Client(timeout=60.0, verify=False)

    def _headers(self) -> dict:
        return {
            "X-BONANZLE-API-DEV-NAME": self.dev_name,
            "X-BONANZLE-API-CERT-NAME": self.cert_name,
            "Content-Type": "application/json",
        }

    def _secure_request(self, call_name: str, payload: dict) -> dict:
        """Send a secure API request to Bonanza using form-urlencoded JSON payload."""
        headers = self._headers()
        headers["X-BONANZLE-API-CERT-NAME"] = self.cert_name
        headers["Content-Type"] = "application/x-www-form-urlencoded;charset=UTF-8"
        headers["Accept"] = "application/json"

        body = {
            "requesterCredentials": {
                "bonanzleAuthToken": self.auth_token,
                "BonanzaAuthToken": self.auth_token
            },
            **payload,
        }
        
        import json
        json_body = json.dumps(body)
        form_data = {f"{call_name}Request": json_body}

        logger.info("Bonanza API call: %s", call_name)
        resp = self.client.post(SECURE_ENDPOINT, data=form_data, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        # Find failure ack
        ack = data.get(f"{call_name}Response", {}).get("ack", data.get("ack"))
        if ack == "Failure":
            errs = data.get(f"{call_name}Response", {}).get("errors", data.get("errors", []))
            logger.error("Bonanza API error on %s: %s", call_name, errs)
            raise RuntimeError(f"Bonanza API error: {errs}")
        return data

    def _standard_request(self, call_name: str, payload: dict) -> dict:
        """Send a standard (non-secure) API request."""
        headers = self._headers()
        headers["Content-Type"] = "application/x-www-form-urlencoded;charset=UTF-8"
        headers["Accept"] = "application/json"

        import json
        json_body = json.dumps(payload)
        form_data = {f"{call_name}Request": json_body}

        logger.info("Bonanza API call: %s", call_name)
        resp = self.client.post(STANDARD_ENDPOINT, data=form_data, headers=headers)
        resp.raise_for_status()
        return resp.json()

    # ─── Booth Items ──────────────────────────────────────────────────────

    def get_booth_items(self, booth_id: str | None = None, page_size: int = 100, page_number: int = 1) -> dict:
        """Fetch items from a Bonanza booth."""
        payload: dict = {
            "boothId": booth_id or self.dev_name,
            "itemsPerPage": page_size,
            "page": page_number,
        }
        return self._secure_request("getBoothItems", payload)

    # ─── Add Fixed Price Items ────────────────────────────────────────────

    def add_multiple_fixed_price_items(self, items: list[dict]) -> dict:
        """Add multiple fixed-price items to Bonanza using addFixedPriceItem.

        Each item dict should contain:
            title, description, price, quantity, category, shippingCost,
            images (list of URLs), brand, upc, mpn, identifier_exists,
            google_product_category, condition, external_url
        """
        if not items:
            return {}
            
        # If single item, use addFixedPriceItem
        item = items[0]
        img_urls = item.get("images", [])
        if isinstance(img_urls, str):
            img_urls = [u.strip() for u in img_urls.split("|") if u.strip()]

        # Setup Category ID if numeric
        category_id = None
        category_str = item.get("category", "")
        try:
            category_id = int(category_str)
        except (ValueError, TypeError):
            pass

        # Build correct itemSpecifics array
        item_specifics = [
            ["condition", item.get("condition", "new")],
            ["brand", item.get("brand", "brand not available")],
            ["upc", item.get("upc", "brand not available")]
        ]
        if item.get("mpn"):
            item_specifics.append(["mpn", item["mpn"]])
        if item.get("google_product_category"):
            item_specifics.append(["google_product_category", item["google_product_category"]])

        # Build correct shippingDetails flat cost or free
        shipping_cost = float(item.get("shippingCost", 0))
        if shipping_cost > 0:
            shipping_details = {
                "shippingServiceOptions": {
                    "shippingType": "Fixed",
                    "shippingServiceCost": str(shipping_cost)
                }
            }
        else:
            shipping_details = {
                "shippingServiceOptions": {
                    "shippingType": "Free"
                }
            }

        bonanza_item = {
            "title": item["title"][:80],  # Bonanza title limit is 80 chars
            "description": item.get("description", ""),
            "price": float(item["price"]),
            "quantity": int(item.get("quantity", 1)),
            "pictureDetails": {
                "pictureURL": img_urls[:4],  # Bonanza supports up to 4 URLs
                "discardOld": True
            },
            "shippingDetails": shipping_details,
            "itemSpecifics": item_specifics,
            "allowForSale": True,
            "product_attributes": {
                "external_source_url": item.get("external_url", ""),
            }
        }

        if category_id:
            bonanza_item["primaryCategory"] = {"categoryId": category_id}

        payload = {"item": bonanza_item}
        return self._secure_request("addFixedPriceItem", payload)

    # ─── Revise / Update Item ─────────────────────────────────────────────

    def update_item(self, item_id: str, updates: dict) -> dict:
        """Update an existing Bonanza listing (reviseFixedPriceItem)."""
        item_data = {"itemId": item_id}
        if "title" in updates:
            item_data["title"] = updates["title"][:80]
        if "description" in updates:
            item_data["description"] = updates["description"]
        if "price" in updates:
            item_data["price"] = float(updates["price"])
        if "quantity" in updates:
            item_data["quantity"] = int(updates["quantity"])
            
        if "shippingCost" in updates:
            shipping_cost = float(updates["shippingCost"])
            if shipping_cost > 0:
                item_data["shippingDetails"] = {
                    "shippingServiceOptions": {
                        "shippingType": "Fixed",
                        "shippingServiceCost": str(shipping_cost)
                    }
                }
            else:
                item_data["shippingDetails"] = {
                    "shippingServiceOptions": {
                        "shippingType": "Free"
                    }
                }
                
        if "images" in updates:
            img_urls = updates["images"]
            if isinstance(img_urls, str):
                img_urls = [u.strip() for u in img_urls.split("|") if u.strip()]
            item_data["pictureDetails"] = {
                "pictureURL": img_urls[:4],
                "discardOld": True
            }

        payload = {"item": item_data}
        return self._secure_request("reviseFixedPriceItem", payload)

    # ─── Fetch Token ──────────────────────────────────────────────────────

    def fetch_token(self) -> dict:
        """Fetch a BonanzaAuthToken and validation URL (requires Dev Name + Cert Name)."""
        headers = self._headers()
        headers["X-BONANZLE-API-CERT-NAME"] = self.cert_name
        headers["Content-Type"] = "application/x-www-form-urlencoded;charset=UTF-8"
        headers["Accept"] = "application/json"
        
        import json
        form_data = {"fetchTokenRequest": json.dumps({})}
        
        logger.info("Bonanza API call: fetchToken")
        resp = self.client.post(SECURE_ENDPOINT, data=form_data, headers=headers)
        resp.raise_for_status()
        result = resp.json()
        resp_data = result.get("fetchTokenResponse", {})
        token = resp_data.get("authToken", "")
        auth_url = resp_data.get("authenticationURL", "")
        if token:
            self.auth_token = token
        return {"authToken": token, "authenticationURL": auth_url}

    def get_user_info(self) -> dict:
        """Fetch authenticated user info using getUser."""
        payload = {}
        return self._secure_request("getUser", payload)

    def close(self):
        self.client.close()
