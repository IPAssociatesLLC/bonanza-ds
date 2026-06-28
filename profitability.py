"""Profitability calculator and AI-powered listing generation."""
import os
import json
import logging
from google import genai

logger = logging.getLogger("bonanza_ds.profitability")


# ─── Profitability Calculator ─────────────────────────────────────────────────

def calculate_profitability(
    source_price: float,
    shipping_cost: float,
    target_price: float,
    bonanza_fee_pct: float = 20.0,
    cashback_rate: float = 0.0,
    additional_costs: float = 0.0,
) -> dict:
    """Calculate profit margins before and after cashback.

    Args:
        source_price: Price of the item on the source marketplace (AliExpress, etc.)
        shipping_cost: Shipping cost from source
        target_price: Price to list on Bonanza
        bonanza_fee_pct: Bonanza Google Products fee percentage (13-20%)
        cashback_rate: Cashback percentage from cashback site
        additional_costs: Any other costs (e.g., payment processing)

    Returns:
        Dict with margin_pct, cashback_amount, final_profit, final_margin_pct, etc.
    """
    total_cost = source_price + shipping_cost + additional_costs
    bonanza_fee = target_price * (bonanza_fee_pct / 100.0)
    gross_profit = target_price - total_cost - bonanza_fee
    margin_pct = (gross_profit / target_price * 100.0) if target_price > 0 else 0.0

    # Cashback applies to source purchase
    cashback_amount = total_cost * (cashback_rate / 100.0)
    final_profit = gross_profit + cashback_amount
    final_margin_pct = (final_profit / target_price * 100.0) if target_price > 0 else 0.0

    return {
        "total_cost": round(total_cost, 2),
        "bonanza_fee": round(bonanza_fee, 2),
        "gross_profit": round(gross_profit, 2),
        "margin_pct": round(margin_pct, 2),
        "cashback_amount": round(cashback_amount, 2),
        "final_profit": round(final_profit, 2),
        "final_margin_pct": round(final_margin_pct, 2),
    }


def suggest_target_price(
    source_price: float,
    shipping_cost: float,
    bonanza_fee_pct: float = 20.0,
    min_margin_pct: float = 30.0,
    cashback_rate: float = 0.0,
) -> float:
    """Calculate the minimum target price to achieve the required margin.

    Solves: (target - cost - target*fee + cost*cb) / target >= min_margin
    => target >= (cost - cost*cb) / (1 - fee - min_margin)
    """
    total_cost = source_price + shipping_cost
    cashback_factor = 1.0 - (cashback_rate / 100.0)
    denominator = 1.0 - (bonanza_fee_pct / 100.0) - (min_margin_pct / 100.0)
    if denominator <= 0:
        # Cannot achieve margin with this fee — set a high price
        return round(total_cost / 0.1, 2)
    min_price = (total_cost * cashback_factor) / denominator
    # Add 5% buffer
    return round(min_price * 1.05, 2)


def is_profitable(metrics: dict, min_margin_pct: float = 30.0) -> bool:
    """Check if an opportunity meets the minimum margin requirement."""
    return metrics.get("margin_pct", 0) >= min_margin_pct


# ─── AI Listing Generator (Gemini) ────────────────────────────────────────────

def _get_gemini_client():
    """Create a Gemini client using Workshop proxy."""
    return genai.Client(
        api_key=os.environ.get("GEMINI_WORKSHOP_API_KEY"),
        http_options={
            "api_version": "v1alpha",
            "base_url": os.environ.get("GEMINI_WORKSHOP_BASE_URL"),
        },
    )


def generate_listing_title(product_data: dict) -> str:
    """Use AI to generate a Google Shopping-optimized listing title.

    Titles should be clear, keyword-rich, and under 150 characters for Google Shopping.
    """
    client = _get_gemini_client()
    prompt = f"""You are an e-commerce listing expert specializing in Google Shopping optimization.
Generate a compelling product title for a Bonanza marketplace listing.

Product info:
- Name: {product_data.get('title', '')}
- Category: {product_data.get('category', '')}
- Source: {product_data.get('source', '')}
- Price: ${product_data.get('source_price', 0)}
- Key features: {product_data.get('description', '')[:500]}

Requirements:
- Title must be 70-150 characters (Google Shopping optimal length)
- Include relevant keywords buyers would search for
- Do NOT include the brand name if unknown
- Do NOT include price in the title
- Do NOT include promotional text (sale, best, etc.)
- Return ONLY the title text, nothing else"""

    response = client.models.generate_content(
        model="gemini-3-flash-preview",
        contents=prompt,
    )
    title = response.text.strip().strip('"').strip()
    # Truncate to 150 chars for Google Shopping compliance
    if len(title) > 150:
        title = title[:147] + "..."
    return title


