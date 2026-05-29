from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

class PropertyBase(BaseModel):
    title: str
    description: str
    price: float
    location: str
    amenities: str

class PropertyCreate(PropertyBase):
    pass

class Property(PropertyBase):
    id: int

    class Config:
        from_attributes = True

class MessageBase(BaseModel):
    role: str
    content: str

class MessageCreate(MessageBase):
    conversation_id: int

class Message(MessageBase):
    id: int
    conversation_id: int
    timestamp: datetime

    class Config:
        from_attributes = True

class ConversationBase(BaseModel):
    title: str

class ConversationCreate(ConversationBase):
    user_id: Optional[str] = "default_user"

class Conversation(ConversationBase):
    id: int
    user_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ConversationWithMessages(Conversation):
    messages: List[Message]
