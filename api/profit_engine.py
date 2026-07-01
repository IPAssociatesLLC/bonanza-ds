import json
import logging
from typing import Dict, Any, List, Optional
from api.google_scraper import search_google_shopping

logger = logging.getLogger("bonanza_ds.profit_engine")

async def run_7_stage_pipeline(
    db, 
    user_id: int, 
    algorithm: str, 
    target_urls: str, 
    min_margin_pct: float, 
    min_search_volume: int, 
    assumed_ctr: float, 
    assumed_conversion: float, 
    max_credits: int
) -> dict:
    """
    Executes Claude's 7-stage math pipeline for the Deal Arbitrage scanner.
    """
    opportunities_created = 0
    credits_used = 0
    
    # ─── STAGE 1: Discovery (Mocked Source Scraping for now) ───
    # In a real run, this parses target_urls (ShopSavvy, Price.com) and fetches the top 50 items.
    logger.info(f"Stage 1: Scraping Deals from {target_urls}")
    
    # Example mocked deal scraped from a source
    discovered_deals = [
        {
            "title": "Milwaukee 36 Piece Socket Tool Set",
            "source_url": "https://shopsavvy.com/deal/milwaukee",
            "source_price": 89.00,
            "reg_price": 179.00,
            "discount_pct": 0.50,
            "deal_duration_days": 1,
            "image_url": "https://example.com/milwaukee.jpg"
        }
    ]
    
    # Assume platform fee is 20% and payment is 3% as defined in the plan
    total_fee_pct = 0.23
    
    from db import Opportunity
    
    for deal in discovered_deals:
        if credits_used >= max_credits:
            break
            
        # ─── STAGE 2: Search Volume Filter ───
        # Mocking Google Ads API keyword volume lookup for now
        # TODO: Wire n8n Google Ads API here
        deal_search_volume = 1200 
        
        if deal_search_volume < min_search_volume:
            logger.info(f"Discarding {deal['title']} - Search volume {deal_search_volume} below {min_search_volume}")
            continue
            
        # ─── STAGE 3: Minimum Viable Sell Price (The Gate) ───
        # required_sell_price = buy_price * (1 + min_markup_pct)
        # We need markup >= min_margin_pct just to clear fees and land profit.
        # Note: min_margin_pct is entered as a whole number (e.g., 40), so convert to decimal
        markup_decimal = min_margin_pct / 100.0
        required_sell_price = deal["source_price"] * (1 + markup_decimal)
        
        # ─── STAGE 4: Market Price Check (Bright Data Google Shopping) ───
        logger.info(f"Checking Google Shopping for {deal['title']}")
        google_data = await search_google_shopping(deal["title"])
        credits_used += 1
        
        if not google_data or not google_data.get("average"):
            logger.info(f"Discarding {deal['title']} - Not found on Google Shopping")
            continue
            
        shopping_current_price = google_data["low"] # We compete on the low end
        seller_count = google_data["count"]
        
        is_viable = required_sell_price <= shopping_current_price
        if not is_viable:
            logger.info(f"Discarding {deal['title']} - Required sell price ${required_sell_price:.2f} > Google Low ${shopping_current_price:.2f}")
            continue
            
        # ─── STAGE 5: Actual Pricing & Profit ───
        # slightly competitive offset
        sell_price = shopping_current_price * 0.98 
        
        fees_dollar = sell_price * total_fee_pct
        net_profit_dollar = sell_price - deal["source_price"] - fees_dollar
        net_profit_margin = net_profit_dollar / sell_price if sell_price > 0 else 0
        actual_markup_pct = (sell_price - deal["source_price"]) / deal["source_price"]
        
        # ─── STAGE 6: Estimated Sales & Income ───
        ctr_decimal = assumed_ctr / 100.0
        conv_decimal = assumed_conversion / 100.0
        seller_split_factor = 1.0 / max(seller_count, 1)
        
        est_monthly_sales = deal_search_volume * ctr_decimal * conv_decimal * seller_split_factor
        est_sales_for_window = est_monthly_sales * (deal["deal_duration_days"] / 30.0)
        est_income = est_sales_for_window * net_profit_dollar
        
        # ─── STAGE 7: Save to Opportunities ───
        opp = Opportunity(
            user_id=user_id,
            source="shopsavvy",
            source_url=deal["source_url"],
            title=deal["title"],
            image_urls=deal["image_url"],
            source_price=deal["source_price"],
            target_price=sell_price,
            required_sell_price=required_sell_price,
            google_high_price=google_data["high"],
            google_low_price=google_data["low"],
            google_avg_price=google_data["average"],
            discount_pct=deal["discount_pct"],
            deal_duration_days=deal["deal_duration_days"],
            monthly_search_volume=deal_search_volume,
            seller_count=seller_count,
            margin_pct=markup_decimal * 100.0,
            final_profit=net_profit_dollar,
            final_margin_pct=net_profit_margin * 100.0,
            actual_markup_pct=actual_markup_pct * 100.0,
            est_monthly_sales=est_monthly_sales,
            est_sales_for_window=est_sales_for_window,
            est_income=est_income,
            status="new"
        )
        db.add(opp)
        opportunities_created += 1

    db.commit()
    
    return {
        "status": "completed",
        "items_found": len(discovered_deals),
        "opportunities_created": opportunities_created,
        "credits_used": credits_used
    }
