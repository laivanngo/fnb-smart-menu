from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.crud import crud
from app.schemas import schemas
from app.models.models import SessionLocal

router = APIRouter()

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

@router.get("/menu", response_model=List[schemas.PublicCategory])
def get_full_menu(db: Session = Depends(get_db)):
    return crud.get_public_menu(db)