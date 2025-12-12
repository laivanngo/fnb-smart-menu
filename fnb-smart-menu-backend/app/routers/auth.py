# Tệp: app/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from app.core import security
from app.crud import crud
from app.schemas import schemas
from app.models.models import AsyncSessionLocal

router = APIRouter()

async def get_db():
    async with AsyncSessionLocal() as db:
        try: yield db
        finally: await db.close()

@router.post("/token", response_model=schemas.Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    # Thêm await vào hàm crud
    admin = await crud.get_admin_by_username(db, form_data.username)
    if not admin or not security.verify_password(form_data.password, admin.hashed_password):
        raise HTTPException(status_code=400, detail="Sai tài khoản hoặc mật khẩu")
    return {"access_token": security.create_access_token(data={"sub": admin.username}), "token_type": "bearer"}