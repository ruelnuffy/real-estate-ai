import os
import logging
from pathlib import Path
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
import httpx
from dotenv import load_dotenv

from . import models, schemas, database

# Load .env from the backend directory explicitly
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("estateai")

app = FastAPI(title="EstateAI Backend")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database
models.Base.metadata.create_all(bind=database.engine)

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[int] = None
    user_id: Optional[str] = "default_user"

class ChatResponse(BaseModel):
    response: str
    conversation_id: int

MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")
MISTRAL_MODEL = os.getenv("MISTRAL_MODEL", "mistral-small-latest")

async def get_mistral_response(prompt: str, context: str):
    if not MISTRAL_API_KEY:
        return f"Hi! Based on what you asked, here are some houses I found:\n\n{context}\n\nDo you want to know more about any of these?"

    url = "https://api.mistral.ai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {MISTRAL_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": MISTRAL_MODEL,
        "messages": [
            {"role": "system", "content": f"""You are a helpful house finder. Your job is to help regular people find a home. 
            Use simple, easy-to-understand English. 
            
            IMPORTANT: When you find houses, list them EXACTLY in this format so the computer can show them as cards:
            PROPERTY_START
            Title: [House Title]
            Location: [Area Name]
            Price: [Price with NGN]
            Features: [Short list of features]
            PROPERTY_END

            Only talk about these houses: {context}. If you can't find what they want, just say so nicely. Be professional but very friendly."""},
            {"role": "user", "content": prompt}
        ]
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, headers=headers, json=payload, timeout=30.0)
            if response.status_code == 200:
                result = response.json()
                return result['choices'][0]['message']['content']
            else:
                return f"Sorry, I'm having a little trouble thinking right now. Error: {response.status_code}"
        except Exception as e:
            return f"I can't connect to my brain right now. Error: {str(e)}"

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, db: Session = Depends(database.get_db)):
    # 1. Handle Conversation
    conversation_id = request.conversation_id
    if not conversation_id:
        # Create new conversation
        title = request.message[:40] + ("..." if len(request.message) > 40 else "")
        new_conv = models.Conversation(title=title, user_id=request.user_id)
        db.add(new_conv)
        db.commit()
        db.refresh(new_conv)
        conversation_id = new_conv.id
    else:
        # Verify conversation exists
        conv = db.query(models.Conversation).filter(models.Conversation.id == conversation_id).first()
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")

    # 2. RAG Logic (Search Properties)
    search_query = request.message.lower()
    keywords = search_query.split()
    query = db.query(models.Property)
    
    if keywords:
        filters = []
        for kw in keywords:
            if len(kw) > 2:
                filters.append(
                    (models.Property.title.ilike(f"%{kw}%")) |
                    (models.Property.location.ilike(f"%{kw}%")) |
                    (models.Property.description.ilike(f"%{kw}%"))
                )
        if filters:
            from sqlalchemy import or_
            query = query.filter(or_(*filters))

    properties = query.limit(5).all()
    if not properties:
        properties = db.query(models.Property).limit(3).all()

    context_str = "\n---\n".join([
        f"House: {p.title}\nLocation: {p.location}\nPrice: NGN {p.price:,.2f}\nAbout: {p.description}\nHas: {p.amenities}"
        for p in properties
    ])

    # 3. Get AI Response
    ai_response = await get_mistral_response(request.message, context_str)

    # 4. Save Messages
    user_msg = models.Message(conversation_id=conversation_id, role="user", content=request.message)
    ai_msg = models.Message(conversation_id=conversation_id, role="assistant", content=ai_response)
    db.add(user_msg)
    db.add(ai_msg)
    db.commit()

    return ChatResponse(response=ai_response, conversation_id=conversation_id)

@app.get("/api/conversations", response_model=List[schemas.Conversation])
def get_conversations(user_id: str = "default_user", db: Session = Depends(database.get_db)):
    return db.query(models.Conversation).filter(models.Conversation.user_id == user_id).order_by(models.Conversation.updated_at.desc()).all()

@app.get("/api/conversations/{id}", response_model=schemas.ConversationWithMessages)
def get_conversation(id: int, db: Session = Depends(database.get_db)):
    conv = db.query(models.Conversation).filter(models.Conversation.id == id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv

@app.get("/api/properties", response_model=List[schemas.Property])
def get_properties(db: Session = Depends(database.get_db)):
    return db.query(models.Property).all()
