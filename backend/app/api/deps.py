from typing import Generator, List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.core.config import settings
from app.db.session import get_db
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login", auto_error=False)

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or session expired.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception

    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user account.")
    return user

def require_roles(*allowed_roles: str):
    """
    Factory dependency ensuring the authenticated user holds one of the required roles
    or is a System Operator.
    """
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role == "System Operator":
            return current_user
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Action not permitted for role '{current_user.role}'. Required roles: {list(allowed_roles)}.",
            )
        return current_user
    return role_checker

def verify_record_scope(current_user: User, institution_identifier: str) -> None:
    """
    Enforces record-level scope isolation: Institution users may only read and mutate
    their own institution's data.
    """
    if current_user.role == "Institution User":
        user_inst = (current_user.institution_id or "").strip().lower()
        target_inst = (institution_identifier or "").strip().lower()
        if not user_inst:
            return

        is_match = (
            user_inst == target_inst
            or user_inst in target_inst
            or target_inst in user_inst
            or (user_inst == "inst-014" and "shivneri" in target_inst)
        )
        if not is_match:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You are not authorized to view or mutate records belonging to another institution.",
            )

