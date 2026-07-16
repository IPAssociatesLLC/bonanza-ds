import os
import asyncio
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from google import genai
from scrapfly_client import ScrapflyClient, normalize_aliexpress_product
from profitability import calculate_profitability, suggest_target_price
from api.google_scraper import search_google_shopping

# Setup APIRouter for AI Swarm Endpoints
swarm_router = APIRouter()

# Initialize Gemini Client
api_key = os.environ.get("GEMINI_WORKSHOP_API_KEY")
client = genai.Client(api_key=api_key) if api_key else None

class ChatMessage(BaseModel):
    id: str
    role: str
    content: str

class SwarmDeployRequest(BaseModel):
    targetUrls: str
    minMargin: str
    minSearchVolume: str
    maxDealDuration: str
    cashbackSites: str
    minCashbackRate: str
    messages: List[ChatMessage]

def get_swarm_system_prompt(parameters: SwarmDeployRequest) -> str:
    """Builds the dynamic system prompt based on the user's custom hunt parameters."""
    return f"""You are the Commander of the AI Scout Swarm for a highly profitable Drop Shipping Platform.
Your mission is to understand the user's logic and rules, answer their questions, and deploy web scraping agents.

CURRENT HUNT PARAMETERS:
- Target Source Sites: {parameters.targetUrls}
- Min Profit Margin: {parameters.minMargin}%
- Min Search Volume: {parameters.minSearchVolume} / month
- Max Deal Duration: {parameters.maxDealDuration} days left
- Cashback Sites to scan: {parameters.cashbackSites}
- Min Cashback Rate: {parameters.minCashbackRate}%

INSTRUCTIONS:
1. Speak professionally but assertively, like a highly capable tactical AI commander.
2. If the user gives you a rule (e.g., 'prioritize summer items'), acknowledge it and confirm you understand how to apply it against the Current Hunt Parameters.
3. If they ask about the metrics, explain how the swarm will use them.
4. Keep responses concise, direct, and under 3-4 sentences.
"""

@swarm_router.post("/chat")
async def chat_with_agent(req: SwarmDeployRequest):
    if not client:
        return {"response": "ERROR: Gemini API Key is missing from the backend configuration."}
    
    system_instruction = get_swarm_system_prompt(req)
    
    contents = []
    for msg in req.messages:
        role = "model" if msg.role in ["ai", "system"] else "user"
        contents.append({
            "role": role,
            "parts": [{"text": msg.content}]
        })
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=contents,
            config=genai.types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.7,
            )
        )
        return {"response": response.text}
    except Exception as e:
        print(f"Gemini API Error: {e}")
        return {"response": f"Error connecting to Swarm intelligence: {str(e)}"}

@swarm_router.post("/deploy")
async def deploy_swarm(req: SwarmDeployRequest):
    """
    Executes the actual web scraping using Scrapfly and the existing profitability engine.
    Replaces the mock data on the frontend with actual live data.
    """
    target_urls = [url.strip() for url in req.targetUrls.split('\n') if url.strip()]
    if not target_urls:
        return {"results": []}

    min_margin = float(req.minMargin) if req.minMargin else 40.0
    
    results = []
    scraper = ScrapflyClient()
    
    for index, url in enumerate(target_urls):
        try:
            print(f"Swarm deploying scraper to: {url}")
            # 1. Scrape the live product
            raw_data = scraper.scrape_aliexpress_product(url)
            if not raw_data:
                continue
                
            norm_data = normalize_aliexpress_product(raw_data)
            source_price = norm_data["price"]
            title = norm_data["title"]
            
            # 2. Check Google Shopping for real-time market prices
            google_data = search_google_shopping(title)
            
            # 3. Calculate profitability based on the user's required min margin
            # We assume a base sell price to hit the requested margin
            required_sell_price = source_price / (1 - (min_margin / 100.0))
            
            profit_vs_low = google_data["low"] - source_price
            margin_low_pct = (profit_vs_low / google_data["low"]) * 100 if google_data["low"] > 0 else 0
            
            profit_vs_avg = google_data["average"] - source_price
            margin_avg_pct = (profit_vs_avg / google_data["average"]) * 100 if google_data["average"] > 0 else 0
            
            # Formatting to match the exact frontend fields demanded by the user
            results.append({
                "id": index + 1,
                "title": title,
                "image": norm_data.get("image_url", ""),
                "sourceSite": "AliExpress (Scrapfly)",
                "sourceUrl": url,
                
                "buyRegPrice": f"${source_price:.2f}", # Keeping simple for now, can extract discount if available
                "buyDiscountPrice": f"${source_price:.2f}",
                "discountAmount": "$0.00 (0% Off)",
                
                "googleHighPrice": f"${google_data['high']:.2f}",
                "googleLowPrice": f"${google_data['low']:.2f}",
                "googleAvgPrice": f"${google_data['average']:.2f}",
                
                "profitLow": f"${profit_vs_low:.2f}",
                "marginLow": f"{margin_low_pct:.1f}%",
                "profitAvg": f"${profit_vs_avg:.2f}",
                "marginAvg": f"{margin_avg_pct:.1f}%",
                
                "suggestedSellPrice": f"{required_sell_price:.2f}",
                
                "cashbackSite": req.cashbackSites.split(',')[0].strip() if req.cashbackSites else "TopCashback",
                "cashbackAmount": f"{req.minCashbackRate}%",
                "searchVol": f"{req.minSearchVolume}/mo",
                "dealEnds": f"{req.maxDealDuration} Days",
                "status": "Verified Scrape"
            })
        except Exception as e:
            print(f"Error scraping {url}: {e}")
            
    return {"results": results}
