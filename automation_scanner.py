import os
import asyncio
import logging
from datetime import datetime

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("automation_scanner")

# Import DB and models
from db import SessionLocal, Opportunity, ScanProfile, ScanLog, CashbackSite
from aliexpress_scraper.aliexpress import scrape_search
from aliexpress_scraper.parser import normalize_aliexpress_product
from profitability import _get_best_cashback_rate, _get_best_cashback_site

# For Google Shopping we will use a mock/stub via Scrapfly later
from google_shopping import get_google_shopping_market_price

async def run_daily_automation(profile_id: int):
    """
    Runs the automated daily scanner for a specific profile.
    This script is COMPLETELY ISOLATED from the manual Product Scout (routes.py).
    """
    logger.info(f"Starting Daily Automation for profile ID {profile_id}...")
    db = SessionLocal()
    
    try:
        profile = db.query(ScanProfile).filter(ScanProfile.id == profile_id).first()
        if not profile:
            logger.error("Scan profile not found.")
            return

        scrapfly_key = os.environ.get("SCRAPFLY_KEY")
        if not scrapfly_key:
            logger.error("SCRAPFLY_KEY not set. Cannot run scanner.")
            return
            
        # Log the scan
        scan_log = ScanLog(scan_profile_id=profile.id, status="running", started_at=datetime.utcnow())
        db.add(scan_log)
        db.commit()
        db.refresh(scan_log)

        # Build search query
        keywords = profile.keywords.strip() if profile.keywords else "surfboard"
        keyword = [k.strip() for k in keywords.split(",") if k.strip()][0]
        url = f"https://www.aliexpress.com/w/wholesale-{keyword}.html"
        
        logger.info(f"Scraping AliExpress for: {keyword}")
        raw_products = await scrape_search(url, max_pages=1)
        
        opportunities_created = 0
        
        for raw in raw_products[:50]:  # Limit to 50 for testing
            product = normalize_aliexpress_product(raw)
            
            # 1. Source Filters
            if product["source_price"] < profile.min_price or product["source_price"] > profile.max_price:
                continue
            if product["monthly_sales"] < profile.min_monthly_sales:
                continue
                
            total_cost = product["source_price"] + product["shipping_cost"]
            cb_rate = _get_best_cashback_rate(db, product["source"])
            best_cb = _get_best_cashback_site(db, product["source"])
            
            # 2. Get Google Shopping Competitor Price
            # This calls the google_shopping.py stub (which currently returns a simulated price)
            # Once the actual API is hooked up, this will be the true market price.
            market_data = await get_google_shopping_market_price(product["title"])
            
            if market_data is None:
                # If no Google Shopping data is found, we skip this item because we can't 
                # verify it meets the 40%+ true margin against real competitors.
                logger.info(f"Skipping {product['title']} - No Google Shopping data found.")
                continue
                
            google_low_price = market_data["low_price"]
            google_high_price = market_data["high_price"]
            
            # Set our target price competitively against the low price
            target_price = google_low_price
            
            # 3. Calculate TRUE Margin based on SELL price
            # Fee is calculated off the target_price (Sell Price)
            bonanza_fee_pct = profile.bonanza_fee_pct  # e.g., 20.0
            paypal_fee_pct = 3.0
            total_fee_pct = bonanza_fee_pct + paypal_fee_pct
            
            fee_amount = target_price * (total_fee_pct / 100.0)
            gross_profit = target_price - total_cost - fee_amount
            
            margin_pct = (gross_profit / target_price) * 100.0 if target_price > 0 else 0
            
            # Apply Cashback
            cashback_amount = total_cost * (cb_rate / 100.0)
            final_profit = gross_profit + cashback_amount
            final_margin_pct = (final_profit / target_price) * 100.0 if target_price > 0 else 0
            
            # 4. Check if it meets the massive 40%+ margin requirement
            if margin_pct < 40.0:
                logger.info(f"Skipping {product['title']} - Margin too low ({margin_pct:.1f}%)")
                continue
                
            logger.info(f"🔥 Found High-Profit Gem! {product['title']} - Margin: {margin_pct:.1f}%")
            
            # 5. Save to Opportunities
            opp = Opportunity(
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
                google_low_price=google_low_price,
                google_high_price=google_high_price,
                discount_info="Found via Daily Automation",
                monthly_sales=product["monthly_sales"],
                rating=product["rating"],
                review_count=product["review_count"],
                stock=product["stock"],
                seller_name=product["seller_name"],
                seller_rating=product["seller_rating"],
                seller_years=product["seller_years"],
                margin_pct=round(margin_pct, 2),
                cashback_rate=cb_rate,
                cashback_amount=round(cashback_amount, 2),
                final_profit=round(final_profit, 2),
                final_margin_pct=round(final_margin_pct, 2),
                best_cashback_site=best_cb["name"] if best_cb else "",
                status="new",
            )
            db.add(opp)
            opportunities_created += 1

        # Update profile and scan log
        profile.last_scan_at = datetime.utcnow()
        scan_log.status = "completed"
        scan_log.products_found = len(raw_products)
        scan_log.opportunities_created = opportunities_created
        scan_log.completed_at = datetime.utcnow()
        db.commit()
        
        logger.info(f"Scan complete. Found {opportunities_created} opportunities over 40% margin.")
        
    except Exception as e:
        logger.error(f"Automation scan failed: {e}", exc_info=True)
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    # Test script execution
    asyncio.run(run_daily_automation(profile_id=1))
