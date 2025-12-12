# Tệp: app/routers/public_menu.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.crud import crud
from app.schemas import schemas
from app.dependencies import get_db # <--- QUAN TRỌNG

router = APIRouter()

@router.get("/menu", response_model=List[schemas.PublicCategory])
async def get_full_menu(db: AsyncSession = Depends(get_db)):
    return await crud.get_public_menu(db)