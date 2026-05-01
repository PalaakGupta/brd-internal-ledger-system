from pydantic import BaseModel, Field
from typing import Optional

class UserCreate(BaseModel):
    """Shape of data needed to create a new user"""
    name: str
    email: str

class TransactionRequest(BaseModel):
    """
    Shape of data needed to make a transaction.
    amount must be positive — you can't deposit -500
    description is optional
    """
    user_id: int
    type: str  # 'deposit' or 'deduct'
    amount: float = Field(gt=0, description="Amount must be greater than 0")
    description: Optional[str] = None