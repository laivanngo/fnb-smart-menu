# Tệp: app/routers/public_menu.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.crud import crud
from app.schemas import schemas
from app.models.models import AsyncSessionLocal

router = APIRouter()

async def get_db():
    async with AsyncSessionLocal() as db:
        try: yield db
        finally: await db.close()

@router.get("/menu", response_model=List[schemas.PublicCategory])
async def get_full_menu(db: AsyncSession = Depends(get_db)):
    # Thêm await
    return await crud.get_public_menu(db)