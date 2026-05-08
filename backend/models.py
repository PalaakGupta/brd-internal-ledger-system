from pydantic import BaseModel, Field
from typing import Optional

class UserCreate(BaseModel):
    """Shape of data needed to create a new user"""
    name: str
    email: str
    password: str

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

class LoginRequest(BaseModel):
    email: str
    password: str


class ResourceCreate(BaseModel):
    name: str
    price: float = Field(gt=0)
    icon: str = "📦"
    category: str = "consumable"
    total_units: Optional[int] = None

from typing import Optional