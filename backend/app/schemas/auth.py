from typing import Optional, List
from pydantic import BaseModel, EmailStr, ConfigDict, Field

VALID_ROLES: List[str] = [
    "Institution User",
    "Scrutiny Officer",
    "Regional Officer",
    "Committee Coordinator",
    "Competent Authority",
    "System Operator",
]

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, description="Password with minimum 6 characters")
    full_name: str = Field(..., min_length=2, description="Full name of user")
    role: str = Field(..., description="Assigned AICTE user role")
    institution_id: Optional[str] = Field(None, description="Required for Institution User")
    region: Optional[str] = Field(None, description="Required for Regional Officer")

class GoogleAuthRequest(BaseModel):
    credential: str = Field(..., description="Google ID Token or OAuth JWT credential")
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[str] = "Institution User"
    institution_id: Optional[str] = None
    region: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: str
    email: str
    full_name: str
    institution_id: Optional[str] = None
    region: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    institution_id: Optional[str] = None
    region: Optional[str] = None
    is_active: bool

    model_config = ConfigDict(from_attributes=True)
