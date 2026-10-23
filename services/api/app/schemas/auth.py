from typing import Optional, Literal
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: Literal["student", "educator", "admin"] = "student"

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str = Field(min_length=8, description="Password must be at least 8 characters")
    role: Literal["student", "educator"] = "student"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(UserBase):
    id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Optional[UserOut] = None

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    exp: Optional[int] = None
    type: Optional[str] = None
