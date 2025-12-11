from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import uuid
import shutil
from app.crud import crud
from app.schemas import schemas
from app.models import models
from app.core import security
from app.models.models import SessionLocal

router = APIRouter()

UPLOAD_DIRECTORY = "uploads"
STATIC_PATH = "/static"
os.makedirs(UPLOAD_DIRECTORY, exist_ok=True)

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

# --- UPLOAD ---
@router.post("/upload-image")
async def upload_image(file: UploadFile = File(...), current_user = Depends(security.get_current_admin)):
    try:
        file_extension = file.filename.split(".")[-1]
        file_name = f"{uuid.uuid4()}.{file_extension}"
        file_path = os.path.join(UPLOAD_DIRECTORY, file_name)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return {"image_url": f"{STATIC_PATH}/{file_name}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")

# --- TABLES ---
@router.get("/tables/", response_model=List[schemas.Table])
def read_tables(store_id: Optional[int] = None, db: Session = Depends(get_db), current_user=Depends(security.get_current_admin)):
    return crud.get_tables(db, store_id)

@router.post("/tables/", response_model=schemas.Table)
def create_table(table: schemas.TableCreate, store_id: Optional[int] = None, db: Session = Depends(get_db), current_user=Depends(security.get_current_admin)):
    return crud.create_table(db, table, store_id)

@router.put("/tables/{table_id}/status", response_model=schemas.Table)
def update_table_status(table_id: int, status: models.TableStatus, db: Session = Depends(get_db), current_user=Depends(security.get_current_admin)):
    return crud.update_table_status(db, table_id, status)

# --- VOUCHERS ---
@router.get("/vouchers/", response_model=List[schemas.Voucher])
def read_vouchers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user=Depends(security.get_current_admin)):
    return crud.get_vouchers(db, skip, limit)

@router.post("/vouchers/", response_model=schemas.Voucher)
def create_voucher(voucher: schemas.VoucherCreate, db: Session = Depends(get_db), current_user=Depends(security.get_current_admin)):
    return crud.create_voucher(db, voucher)

@router.put("/vouchers/{voucher_id}", response_model=schemas.Voucher)
def update_voucher(voucher_id: int, voucher: schemas.VoucherCreate, db: Session = Depends(get_db), current_user=Depends(security.get_current_admin)):
    res = crud.update_voucher(db, voucher_id, voucher)
    if not res: raise HTTPException(status_code=404, detail="Not found")
    return res

@router.delete("/vouchers/{voucher_id}")
def delete_voucher(voucher_id: int, db: Session = Depends(get_db), current_user=Depends(security.get_current_admin)):
    res = crud.delete_voucher(db, voucher_id)
    if not res: raise HTTPException(status_code=404, detail="Not found")
    return res