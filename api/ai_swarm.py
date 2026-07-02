import os
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from google import genai

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
