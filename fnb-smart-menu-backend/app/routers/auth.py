from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.core import security
from app.crud import crud
from app.schemas import schemas
from app.models.models import SessionLocal

router = APIRouter()

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

@router.post("/token", response_model=schemas.Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    admin = crud.get_admin_by_username(db, form_data.username)
    if not admin or not security.verify_password(form_data.password, admin.hashed_password):
        raise HTTPException(status_code=400, detail="Sai tài khoản hoặc mật khẩu")
    return {"access_token": security.create_access_token(data={"sub": admin.username}), "token_type": "bearer"}