def generate_listing_description(product_data: dict, target_price: float) -> str:
    """Use AI to generate a Bonanza product description optimized for conversion."""
    client = _get_gemini_client()
    images = product_data.get("image_urls", [])
    if isinstance(images, list):
        images = ", ".join(str(u) for u in images[:3])
    else:
        images = str(images)

    prompt = f"""You are an e-commerce copywriter. Write a product description for a Bonanza marketplace listing.

Product info:
- Name: {product_data.get('title', '')}
- Category: {product_data.get('category', '')}
- Source price: ${product_data.get('source_price', 0)}
- Selling price: ${target_price}
- Rating: {product_data.get('rating', 0)}/5
- Orders: {product_data.get('monthly_sales', 0)}
- Seller: {product_data.get('seller_name', '')}

Requirements:
- 100-200 words
- Highlight key features and benefits
- Professional tone, no hype words
- Include a bullet-point feature list
- Do NOT mention the source marketplace (AliExpress, etc.)
- Do NOT mention drop shipping
- Return ONLY the description text"""

    response = client.models.generate_content(
        model="gemini-3-flash-preview",
        contents=prompt,
    )
    return response.text.strip()


def analyze_vendor_risk(product_data: dict) -> dict:
    """Use AI to summarize vendor quality and risk."""
    client = _get_gemini_client()
    prompt = f"""Analyze this AliExpress vendor for drop-shipping risk. Return a JSON object.

Vendor data:
- Seller: {product_data.get('seller_name', '')}
- Seller rating: {product_data.get('seller_rating', 0)}/5
- Years in business: {product_data.get('seller_years', 0)}
- Product rating: {product_data.get('rating', 0)}/5
- Monthly orders: {product_data.get('monthly_sales', 0)}
- Reviews: {product_data.get('review_count', 0)}
- Stock: {product_data.get('stock', 0)}

Return JSON with keys: risk_level (low/medium/high), summary (1-2 sentences), recommendation (proceed/caution/avoid)"""

    response = client.models.generate_content(
        model="gemini-3-flash-preview",
        contents=prompt,
    )
    try:
        return json.loads(response.text.strip().strip("```json").strip("```"))
    except (json.JSONDecodeError, ValueError):
        return {"risk_level": "unknown", "summary": "Unable to analyze", "recommendation": "caution"}


def suggest_optimal_price(product_data: dict, source_price: float, shipping_cost: float, bonanza_fee_pct: float = 20.0) -> float:
    """Use AI to suggest a price that balances margin and conversion."""
    client = _get_gemini_client()
    base_price = suggest_target_price(source_price, shipping_cost, bonanza_fee_pct)

    prompt = f"""You are a pricing strategist for e-commerce. Suggest the optimal selling price for this product on Bonanza.

Product: {product_data.get('title', '')}
Source cost: ${source_price}
Shipping: ${shipping_cost}
Bonanza fee: {bonanza_fee_pct}%
Minimum viable price (30% margin): ${base_price}
Product rating: {product_data.get('rating', 0)}/5
Monthly orders: {product_data.get('monthly_sales', 0)}

Consider:
- Competitive pricing (not too high to discourage buyers)
- Maintaining at least 30% margin
- Products with high demand can command higher prices

Return ONLY the number (e.g., 29.99), nothing else."""

    response = client.models.generate_content(
        model="gemini-3-flash-preview",
        contents=prompt,
    )
    try:
        price = float(response.text.strip().replace("$", ""))
        # Ensure minimum margin is met
        min_price = suggest_target_price(source_price, shipping_cost, bonanza_fee_pct)
        return max(price, min_price)
    except (ValueError, TypeError):
        return base_price


def filter_chinese_images(image_urls: list[str]) -> list[str]:
    """Filter out images containing Chinese text using Gemini vision capabilities."""
    if not image_urls:
        return []

    client = _get_gemini_client()
    clean_urls = []

    # Check up to 5 images to keep runtime and credits reasonable
    for url in image_urls[:5]:
        # Skip unsplash/placeholder images as they never have Chinese text
        if "unsplash.com" in url:
            clean_urls.append(url)
            continue

        try:
            import httpx
            from google.genai import types
            
            # Download image bytes
            resp = httpx.get(url, timeout=10.0, verify=False)
            if resp.status_code == 200:
                mime = resp.headers.get("Content-Type", "image/jpeg")
                # Format part
                image_part = types.Part.from_bytes(data=resp.content, mime_type=mime)
                prompt = "Does this image have any Chinese characters or Chinese text/writing? Reply with 'yes' or 'no' only."
                
                res = client.models.generate_content(
                    model="gemini-3-flash-preview",
                    contents=[image_part, prompt]
                )
                ans = res.text.lower().strip()
                if "yes" not in ans:
                    clean_urls.append(url)
                else:
                    logger.info("Filtered image with Chinese text: %s", url)
            else:
                clean_urls.append(url)
        except Exception as e:
            logger.warning("Failed to filter image %s: %s", url, e)
            clean_urls.append(url)  # Keep on failure to be safe

    return clean_urls if clean_urls else image_urls
