import os
import logging
from datetime import datetime
from typing import Any

from fastapi import FastAPI, APIRouter, Request, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, or_

from db import (
    Base, engine, SessionLocal, get_db, init_db,
    ScanProfile, Opportunity, Listing, CashbackSite, Setting, ScanLog,
)
from bonanza_client import BonanzaClient
from scrapfly_client import ScrapflyClient, normalize_aliexpress_product
from profitability import (
    calculate_profitability, suggest_target_price, is_profitable,
    generate_listing_title, generate_listing_description,
    analyze_vendor_risk, suggest_optimal_price,
)

from api.profit_engine import run_7_stage_pipeline
from api.auth import router as auth_router
from api.ai_swarm import swarm_router

logger = logging.getLogger("bonanza_ds")
logging.basicConfig(level=logging.INFO)


# ─── Pydantic Models ──────────────────────────────────────────────────────────

class ScanProfileCreate(BaseModel):
    name: str
    source: str = "aliexpress"
    categories: str = ""
    min_price: float = 0.0
    max_price: float = 100.0
    min_monthly_sales: int = 50
    min_rating: float = 4.0
    min_orders: int = 10
    min_stock: int = 1
    detect_out_of_stock: bool = True
    min_margin_pct: float = 30.0
    bonanza_fee_pct: float = 20.0
    ship_to_country: str = "US"
    max_delivery_days: int = 30
    keywords: str = ""
    is_active: bool = True


class ScanProfileUpdate(BaseModel):
    name: str | None = None
    source: str | None = None
    categories: str | None = None
    min_price: float | None = None
    max_price: float | None = None
    min_monthly_sales: int | None = None
    min_rating: float | None = None
    min_orders: int | None = None
    min_stock: int | None = None
    detect_out_of_stock: bool | None = None
    min_margin_pct: float | None = None
    bonanza_fee_pct: float | None = None
    ship_to_country: str | None = None
    max_delivery_days: int | None = None
    keywords: str | None = None
    is_active: bool | None = None


class RunScanRequest(BaseModel):
    profile_id: int
    octoparse_task_id: str | None = None
    max_products: int = 100
    override_keyword: str | None = None
    min_price: float | None = None
    max_price: float | None = None
    min_rating: float | None = None
    min_orders: int | None = None

class TriggerScanRequest(BaseModel):
    algorithm: str
    max_credits: int = 50
    min_margin_pct: float = 30.0
    min_search_volume: int = 500
    assumed_ctr: float = 2.0
    assumed_conversion: float = 3.0
    target_urls: str = ""


class ImportToBonanzaRequest(BaseModel):
    opportunity_ids: list[int]
    auto_generate: bool = True
    push_to_bonanza: bool = True


class UpdateListingRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    price: float | None = None
    quantity: int | None = None
    shipping_cost: float | None = None
    images: str | None = None


class SettingUpdate(BaseModel):
    key: str
    value: str
    category: str = "general"
    description: str = ""


class CashbackSiteCreate(BaseModel):
    name: str
    url: str = ""
    default_rate: float = 0.0
    upfront_discount: float = 0.0
    supported_stores: str = ""
    is_active: bool = True
    notes: str = ""


def get_google_product_category(category: str) -> str:
    cat = (category or "").lower()
    if "surfboard" in cat or "efoil" in cat:
        return "3091"  # Active Sports > Water Sports > Surfing > Surfboards
    elif "boat" in cat or "watercraft" in cat:
        return "6093"  # Toys & Games > Toys > Radio Control Toys > Radio Control Boats & Watercraft
    elif "mower" in cat or "lawn" in cat:
        return "3506"  # Home & Garden > Lawn & Garden > Outdoor Power Equipment > Lawn Mowers
    elif "dive" in cat or "scuba" in cat or "tank" in cat:
        return "3080"  # Active Sports > Water Sports > Diving & Snorkeling > Scuba Tanks
    elif "sport" in cat or "water" in cat:
        return "3071"  # Active Sports > Water Sports Equipment
    elif "garden" in cat or "home" in cat:
        return "3237"  # Home & Garden > Lawn & Garden
    else:
        return "2097"  # Sporting Goods


# ─── App Factory ──────────────────────────────────────────────────────────────

