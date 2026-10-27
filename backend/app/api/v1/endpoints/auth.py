import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from jose import jwt

from app.db.session import get_db
from app.models.user import User
from app.core.security import verify_password, get_password_hash, create_access_token
from app.schemas.auth import (
    LoginRequest,
    SignupRequest,
    GoogleAuthRequest,
    TokenResponse,
    UserResponse,
    VALID_ROLES,
)
from app.api.deps import get_current_user

router = APIRouter()

@router.post("/login", response_model=TokenResponse)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is deactivated.",
        )

    access_token = create_access_token(subject=user.id, role=user.role)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        role=user.role,
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        institution_id=user.institution_id,
        region=user.region,
    )

@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup(req: SignupRequest, db: Session = Depends(get_db)):
    # 1. Validate role
    if req.role not in VALID_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role '{req.role}'. Must be one of: {', '.join(VALID_ROLES)}",
        )

    # 2. Contextual requirements
    if req.role == "Institution User" and (not req.institution_id or not req.institution_id.strip()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="institution_id is required for Institution User role.",
        )

    if req.role == "Regional Officer" and (not req.region or not req.region.strip()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="region is required for Regional Officer role.",
        )

    # 3. Check duplicate email
    existing_user = db.query(User).filter(User.email == req.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already registered.",
        )

    # 4. Create user
    user_id = f"USR-{uuid.uuid4().hex[:6].upper()}"
    hashed_pwd = get_password_hash(req.password)

    new_user = User(
        id=user_id,
        email=req.email,
        hashed_password=hashed_pwd,
        full_name=req.full_name.strip(),
        role=req.role,
        institution_id=req.institution_id.strip() if req.institution_id else None,
        region=req.region.strip() if req.region else None,
        is_active=True,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    access_token = create_access_token(subject=new_user.id, role=new_user.role)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        role=new_user.role,
        user_id=new_user.id,
        email=new_user.email,
        full_name=new_user.full_name,
        institution_id=new_user.institution_id,
        region=new_user.region,
    )

@router.post("/google", response_model=TokenResponse)
def google_auth(req: GoogleAuthRequest, db: Session = Depends(get_db)):
    # 1. Resolve email and name from token or explicit fields
    email = req.email
    full_name = req.full_name

    if not email and req.credential:
        try:
            claims = jwt.get_unverified_claims(req.credential)
            email = claims.get("email")
            full_name = full_name or claims.get("name")
        except Exception:
            pass

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not resolve user email from Google credential.",
        )

    # 2. Check if user already exists
    user = db.query(User).filter(User.email == email).first()

    if user:
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Account is deactivated.",
            )
    else:
        # 3. Auto-provision new user from Google
        role = req.role if req.role in VALID_ROLES else "Institution User"
        inst_id = req.institution_id.strip() if req.institution_id else (
            "INST-NEW" if role == "Institution User" else None
        )
        region = req.region.strip() if req.region else (
            "West" if role == "Regional Officer" else None
        )

        user_id = f"USR-{uuid.uuid4().hex[:6].upper()}"
        # Set a random hashed password for accounts provisioned via Google
        random_pwd = get_password_hash(uuid.uuid4().hex)

        user = User(
            id=user_id,
            email=email,
            hashed_password=random_pwd,
            full_name=full_name.strip() if full_name else email.split("@")[0].capitalize(),
            role=role,
            institution_id=inst_id,
            region=region,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    access_token = create_access_token(subject=user.id, role=user.role)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        role=user.role,
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        institution_id=user.institution_id,
        region=user.region,
    )

@router.get("/me", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user
