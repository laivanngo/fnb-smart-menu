# Tệp: app/core/security.py (ĐÃ SỬA LỖI VÒNG LẶP)

from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from typing import Optional
from sqlalchemy.orm import Session
import os

# --- [SỬA QUAN TRỌNG] ---
# 1. Chỉ import models, schemas, SessionLocal
from app.models import models
from app.schemas import schemas
from app.models.models import SessionLocal
# 2. TUYỆT ĐỐI KHÔNG import crud ở đây để tránh vòng lặp
# ------------------------

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_KEY = os.getenv("SECRET_KEY")
if SECRET_KEY is None:
    SECRET_KEY = "08dd74d3cb23bf8190d00fcac56c292a9a48c81bda6545c580b6391b942dbf0a"

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/admin/token")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_current_admin(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Không thể xác thực, vui lòng đăng nhập lại",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # --- [MẸO QUAN TRỌNG] IMPORT TRỄ (LAZY IMPORT) ---
    # Import crud ở đây thì code mới chạy được
    from app.crud import crud 
    # -------------------------------------------------

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = schemas.TokenData(username=username)
    except JWTError:
        raise credentials_exception
    
    admin = crud.get_admin_by_username(db, username=token_data.username)
    if admin is None:
        raise credentials_exception
    return admin