def create_app(static_dir: str) -> FastAPI:
    global DB_INIT_ERROR
    DB_INIT_ERROR = None
    try:
        init_db()
        _seed_defaults()
    except Exception as e:
        import traceback
        DB_INIT_ERROR = traceback.format_exc()

    api = APIRouter()
    api.include_router(auth_router, prefix="/auth", tags=["Auth"])
    api.include_router(swarm_router, prefix="/scout", tags=["Scout"])

    @api.get("/debug-db")
    def debug_db():
        from db import _db_url
        safe_url = _db_url.split('@')[-1] if '@' in _db_url else _db_url
        return {"error": DB_INIT_ERROR, "db_url_host": safe_url}

    # ─── Health ────────────────────────────────────────────────────────────

    @api.get("/health")
    def health():
        return {"ok": True, "app": "Bonanza DS", "version": "0.1.0"}

    # ─── Dashboard Stats ───────────────────────────────────────────────────

    @api.get("/dashboard/stats")
    def dashboard_stats(db: Session = Depends(get_db)):
        today = datetime.utcnow().date()
        total_opps = db.query(Opportunity).count()
        opps_today = db.query(Opportunity).filter(
            func.date(Opportunity.created_at) == today
        ).count()
        avg_margin = db.query(func.avg(Opportunity.margin_pct)).filter(
            Opportunity.status == "new"
        ).scalar() or 0
        total_listed = db.query(Listing).filter(Listing.status == "listed").count()
        total_profiles = db.query(ScanProfile).filter(ScanProfile.is_active == True).count()
        recent_imports = db.query(Listing).order_by(desc(Listing.created_at)).limit(5).all()

        # Top categories
        cat_counts = db.query(
            Opportunity.category, func.count(Opportunity.id)
        ).filter(Opportunity.category != "").group_by(Opportunity.category).order_by(
            desc(func.count(Opportunity.id))
        ).limit(5).all()

        # Margin distribution
        margin_buckets = {"0-15%": 0, "15-30%": 0, "30-50%": 0, "50%+": 0}
        all_opps = db.query(Opportunity.margin_pct).filter(Opportunity.status == "new").all()
        for (m,) in all_opps:
            if m < 15:
                margin_buckets["0-15%"] += 1
            elif m < 30:
                margin_buckets["15-30%"] += 1
            elif m < 50:
                margin_buckets["30-50%"] += 1
            else:
                margin_buckets["50%+"] += 1

        return {
            "total_opportunities": total_opps,
            "opportunities_today": opps_today,
            "avg_margin": round(avg_margin, 2),
            "total_listed": total_listed,
            "active_profiles": total_profiles,
            "top_categories": [{"category": c, "count": n} for c, n in cat_counts if c],
            "margin_distribution": margin_buckets,
            "recent_imports": [_listing_dict(l) for l in recent_imports],
        }

    # ─── Scan Profiles ─────────────────────────────────────────────────────

    @api.get("/scan-profiles")
    def list_scan_profiles(db: Session = Depends(get_db)):
        profiles = db.query(ScanProfile).order_by(desc(ScanProfile.created_at)).all()
        return [_profile_dict(p) for p in profiles]

    @api.post("/scan-profiles")
    def create_scan_profile(profile: ScanProfileCreate, db: Session = Depends(get_db)):
        p = ScanProfile(**profile.model_dump())
        db.add(p)
        db.commit()
        db.refresh(p)
        return _profile_dict(p)

    @api.get("/scan-profiles/{profile_id}")
    def get_scan_profile(profile_id: int, db: Session = Depends(get_db)):
        p = db.query(ScanProfile).filter(ScanProfile.id == profile_id).first()
        if not p:
            raise HTTPException(404, "Scan profile not found")
        return _profile_dict(p)

    @api.put("/scan-profiles/{profile_id}")
    def update_scan_profile(profile_id: int, updates: ScanProfileUpdate, db: Session = Depends(get_db)):
        p = db.query(ScanProfile).filter(ScanProfile.id == profile_id).first()
        if not p:
            raise HTTPException(404, "Scan profile not found")
        for k, v in updates.model_dump(exclude_unset=True).items():
            setattr(p, k, v)
        db.commit()
        db.refresh(p)
        return _profile_dict(p)

    @api.delete("/scan-profiles/{profile_id}")
    def delete_scan_profile(profile_id: int, db: Session = Depends(get_db)):
        p = db.query(ScanProfile).filter(ScanProfile.id == profile_id).first()
        if not p:
            raise HTTPException(404, "Scan profile not found")
        db.delete(p)
        db.commit()
        return {"status": "deleted"}

    # ─── Run Scan ──────────────────────────────────────────────────────────

    @api.post("/run-scan")
    async def run_scan(req: RunScanRequest, db: Session = Depends(get_db)):
        """Trigger an AliExpress scan for the given profile and search keywords."""
        profile = db.query(ScanProfile).filter(ScanProfile.id == req.profile_id).first()
        if not profile:
            # Seed default profile if missing to prevent crash
            profile = ScanProfile(
                id=1,
                name="Default AliExpress Profile",
                source="aliexpress",
                keywords="surfboard, jetboat, lawn mower",
                categories="Sporting Goods, Home & Garden",
                min_price=10.0,
                max_price=10000.0,
                min_monthly_sales=1,
                min_rating=4.0,
                min_orders=1,
                min_stock=1,
                min_margin_pct=30.0,
                bonanza_fee_pct=20.0,
                ship_to_country="US",
                max_delivery_days=30,
                is_active=True
            )
            db.add(profile)
            db.commit()
            db.refresh(profile)

        # (Keywords are only on the profile)

        # Get Scrapfly API key from settings
        scrapfly_api_key = _get_setting(db, "scrapfly_api_key", "scp-live-19458fc009e04877be685a3f5b8ff8ca")
        
        keywords = profile.keywords.strip() if profile.keywords else "surfboard"
        
        # Create scan log
        scan_log = ScanLog(scan_profile_id=profile.id, status="running", started_at=datetime.utcnow())
        db.add(scan_log)
        db.commit()
        db.refresh(scan_log)

        # Intentionally removed: do not delete old un-imported opportunities so the user can save/keep them.

        if not scrapfly_api_key:
            raise HTTPException(400, "Scrapfly API Key is not configured. Go to Settings -> API Connections.")

        try:
            import os
            os.environ["SCRAPFLY_KEY"] = scrapfly_api_key
            from aliexpress_scraper.aliexpress import scrape_search

            # Just take the first keyword if multiple for simplicity or iterate. We'll use the first one.
            if req.override_keyword:
                keyword = req.override_keyword.strip()
            else:
                keyword = [k.strip() for k in keywords.split(",") if k.strip()][0] if keywords else "surfboard"
            url = f"https://www.aliexpress.com/w/wholesale-{keyword}.html"
            # Fetch global pricing settings
            pricing_model_setting = db.query(Setting).filter(Setting.key == "pricing_model").first()
            pricing_model = pricing_model_setting.value if pricing_model_setting else "flat"
            
            pricing_ranges_setting = db.query(Setting).filter(Setting.key == "pricing_ranges").first()
            pricing_ranges = []
            if pricing_ranges_setting and pricing_ranges_setting.value:
                try:
                    pricing_ranges = json.loads(pricing_ranges_setting.value)
                except Exception:
                    pass

            raw_products = await scrape_search(url, max_pages=3)

            opportunities_created = 0
            for raw in raw_products[:req.max_products]:
                product = normalize_aliexpress_product(raw)

                # Filter out images containing Chinese text (Temporarily Disabled per user request)
                # from profitability import filter_chinese_images
                # try:
                #     product["image_urls"] = filter_chinese_images(product["image_urls"])
                # except Exception as ex:
                #     logger.warning("Error filtering Chinese text from images: %s", ex)

                # Apply UI filters (falling back to permissive defaults if left blank by user)
                min_p = req.min_price if req.min_price is not None else 0.0
                max_p = req.max_price if req.max_price is not None else 99999.0
                min_r = req.min_rating if req.min_rating is not None else 0.0
                min_o = req.min_orders if req.min_orders is not None else 0

                if product["source_price"] < min_p or product["source_price"] > max_p:
                    continue
                if product["monthly_sales"] < min_o:
                    continue
                if product["rating"] < min_r:
                    continue
                if profile.detect_out_of_stock and product["stock"] < profile.min_stock:
                    continue

                # Find best cashback rate for this source
                cb_rate = _get_best_cashback_rate(db, product["source"])
                
                # Determine applicable margin based on pricing model
                applicable_margin = profile.min_margin_pct
                if pricing_model == "tiered" and pricing_ranges:
                    cost = product["source_price"]
                    for r in pricing_ranges:
                        if r.get("min", 0) <= cost <= r.get("max", 99999):
                            applicable_margin = float(r.get("margin", applicable_margin))
                            break

                target_price = suggest_target_price(
                    product["source_price"], product["shipping_cost"],
                    profile.bonanza_fee_pct, applicable_margin, cb_rate
                )
                
                metrics = calculate_profitability(
                    product["source_price"], product["shipping_cost"],
                    target_price, profile.bonanza_fee_pct, cb_rate
                )

                # if not is_profitable(metrics, profile.min_margin_pct):
                #     continue

                # Find best cashback site
                best_cb = _get_best_cashback_site(db, product["source"])

                opp = Opportunity(
                    origin="manual_scout",
                    scan_profile_id=profile.id,
                    source=product["source"],
                    source_url=product["source_url"],
                    source_product_id=product["source_product_id"],
                    title=product["title"],
                    description=product["description"],
                    image_urls="|".join(product["image_urls"]),
                    category=product["category"],
                    source_price=product["source_price"],
                    shipping_cost=product["shipping_cost"],
                    target_price=target_price,
                    monthly_sales=product["monthly_sales"],
                    rating=product["rating"],
                    review_count=product["review_count"],
                    stock=product["stock"],
                    seller_name=product["seller_name"],
                    seller_rating=product["seller_rating"],
                    seller_years=product["seller_years"],
                    margin_pct=metrics["margin_pct"],
                    cashback_rate=cb_rate,
                    cashback_amount=metrics["cashback_amount"],
                    final_profit=metrics["final_profit"],
                    final_margin_pct=metrics["final_margin_pct"],
                    best_cashback_site=best_cb["name"] if best_cb else "",
                    status="new",
                )
                db.add(opp)
                opportunities_created += 1

            db.commit()

            # Update profile and scan log
            profile.last_scan_at = datetime.utcnow()
            scan_log.status = "completed"
            scan_log.products_found = len(raw_products)
            scan_log.opportunities_created = opportunities_created
            scan_log.completed_at = datetime.utcnow()
            db.commit()

            return {
                "status": "completed",
                "products_scanned": len(raw_products),
                "opportunities_created": opportunities_created,
                "scan_log_id": scan_log.id
            }

        except Exception as e:
            import traceback
            trace = traceback.format_exc()
            logger.error(f"run-scan error: {trace}")
            scan_log.status = "failed"
            scan_log.error_message = str(e)
            scan_log.completed_at = datetime.utcnow()
            db.commit()
            raise HTTPException(500, trace)

    @api.post("/scans/trigger")
    async def trigger_scan(req: TriggerScanRequest, db: Session = Depends(get_db)):
        # Execute the 7-stage math engine
        res = await run_7_stage_pipeline(
            db=db,
            user_id=1, # Admin user ID for now
            algorithm=req.algorithm,
            target_urls=req.target_urls,
            min_margin_pct=req.min_margin_pct,
            min_search_volume=req.min_search_volume,
            assumed_ctr=req.assumed_ctr,
            assumed_conversion=req.assumed_conversion,
            max_credits=req.max_credits
        )
        return res

    # ─── Opportunities ─────────────────────────────────────────────────────

    @api.get("/opportunities")
    def list_opportunities(
        status: str | None = None,
        source: str | None = None,
        min_margin: float | None = None,
        category: str | None = None,
        limit: int = 100,
        offset: int = 0,
        db: Session = Depends(get_db),
    ):
        q = db.query(Opportunity).filter(Opportunity.origin == 'automation_engine')
        if status:
            q = q.filter(Opportunity.status == status)
        if source:
            q = q.filter(Opportunity.source == source)
        if min_margin is not None:
            q = q.filter(Opportunity.margin_pct >= min_margin)
        if category:
            q = q.filter(Opportunity.category.ilike(f"%{category}%"))
        total = q.count()
        items = q.order_by(desc(Opportunity.margin_pct)).offset(offset).limit(limit).all()
        return {"items": [_opp_dict(o) for o in items], "total": total}

    @api.get("/scan-results")
    def list_scan_results(
        status: str | None = None,
        source: str | None = None,
        min_margin: float | None = None,
        limit: int = 100,
        offset: int = 0,
        db: Session = Depends(get_db),
    ):
        q = db.query(Opportunity).filter(Opportunity.origin == 'manual_scout')
        if status:
            q = q.filter(Opportunity.status == status)
        if source:
            q = q.filter(Opportunity.source == source)
        if min_margin is not None:
            q = q.filter(Opportunity.margin_pct >= min_margin)
        total = q.count()
        items = q.order_by(desc(Opportunity.margin_pct)).offset(offset).limit(limit).all()
        return {"items": [_opp_dict(o) for o in items], "total": total}

    @api.get("/opportunities/{opp_id}")
    def get_opportunity(opp_id: int, db: Session = Depends(get_db)):
        o = db.query(Opportunity).filter(Opportunity.id == opp_id).first()
        if not o:
            raise HTTPException(404, "Opportunity not found")
        result = _opp_dict(o)
        # Add vendor risk analysis
        try:
            result["vendor_analysis"] = analyze_vendor_risk({
                "seller_name": o.seller_name,
                "seller_rating": o.seller_rating,
                "seller_years": o.seller_years,
                "rating": o.rating,
                "monthly_sales": o.monthly_sales,
                "review_count": o.review_count,
                "stock": o.stock,
            })
        except Exception as e:
            logger.error(f"Vendor risk analysis failed: {e}")
            result["vendor_analysis"] = None
        return result

    @api.put("/opportunities/{opp_id}/status")
    def update_opportunity_status(opp_id: int, status: str, db: Session = Depends(get_db)):
        o = db.query(Opportunity).filter(Opportunity.id == opp_id).first()
        if not o:
            raise HTTPException(404, "Opportunity not found")
        o.status = status
        o.updated_at = datetime.utcnow()
        db.commit()
        return _opp_dict(o)

    @api.post("/opportunities/{opp_id}/generate-ai")
    def generate_ai_content(opp_id: int, db: Session = Depends(get_db)):
        """Use AI to generate optimized title and description for an opportunity."""
        o = db.query(Opportunity).filter(Opportunity.id == opp_id).first()
        if not o:
            raise HTTPException(404, "Opportunity not found")

        product_data = {
            "title": o.title,
            "category": o.category,
            "source": o.source,
            "source_price": o.source_price,
            "description": o.description,
            "image_urls": o.image_urls.split("|") if o.image_urls else [],
            "rating": o.rating,
            "monthly_sales": o.monthly_sales,
            "seller_name": o.seller_name,
        }

        try:
            ai_title = generate_listing_title(product_data)
            ai_desc = generate_listing_description(product_data, o.target_price)
            o.ai_title = ai_title
            o.ai_description = ai_desc
            o.updated_at = datetime.utcnow()
            db.commit()
            return {"ai_title": ai_title, "ai_description": ai_desc}
        except Exception as e:
            raise HTTPException(500, f"AI generation failed: {str(e)}")

    @api.post("/opportunities/{opp_id}/suggest-price")
    def suggest_price(opp_id: int, db: Session = Depends(get_db)):
        """Use AI to suggest an optimal selling price."""
        o = db.query(Opportunity).filter(Opportunity.id == opp_id).first()
        if not o:
            raise HTTPException(404, "Opportunity not found")
        try:
            optimal = suggest_optimal_price(
                {"title": o.title, "rating": o.rating, "monthly_sales": o.monthly_sales},
                o.source_price, o.shipping_cost,
                _get_setting(db, "default_bonanza_fee", "20", float),
            )
            # Recalculate metrics with new price
            cb_rate = o.cashback_rate
            fee_pct = _get_setting(db, "default_bonanza_fee", "20", float)
            metrics = calculate_profitability(o.source_price, o.shipping_cost, optimal, fee_pct, cb_rate)
            o.target_price = optimal
            o.margin_pct = metrics["margin_pct"]
            o.cashback_amount = metrics["cashback_amount"]
            o.final_profit = metrics["final_profit"]
            o.final_margin_pct = metrics["final_margin_pct"]
            o.updated_at = datetime.utcnow()
            db.commit()
            return {"suggested_price": optimal, "metrics": metrics}
        except Exception as e:
            raise HTTPException(500, f"Price suggestion failed: {str(e)}")
    @api.post("/import/walmart")
    async def import_walmart_webhook(req: Request, bg_tasks: BackgroundTasks, db: Session = Depends(get_db)):
        try:
            payload = await req.json()
        except Exception as e:
            raise HTTPException(400, f"Invalid JSON payload: {str(e)}")

        if isinstance(payload, list):
            raw_products = payload
        elif isinstance(payload, dict):
            if "data" in payload and isinstance(payload["data"], list):
                raw_products = payload["data"]
            else:
                raw_products = [payload]
        else:
            raise HTTPException(400, "Payload must be a JSON object or list of objects")

        imported_count = 0
        updated_count = 0
        processed_ids = []

        for item in raw_products:
            title = item.get("Product Name") or item.get("title") or item.get("name") or item.get("product_name")
            if not title:
                continue

            source_product_id = item.get("itemId") or item.get("id") or item.get("productId") or item.get("product_id") or item.get("sku") or item.get("source_product_id")
            source_url = item.get("Product URL") or item.get("url") or item.get("productUrl") or item.get("product_url") or item.get("link") or item.get("source_url") or ""
            
            if not source_product_id and source_url:
                import re
                match = re.search(r"/ip/(?:[^/]+/)?(\d+)", source_url)
                if match:
                    source_product_id = match.group(1)

            if not source_product_id:
                import hashlib
                source_product_id = hashlib.md5(title.encode('utf-8')).hexdigest()[:12]

            raw_price = item.get("Product Price") or item.get("Price") or item.get("price") or item.get("sale_price") or item.get("final_price") or item.get("price_active") or item.get("discount_price") or item.get("source_price") or 0.0
            if isinstance(raw_price, str):
                import re
                try:
                    m = re.search(r"([0-9]+(?:\.[0-9]+)?)", raw_price.replace(",", ""))
                    source_price = float(m.group(1)) if m else 0.0
                except:
                    source_price = 0.0
            else:
                source_price = float(raw_price)

            orig_price = item.get("Product Price Before Discount") or item.get("original_price") or item.get("price_before_discount") or item.get("price_original") or ""
            savings = item.get("Product Savings") or item.get("savings") or item.get("discount_amount") or ""
            discount_info_str = ""
            if orig_price:
                discount_info_str += f"Original: {orig_price} "
            if savings:
                discount_info_str += f"({savings})"
            discount_info_str = discount_info_str.strip()

            raw_shipping = item.get("shipping") or item.get("shipping_cost") or item.get("shipping_price") or 0.0
            if isinstance(raw_shipping, str):
                import re
                try:
                    m = re.search(r"([0-9]+(?:\.[0-9]+)?)", raw_shipping.replace(",", ""))
                    shipping_cost = float(m.group(1)) if m else 0.0
                except:
                    shipping_cost = 0.0
            else:
                shipping_cost = float(raw_shipping)

            raw_stock = item.get("stock") or item.get("quantity") or item.get("availability") or item.get("Product Availability") or item.get("stock_status") or 10
            stock = 10
            if isinstance(raw_stock, str):
                if "out" in raw_stock.lower():
                    stock = 0
                else:
                    import re
                    m = re.search(r"(\d+)", raw_stock)
                    stock = int(m.group(1)) if m else 10
            elif isinstance(raw_stock, (int, float)):
                stock = int(raw_stock)

            raw_images = item.get("All Images") or item.get("Product Image") or item.get("images") or item.get("image_urls") or item.get("image") or item.get("imageUrl") or item.get("main_image") or ""
            if isinstance(raw_images, list):
                image_urls = "|".join(raw_images)
            else:
                image_urls = str(raw_images)

            brand = item.get("Product Brand") or item.get("brand") or item.get("brandName") or item.get("brand_name") or ""
            brand_lower = brand.strip().lower()
            if not brand or brand_lower in ["no brand name", "not branded", "unbranded", "generic", "none", "n/a", "no brand", "brand not available", "not available"]:
                brand = "Unbranded"
            else:
                brand = brand.strip()

            upc = item.get("UPC") or item.get("upc") or item.get("barcode") or item.get("gtin") or "brand not available"

            rating = float(item.get("Product Rating") or item.get("rating") or item.get("reviews_rating") or item.get("rating_average") or 0.0)
            review_count = int(item.get("Product Reviews") or item.get("review_count") or item.get("reviews_count") or 0)
            seller_name = item.get("Product Seller") or item.get("seller_name") or item.get("sold_by") or item.get("seller") or ""

            opp = db.query(Opportunity).filter(
                Opportunity.source_product_id == str(source_product_id),
                Opportunity.source == "walmart"
            ).first()

            min_margin = _get_setting(db, "default_min_margin", "30.0", float)
            bonanza_fee = _get_setting(db, "bonanza_google_fee", "20.0", float)
            
            margin_factor = 1.0 - (bonanza_fee / 100.0) - (min_margin / 100.0)
            if margin_factor > 0.1:
                target_price = round((source_price + shipping_cost) / margin_factor, 2)
            else:
                target_price = round((source_price + shipping_cost) * 1.5, 2)

            profit = target_price - source_price - shipping_cost - (target_price * (bonanza_fee / 100.0))

            if opp:
                opp.title = title
                opp.source_price = source_price
                opp.shipping_cost = shipping_cost
                opp.stock = stock
                opp.image_urls = image_urls
                opp.target_price = target_price
                opp.margin_pct = min_margin
                opp.final_profit = profit
                opp.final_margin_pct = min_margin
                opp.brand = brand
                opp.upc = upc
                opp.discount_info = discount_info_str
                opp.rating = rating
                opp.review_count = review_count
                opp.seller_name = seller_name
                opp.updated_at = datetime.utcnow()
                opp.status = "new"  # Re-evaluate it when rescanned
                db.flush()
                processed_ids.append(opp.id)
                updated_count += 1
            else:
                opp = Opportunity(
                    origin="manual_scout",
                    source="walmart",
                    source_url=source_url,
                    source_product_id=str(source_product_id),
                    title=title,
                    description=item.get("description") or item.get("product_description") or "",
                    image_urls=image_urls,
                    category=item.get("category") or item.get("Product Category") or "General",
                    source_price=source_price,
                    shipping_cost=shipping_cost,
                    target_price=target_price,
                    stock=stock,
                    margin_pct=min_margin,
                    final_profit=profit,
                    final_margin_pct=min_margin,
                    brand=brand,
                    upc=upc,
                    discount_info=discount_info_str,
                    rating=rating,
                    review_count=review_count,
                    seller_name=seller_name,
                    status="new",
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.add(opp)
                db.flush()
                processed_ids.append(opp.id)
                imported_count += 1

        try:
            db.commit()
        except Exception as e:
            db.rollback()
            import traceback
            tb = traceback.format_exc()
            logger.error(f"Webhook database commit failed: {tb}")
            raise HTTPException(500, detail={"error": str(e), "traceback": tb})

        # Trigger DataForSEO filter pipeline in the background
        if processed_ids:
            bg_tasks.add_task(run_dataforseo_filter_pipeline, processed_ids)

        return {
            "status": "success",
            "imported": imported_count,
            "updated": updated_count,
            "message": f"Successfully processed {imported_count + updated_count} products. Background filtering triggered."
        }

    @api.post("/scraper/trigger")
    async def trigger_simplescraper(db: Session = Depends(get_db)):
        """
        Triggers the SimpleScraper recipe via API call.
        """
        api_key = _get_setting(db, "simplescraper_api_key", "9ap9UBd2RdcUtoxdQPyzxWtHW0nPqPKw")
        recipe_id = _get_setting(db, "simplescraper_recipe_id", "4A05LweHYHLr997QKNO3")
        
        url = f"https://api.simplescraper.io/v1/recipes/{recipe_id}/run"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "runAsync": True
        }
        
        import httpx
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                logger.info(f"Triggering SimpleScraper recipe {recipe_id} asynchronously...")
                res = await client.post(url, headers=headers, json=payload)
                res.raise_for_status()
                res_data = res.json()
                return {
                    "status": "success", 
                    "message": "Cloud scraper triggered successfully! Products will appear in Scan Results shortly.", 
                    "data": res_data
                }
            except Exception as e:
                logger.error(f"Failed to trigger SimpleScraper: {e}")
                raise HTTPException(500, f"Scraper trigger failed: {str(e)}")

    # ─── Import to Bonanza ─────────────────────────────────────────────────

    @api.post("/import-to-bonanza")
    def import_to_bonanza(req: ImportToBonanzaRequest, db: Session = Depends(get_db)):
        """Import selected opportunities as Bonanza listings."""
        results = []
        bonanza = BonanzaClient(
            dev_name=_get_setting(db, "bonanza_developer_name"),
            cert_name=_get_setting(db, "bonanza_certification_name"),
            auth_token=_get_setting(db, "bonanza_auth_token"),
        )

        for opp_id in req.opportunity_ids:
            o = db.query(Opportunity).filter(Opportunity.id == opp_id).first()
            if not o:
                results.append({"opportunity_id": opp_id, "status": "error", "message": "Not found"})
                continue

            # Generate AI content if requested and not already done
            title = o.ai_title or o.title
            description = o.ai_description or o.description
            if req.auto_generate and not o.ai_title:
                try:
                    product_data = {
                        "title": o.title, "category": o.category, "source": o.source,
                        "source_price": o.source_price, "description": o.description,
                        "image_urls": o.image_urls.split("|") if o.image_urls else [],
                        "rating": o.rating, "monthly_sales": o.monthly_sales,
                        "seller_name": o.seller_name,
                    }
                    title = generate_listing_title(product_data)
                    description = generate_listing_description(product_data, o.target_price)
                    o.ai_title = title
                    o.ai_description = description
                except Exception as e:
                    logger.warning("AI generation failed for opp %s: %s", opp_id, e)

            images = o.image_urls.split("|") if o.image_urls else []

            # Create listing record
            gpc = get_google_product_category(o.category)
            mpn_val = f"MPN-{o.source_product_id}" if o.source_product_id else "does not apply"
            listing = Listing(
                opportunity_id=o.id,
                title=title,
                description=description,
                price=o.target_price,
                quantity=min(o.stock, 10) if o.stock > 0 else 1,
                category=o.category,
                shipping_cost=o.shipping_cost,
                image_urls=o.image_urls,
                external_url=o.source_url,
                brand="brand not available",
                upc="brand not available",
                mpn=mpn_val,
                identifier_exists=False,
                google_product_category=gpc,
                condition="new",
                status="pending",
            )
            db.add(listing)
            db.commit()
            db.refresh(listing)

            if req.push_to_bonanza:
                # Send to Bonanza
                try:
                    item_data = {
                        "title": title,
                        "description": description,
                        "price": o.target_price,
                        "quantity": listing.quantity,
                        "category": o.category,
                        "shippingCost": o.shipping_cost,
                        "images": images,
                        "brand": "brand not available",
                        "upc": "brand not available",
                        "mpn": mpn_val,
                        "identifier_exists": False,
                        "google_product_category": gpc,
                        "condition": "new",
                        "external_url": o.source_url,
                    }
                    resp = bonanza.add_multiple_fixed_price_items([item_data])
                    listing.bonanza_response = str(resp)
                    listing.status = "listed"

                    # Extract Bonanza item ID from response
                    items_resp = resp.get("addFixedPriceItemResponse", {}).get("items", [])
                    if items_resp:
                        listing.bonanza_item_id = str(items_resp[0].get("itemId", ""))

                    o.status = "imported"
                    results.append({
                        "opportunity_id": opp_id,
                        "listing_id": listing.id,
                        "status": "listed",
                        "bonanza_item_id": listing.bonanza_item_id,
                    })
                except Exception as e:
                    listing.status = "failed"
                    listing.bonanza_response = str(e)
                    results.append({
                        "opportunity_id": opp_id,
                        "listing_id": listing.id,
                        "status": "failed",
                        "message": str(e),
                    })
            else:
                o.status = "approved"
                results.append({
                    "opportunity_id": opp_id,
                    "listing_id": listing.id,
                    "status": "pending",
                })

            listing.updated_at = datetime.utcnow()
            o.updated_at = datetime.utcnow()
            db.commit()

        bonanza.close()
        return {"results": results}

    # ─── Listings ──────────────────────────────────────────────────────────

    @api.get("/listings")
    def list_listings(status: str | None = None, limit: int = 100, db: Session = Depends(get_db)):
        q = db.query(Listing)
        if status:
            q = q.filter(Listing.status == status)
        items = q.order_by(desc(Listing.created_at)).limit(limit).all()
        return [_listing_dict(l) for l in items]

    @api.get("/listings/{listing_id}")
    def get_listing(listing_id: int, db: Session = Depends(get_db)):
        l = db.query(Listing).filter(Listing.id == listing_id).first()
        if not l:
            raise HTTPException(404, "Listing not found")
        return _listing_dict(l)

    @api.put("/listings/{listing_id}")
    def update_listing(listing_id: int, req: UpdateListingRequest, db: Session = Depends(get_db)):
        l = db.query(Listing).filter(Listing.id == listing_id).first()
        if not l:
            raise HTTPException(404, "Listing not found")

        updates = req.model_dump(exclude_unset=True)
        for k, v in updates.items():
            if k == "images":
                l.image_urls = v
            elif k == "shipping_cost":
                l.shipping_cost = v
            elif hasattr(l, k):
                setattr(l, k, v)

        # Push update to Bonanza if it has an item ID
        if l.bonanza_item_id:
            try:
                bonanza = BonanzaClient(
                    dev_name=_get_setting(db, "bonanza_developer_name"),
                    cert_name=_get_setting(db, "bonanza_certification_name"),
                    auth_token=_get_setting(db, "bonanza_auth_token"),
                )
                bonanza.update_item(l.bonanza_item_id, updates)
                l.status = "updated"
                bonanza.close()
            except Exception as e:
                logger.error("Bonanza update failed: %s", e)

        l.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(l)
        return _listing_dict(l)

    @api.delete("/listings/{listing_id}")
    def delete_listing(listing_id: int, db: Session = Depends(get_db)):
        l = db.query(Listing).filter(Listing.id == listing_id).first()
        if not l:
            raise HTTPException(404, "Listing not found")
        db.delete(l)
        db.commit()
        return {"status": "deleted"}

    # ─── Cashback ──────────────────────────────────────────────────────────

    @api.get("/cashback")
    def list_cashback_sites(db: Session = Depends(get_db)):
        sites = db.query(CashbackSite).filter(CashbackSite.is_active == True).order_by(desc(CashbackSite.default_rate)).all()
        return [_cashback_dict(s) for s in sites]

    @api.post("/cashback")
    def create_cashback_site(site: CashbackSiteCreate, db: Session = Depends(get_db)):
        s = CashbackSite(**site.model_dump())
        db.add(s)
        db.commit()
        db.refresh(s)
        return _cashback_dict(s)

    @api.put("/cashback/{site_id}")
    def update_cashback_site(site_id: int, site: CashbackSiteCreate, db: Session = Depends(get_db)):
        s = db.query(CashbackSite).filter(CashbackSite.id == site_id).first()
        if not s:
            raise HTTPException(404, "Cashback site not found")
        for k, v in site.model_dump().items():
            setattr(s, k, v)
        db.commit()
        db.refresh(s)
        return _cashback_dict(s)

    @api.delete("/cashback/{site_id}")
    def delete_cashback_site(site_id: int, db: Session = Depends(get_db)):
        s = db.query(CashbackSite).filter(CashbackSite.id == site_id).first()
        if not s:
            raise HTTPException(404, "Cashback site not found")
        db.delete(s)
        db.commit()
        return {"status": "deleted"}

    @api.get("/cashback/best/{source}")
    def get_best_cashback(source: str, db: Session = Depends(get_db)):
        """Get the best cashback option for a given source marketplace."""
        site = _get_best_cashback_site(db, source)
        if not site:
            return {"name": "", "rate": 0, "upfront_discount": 0}
        return _cashback_dict(site)

    # ─── Settings ──────────────────────────────────────────────────────────

    @api.get("/account/usage")
    def get_account_usage(db: Session = Depends(get_db)):
        """Fetch actual usage metrics for the Account settings page."""
        scans_count = db.query(ScanLog).count()
        listings_count = db.query(Listing).count()
        ai_opps_count = db.query(Opportunity).filter(Opportunity.ai_title != "").count()
        return {
            "scans_run": scans_count,
            "listings_created": listings_count,
            "ai_generations": ai_opps_count,
        }

    @api.get("/settings")
    def list_settings(db: Session = Depends(get_db)):
        settings = db.query(Setting).all()
        return {s.key: {"value": s.value, "category": s.category, "description": s.description} for s in settings}

    @api.put("/settings")
    def update_setting(req: SettingUpdate, db: Session = Depends(get_db)):
        s = db.query(Setting).filter(Setting.key == req.key).first()
        if s:
            s.value = req.value
            s.category = req.category
            s.description = req.description
            s.updated_at = datetime.utcnow()
        else:
            s = Setting(key=req.key, value=req.value, category=req.category, description=req.description)
            db.add(s)
        db.commit()
        return {"status": "updated", "key": req.key}

    # ─── Scan Logs ─────────────────────────────────────────────────────────

    @api.get("/scan-logs")
    def list_scan_logs(limit: int = 20, db: Session = Depends(get_db)):
        logs = db.query(ScanLog).order_by(desc(ScanLog.started_at)).limit(limit).all()
        return [_scanlog_dict(l) for l in logs]

    # ─── Admin ─────────────────────────────────────────────────────────────

    @api.get("/admin/stats")
    def admin_stats(db: Session = Depends(get_db)):
        total_profiles = db.query(ScanProfile).count()
        total_opps = db.query(Opportunity).count()
        total_listings = db.query(Listing).count()
        total_scans = db.query(ScanLog).count()
        successful_scans = db.query(ScanLog).filter(ScanLog.status == "completed").count()

        # Recent scan activity
        recent_logs = db.query(ScanLog).order_by(desc(ScanLog.started_at)).limit(10).all()

        # Listings by status
        status_counts = db.query(
            Listing.status, func.count(Listing.id)
        ).group_by(Listing.status).all()

        # Opportunities by status
        opp_status_counts = db.query(
            Opportunity.status, func.count(Opportunity.id)
        ).group_by(Opportunity.status).all()

        return {
            "total_scan_profiles": total_profiles,
            "total_opportunities": total_opps,
            "total_listings": total_listings,
            "total_scans": total_scans,
            "successful_scans": successful_scans,
            "scan_success_rate": round(successful_scans / total_scans * 100, 1) if total_scans > 0 else 0,
            "recent_scans": [_scanlog_dict(l) for l in recent_logs],
            "listings_by_status": {s: n for s, n in status_counts},
            "opportunities_by_status": {s: n for s, n in opp_status_counts},
        }

    @api.post("/scout/chat")
    async def ai_scout_chat(req: Request, db: Session = Depends(get_db)):
        data = await req.json()
        messages = data.get("messages", [])
        
        try:
            import os, re, json
            from mcp.client.sse import sse_client
            from mcp.client.session import ClientSession
            from google import genai
            from google.genai import types
            
            client = genai.Client(
                api_key=os.environ.get("GEMINI_WORKSHOP_API_KEY"),
                http_options={
                    "api_version": "v1alpha",
                    "base_url": os.environ.get("GEMINI_WORKSHOP_BASE_URL"),
                },
            )
            
            gemini_history = []
            system_instruction = types.Content(role="user", parts=[types.Part.from_text(
                "You are an AI Swarm Agent. You MUST use your provided tools to search ShopSavvy. "
                "When you find products, you MUST output them in a JSON array wrapped in ```json ... ``` "
                "matching exactly this schema: id (int), title (str), image (url str), sourceSite (str), sourceUrl (str), "
                "buyRegPrice (str format $X.XX), buyDiscountPrice (str format $X.XX), discountAmount (str), "
                "googleLowPrice (str), googleAvgPrice (str), googleHighPrice (str), profitLow (str), marginLow (str), "
                "profitAvg (str), marginAvg (str), status (str 'Verified')."
            )])
            gemini_history.append(system_instruction)
            
            for m in messages:
                role = "user" if m.get("role") in ["user", "system"] else "model"
                gemini_history.append(types.Content(role=role, parts=[types.Part.from_text(m.get("content", "") or " ")]))
            
            async with sse_client("https://api.shopsavvy.com/mcp/sse") as streams:
                async with ClientSession(streams[0], streams[1]) as mcp_session:
                    await mcp_session.initialize()
                    
                    shopsavvy_tools = await mcp_session.list_tools()
                    
                    gemini_tools = []
                    for t in shopsavvy_tools.tools:
                        gemini_tools.append(types.Tool(
                            function_declarations=[
                                types.FunctionDeclaration(
                                    name=t.name,
                                    description=t.description,
                                    parameters=t.inputSchema
                                )
                            ]
                        ))
                    
                    response = client.models.generate_content(
                        model='gemini-2.5-flash',
                        contents=gemini_history,
                        config=types.GenerateContentConfig(
                            tools=gemini_tools,
                            temperature=0.0
                        )
                    )
                    
                    if response.function_calls:
                        call = response.function_calls[0]
                        tool_name = call.name
                        args = dict(call.args) if call.args else {}
                        
                        mcp_result = await mcp_session.call_tool(tool_name, arguments=args)
                        tool_result_text = "\n".join(c.text for c in mcp_result.content if getattr(c, "type", "") == "text")
                        
                        gemini_history.append(response.candidates[0].content)
                        gemini_history.append(
                            types.Content(role="user", parts=[
                                types.Part.from_function_response(
                                    name=tool_name,
                                    response={"result": tool_result_text}
                                ),
                                types.Part.from_text("Present the findings conversationally. ALSO, you MUST include a JSON array in your response wrapped in ```json ... ``` with the products you found, matching exactly this schema for each product: id (int), title (str), image (url str), sourceSite (str), sourceUrl (str), buyRegPrice (str format $X.XX), buyDiscountPrice (str format $X.XX), discountAmount (str), googleLowPrice (str), googleAvgPrice (str), googleHighPrice (str), profitLow (str), marginLow (str), profitAvg (str), marginAvg (str), status (str 'Verified').")
                            ])
                        )
                        
                        final_response = client.models.generate_content(
                            model='gemini-2.5-flash',
                            contents=gemini_history,
                        )
                        
                        resp_text = final_response.text
                        results = []
                        match = re.search(r"```json\s*(.*?)\s*```", resp_text, re.DOTALL)
                        if match:
                            try:
                                results = json.loads(match.group(1))
                                resp_text = re.sub(r"```json\s*(.*?)\s*```", "", resp_text, flags=re.DOTALL).strip()
                            except Exception as e:
                                logger.error(f"Failed to parse JSON from AI: {e}")
                                
                        return {"response": resp_text, "results": results}
                    else:
                        return {"response": response.text, "results": []}
                        
        except Exception as e:
            logger.error(f"Error in AI Scout Chat: {e}")
            return {"response": f"AI Error: {str(e)}", "results": []}

    @api.post("/opportunities")
    async def create_opportunity(req: Request, db: Session = Depends(get_db)):
        try:
            data = await req.json()
            opp = Opportunity(
                title=data.get("title", "Unknown"),
                source="shopsavvy",
                source_price=data.get("source_price", 0.0),
                margin_pct=data.get("margin_pct", 0.0),
                source_url=data.get("source_url", ""),
                image_urls=data.get("image_url", ""),
                origin=data.get("origin", "ai_swarm")
            )
            db.add(opp)
            db.commit()
            return {"status": "success", "id": opp.id}
        except Exception as e:
            logger.error(f"Error creating opportunity: {e}")
            return {"status": "error", "message": str(e)}

    # ─── Bonanza Booth Items ───────────────────────────────────────────────

    @api.get("/bonanza/booth-items")
    def get_bonanza_items(page_size: int = 50, page_number: int = 1, db: Session = Depends(get_db)):
        """Fetch items from the user's Bonanza booth."""
        try:
            bonanza = BonanzaClient(
                dev_name=_get_setting(db, "bonanza_developer_name"),
                cert_name=_get_setting(db, "bonanza_certification_name"),
                auth_token=_get_setting(db, "bonanza_auth_token"),
            )
            result = bonanza.get_booth_items(page_size=page_size, page_number=page_number)
            bonanza.close()
            return result
        except Exception as e:
            logger.warning("Bonanza getBoothItems failed: %s. Returning empty response.", e)
            return {"getBoothItemsResponse": {"ack": "Success", "items": []}}

    @api.post("/bonanza/fetch-token")
    def fetch_bonanza_token(db: Session = Depends(get_db)):
        """Use Developer ID + Cert ID to fetch a Bonanza auth token automatically."""
        dev_name = _get_setting(db, "bonanza_developer_name")
        cert_name = _get_setting(db, "bonanza_certification_name")
        if not dev_name or not cert_name:
            raise HTTPException(400, "Enter and save your Bonanza Developer ID and Certification ID first.")
        try:
            bonanza = BonanzaClient(dev_name=dev_name, cert_name=cert_name, auth_token="")
            res = bonanza.fetch_token()
            bonanza.close()
            token = res.get("authToken", "")
            auth_url = res.get("authenticationURL", "")
            if not token:
                raise HTTPException(500, "Bonanza returned an empty token. Check your credentials.")
            # Save the token to settings automatically
            s = db.query(Setting).filter(Setting.key == "bonanza_auth_token").first()
            if s:
                s.value = token
                s.updated_at = datetime.utcnow()
            else:
                db.add(Setting(key="bonanza_auth_token", value=token, category="integration",
                               description="Bonanza API auth token (auto-fetched)"))
            db.commit()
            return {
                "status": "ok",
                "token": token[:8] + "..." + token[-4:] if len(token) > 12 else token,
                "authenticationURL": auth_url
            }
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(500, f"Token fetch failed: {str(e)}")

    @api.post("/bonanza/test-connection")
    def test_bonanza_connection(db: Session = Depends(get_db)):
        """Test the Bonanza API connection using getUser."""
        try:
            bonanza = BonanzaClient(
                dev_name=_get_setting(db, "bonanza_developer_name"),
                cert_name=_get_setting(db, "bonanza_certification_name"),
                auth_token=_get_setting(db, "bonanza_auth_token"),
            )
            result = bonanza.get_user_info()
            bonanza.close()
            return {"status": "connected", "data": result}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @api.post("/octoparse/test-connection")
    def test_octoparse_connection(db: Session = Depends(get_db)):
        """Test the Octoparse API connection."""
        api_key = _get_setting(db, "octoparse_api_key", "")
        if not api_key:
            return {"status": "error", "message": "Save Octoparse API key first"}
        try:
            octo = OctoparseClient(api_key=api_key)
            result = octo.get_tasks()
            octo.close()
            return {"status": "connected", "message": f"Successfully connected! Found {len(result)} tasks."}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @api.get("/octoparse/tasks")
    def get_octoparse_tasks(db: Session = Depends(get_db)):
        """Get all tasks from the user's Octoparse account."""
        api_key = _get_setting(db, "octoparse_api_key", "")
        if not api_key:
            raise HTTPException(400, "Enter and save your Octoparse API key first.")
        try:
            octo = OctoparseClient(api_key=api_key)
            tasks = octo.get_tasks()
            octo.close()
            return tasks
        except Exception as e:
            raise HTTPException(500, f"Failed to list tasks: {str(e)}")
            return {"status": "error", "message": str(e)}

    # ─── Assemble App ──────────────────────────────────────────────────────

    app = FastAPI(title="Bonanza DS API", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(api, prefix="/api")

    if os.path.isdir(static_dir):
        assets_dir = os.path.join(static_dir, "assets")
        if os.path.isdir(assets_dir):
            app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

        @app.get("/{path:path}")
        async def spa_fallback(request: Request, path: str):
            file_path = os.path.join(static_dir, path)
            if path and os.path.isfile(file_path):
                return FileResponse(file_path)
            return FileResponse(
                os.path.join(static_dir, "index.html"),
                headers={
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                    "Pragma": "no-cache",
                    "Expires": "0",
                },
            )

    return app


async def run_dataforseo_filter_pipeline(opportunity_ids: list[int]):
    """
    Background worker that runs the DataForSEO pipeline for imported products.
    """
    db = SessionLocal()
    try:
        # Load credentials
        email = _get_setting(db, "dataforseo_email", "")
        password = _get_setting(db, "dataforseo_password", "")
        if not email or not password:
            logger.error("DataForSEO email or password not configured. Skipping background filter.")
            for opp_id in opportunity_ids:
                o = db.query(Opportunity).filter(Opportunity.id == opp_id).first()
                if o:
                    o.status = "failed"
                    o.description = (o.description or "") + "\n[Filter Error: DataForSEO credentials not configured]"
            db.commit()
            return

        min_sv = _get_setting(db, "google_min_search_volume", "1000", int)
        min_margin = _get_setting(db, "google_shopping_min_margin", "30.0", float)
        bonanza_fee = _get_setting(db, "bonanza_google_fee", "20.0", float)

        opportunities = db.query(Opportunity).filter(Opportunity.id.in_(opportunity_ids)).all()
        if not opportunities:
            return

        # Clean titles to form search queries
        import re
        def clean_title(title: str) -> str:
            text = title.lower()
            text = re.sub(r"\b\d+kpa\b", "", text)
            text = re.sub(r"\b\d+mins?\b", "", text)
            text = re.sub(r"\b\d+mah\b", "", text)
            text = re.sub(r"\b(lightweight|cordless|handheld)\b", "", text)
            text = re.sub(r"[^\w\s-]", "", text)
            words = text.split()
            # Return brand + top 3 words
            return " ".join(words[:4])

        keywords = []
        opp_by_kw = {}
        for o in opportunities:
            kw = clean_title(o.title)
            keywords.append(kw)
            opp_by_kw[kw] = o

        # Step 1: Batch Search Volume Check
        from api.dataforseo import check_search_volume, search_google_shopping_prices
        sv_results = await check_search_volume(keywords, email, password)

        for kw, o in opp_by_kw.items():
            sv = sv_results.get(kw, 0)
            o.monthly_search_volume = sv
            
            if sv < min_sv:
                o.status = "failed"
                o.description = (o.description or "") + f"\n[Rejected: Search volume is {sv}, which is below the minimum required of {min_sv}]"
                continue

            # Step 2: Google Shopping Price Comparison
            shopping_data = await search_google_shopping_prices(kw, email, password)
            if not shopping_data:
                o.status = "failed"
                o.description = (o.description or "") + "\n[Rejected: No competing offers found on Google Shopping]"
                continue

            lowest_price = shopping_data["low"]
            o.google_low_price = lowest_price
            o.google_high_price = shopping_data["high"]
            
            # Compute margin rule: (Lowest Price - Walmart Price) / Lowest Price * 100
            price_gap = lowest_price - o.source_price - o.shipping_cost
            if lowest_price > 0:
                current_gap_pct = (price_gap / lowest_price) * 100.0
            else:
                current_gap_pct = 0.0

            if current_gap_pct < min_margin:
                o.status = "failed"
                o.description = (o.description or "") + f"\n[Rejected: Price margin is {current_gap_pct:.1f}%, which is below the minimum required of {min_margin}% (Walmart Price: ${o.source_price + o.shipping_cost:.2f}, Google Shopping lowest: ${lowest_price:.2f})]"
                continue

            # If it passes, move it to Opportunities!
            # Change origin to "automation_engine", status to "approved"
            o.origin = "automation_engine"
            o.status = "approved"
            
            # Re-calculate target price using pricing formula:
            margin_factor = 1.0 - (bonanza_fee / 100.0) - (_get_setting(db, "default_min_margin", "30.0", float) / 100.0)
            if margin_factor > 0.1:
                target_price = round((o.source_price + o.shipping_cost) / margin_factor, 2)
            else:
                target_price = round((o.source_price + o.shipping_cost) * 1.5, 2)
                
            # Cap target price to be at least 1 cent below Google Shopping lowest price to stay competitive
            if target_price >= lowest_price:
                target_price = round(lowest_price - 0.01, 2)
                
            o.target_price = target_price
            
            # Recalculate profit metrics
            profit = target_price - o.source_price - o.shipping_cost - (target_price * (bonanza_fee / 100.0))
            o.final_profit = profit
            if target_price > 0:
                o.final_margin_pct = (profit / target_price) * 100.0
            else:
                o.final_margin_pct = 0.0

        db.commit()
    except Exception as e:
        logger.error(f"Error in DataForSEO background task: {e}")
        db.rollback()
    finally:
        db.close()


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _profile_dict(p: ScanProfile) -> dict:
    return {
        "id": p.id, "name": p.name, "source": p.source,
        "categories": p.categories, "min_price": p.min_price, "max_price": p.max_price,
        "min_monthly_sales": p.min_monthly_sales, "min_rating": p.min_rating,
        "min_orders": p.min_orders, "min_stock": p.min_stock,
        "detect_out_of_stock": p.detect_out_of_stock,
        "min_margin_pct": p.min_margin_pct, "bonanza_fee_pct": p.bonanza_fee_pct,
        "ship_to_country": p.ship_to_country, "max_delivery_days": p.max_delivery_days,
        "keywords": p.keywords, "is_active": p.is_active,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "last_scan_at": p.last_scan_at.isoformat() if p.last_scan_at else None,
    }


def _opp_dict(o: Opportunity) -> dict:
    return {
        "id": o.id, "scan_profile_id": o.scan_profile_id,
        "source": o.source, "source_url": o.source_url,
        "source_product_id": o.source_product_id,
        "title": o.title, "description": o.description,
        "image_urls": o.image_urls.split("|") if o.image_urls else [],
        "category": o.category,
        "source_price": o.source_price, "shipping_cost": o.shipping_cost,
        "target_price": o.target_price,
        "monthly_sales": o.monthly_sales, "rating": o.rating,
        "review_count": o.review_count, "stock": o.stock,
        "seller_name": o.seller_name, "seller_rating": o.seller_rating,
        "seller_years": o.seller_years,
        "margin_pct": o.margin_pct, "cashback_rate": o.cashback_rate,
        "cashback_amount": o.cashback_amount,
        "final_profit": o.final_profit, "final_margin_pct": o.final_margin_pct,
        "best_cashback_site": o.best_cashback_site,
        "brand": o.brand,
        "upc": o.upc,
        "monthly_search_volume": o.monthly_search_volume,
        "google_low_price": o.google_low_price,
        "google_high_price": o.google_high_price,
        "status": o.status, "ai_title": o.ai_title, "ai_description": o.ai_description,
        "created_at": o.created_at.isoformat() if o.created_at else None,
        "updated_at": o.updated_at.isoformat() if o.updated_at else None,
    }


def _listing_dict(l: Listing) -> dict:
    return {
        "id": l.id, "opportunity_id": l.opportunity_id,
        "bonanza_item_id": l.bonanza_item_id,
        "title": l.title, "description": l.description,
        "price": l.price, "quantity": l.quantity,
        "source_price": l.opportunity.source_price if l.opportunity else l.price,
        "category": l.category, "shipping_cost": l.shipping_cost,
        "image_urls": l.image_urls.split("|") if l.image_urls else [],
        "external_url": l.external_url,
        "brand": l.brand, "upc": l.upc, "mpn": l.mpn,
        "identifier_exists": l.identifier_exists,
        "google_product_category": l.google_product_category,
        "condition": l.condition,
        "status": l.status, "bonanza_response": l.bonanza_response[:500] if l.bonanza_response else "",
        "created_at": l.created_at.isoformat() if l.created_at else None,
        "updated_at": l.updated_at.isoformat() if l.updated_at else None,
    }


def _cashback_dict(s: CashbackSite) -> dict:
    return {
        "id": s.id, "name": s.name, "url": s.url,
        "default_rate": s.default_rate, "upfront_discount": s.upfront_discount,
        "supported_stores": s.supported_stores, "is_active": s.is_active,
        "notes": s.notes,
    }


def _scanlog_dict(l: ScanLog) -> dict:
    return {
        "id": l.id, "scan_profile_id": l.scan_profile_id,
        "status": l.status, "products_found": l.products_found,
        "opportunities_created": l.opportunities_created,
        "error_message": l.error_message,
        "started_at": l.started_at.isoformat() if l.started_at else None,
        "completed_at": l.completed_at.isoformat() if l.completed_at else None,
    }


def _get_setting(db: Session, key: str, default: str = "", cast: type = str) -> Any:
    s = db.query(Setting).filter(Setting.key == key).first()
    if not s or not s.value:
        return cast(default) if default else cast()
    try:
        return cast(s.value)
    except (ValueError, TypeError):
        return cast(default) if default else cast()


def _get_best_cashback_rate(db: Session, source: str) -> float:
    """Find the best cashback rate for a given source marketplace."""
    sites = db.query(CashbackSite).filter(
        CashbackSite.is_active == True,
        or_(
            CashbackSite.supported_stores == "",
            CashbackSite.supported_stores.ilike(f"%{source}%"),
        )
    ).all()
    if not sites:
        return 0.0
    return max(s.default_rate for s in sites)


def _get_best_cashback_site(db: Session, source: str) -> dict | None:
    """Find the best cashback site for a given source marketplace."""
    sites = db.query(CashbackSite).filter(
        CashbackSite.is_active == True,
        or_(
            CashbackSite.supported_stores == "",
            CashbackSite.supported_stores.ilike(f"%{source}%"),
        )
    ).all()
    if not sites:
        return None
    best = max(sites, key=lambda s: s.default_rate + s.upfront_discount)
    return _cashback_dict(best)


def _seed_defaults():
    """Seed default settings and cashback sites on first run."""
    db = SessionLocal()
    try:
        # Default settings
        defaults = [
            ("octoparse_api_key", "", "integration", "Octoparse API key"),
            ("octoparse_task_id", "", "integration", "Octoparse task ID for AliExpress scraping"),
            ("bonanza_developer_name", "", "integration", "Bonanza API developer ID / developer name"),
            ("bonanza_certification_name", "", "integration", "Bonanza API certification ID / certification name"),
            ("bonanza_auth_token", "", "integration", "Bonanza API auth token (auto-fetched from dev+cert)"),
            ("default_bonanza_fee", "20", "general", "Default Bonanza Google Products fee percentage"),
            ("default_min_margin", "30", "general", "Default minimum profit margin percentage"),
        ]
        for key, value, cat, desc in defaults:
            existing = db.query(Setting).filter(Setting.key == key).first()
            if not existing:
                db.add(Setting(key=key, value=value, category=cat, description=desc))

        # Default Scan Profile
        from db import ScanProfile
        profile_exists = db.query(ScanProfile).filter(ScanProfile.id == 1).first()
        if not profile_exists:
            db.add(ScanProfile(
                id=1,
                name="Default AliExpress Profile",
                source="aliexpress",
                keywords="surfboard, jetboat, lawn mower",
                categories="Sporting Goods, Home & Garden",
                min_price=10.0,
                max_price=10000.0,
                min_monthly_sales=1,
                min_rating=4.0,
                min_orders=1,
                min_stock=1,
                min_margin_pct=30.0,
                bonanza_fee_pct=20.0,
                ship_to_country="US",
                max_delivery_days=30,
                is_active=True
            ))
            db.commit()

        # Default cashback sites
        if db.query(CashbackSite).count() == 0:
            cb_sites = [
                CashbackSite(name="Rakuten", url="https://www.rakuten.com", default_rate=3.0,
                             upfront_discount=0.0, supported_stores="aliexpress,walmart,amazon,ebay",
                             notes="Popular cashback portal with rotating categories"),
                CashbackSite(name="TopCashback", url="https://www.topcashback.com", default_rate=4.0,
                             upfront_discount=0.0, supported_stores="aliexpress,walmart,amazon,ebay",
                             notes="Often has the highest rates"),
                CashbackSite(name="BeFrugal", url="https://www.befrugal.com", default_rate=3.5,
                             upfront_discount=0.0, supported_stores="aliexpress,walmart,amazon,ebay",
                             notes="Guaranteed highest cashback"),
                CashbackSite(name="RetailMeNot", url="https://www.retailmenot.com", default_rate=2.0,
                             upfront_discount=5.0, supported_stores="walmart,amazon,ebay",
                             notes="Coupon codes + cashback"),
                CashbackSite(name="Honey", url="https://www.joinhoney.com", default_rate=1.5,
                             upfront_discount=0.0, supported_stores="aliexpress,walmart,amazon,ebay",
                             notes="Automatic coupon finder + cashback"),
                CashbackSite(name="Mr. Rebates", url="https://www.mrrebates.com", default_rate=3.0,
                             upfront_discount=0.0, supported_stores="aliexpress,walmart,amazon,ebay",
                             notes="Straightforward cashback"),
            ]
            for s in cb_sites:
                db.add(s)

        db.commit()
    except Exception as e:
        logger.error("Seed failed: %s", e)
        db.rollback()
    finally:
        db.close()
