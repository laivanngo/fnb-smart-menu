from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.crud import crud
from app.schemas import schemas
from app.core import security
from app.models.models import SessionLocal

router = APIRouter()

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

# --- CATEGORIES ---
@router.get("/categories/", response_model=List[schemas.Category])
def read_categories(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user=Depends(security.get_current_admin)):
    return crud.get_categories(db, skip, limit)

@router.post("/categories/", response_model=schemas.Category)
def create_category(category: schemas.CategoryCreate, db: Session = Depends(get_db), current_user=Depends(security.get_current_admin)):
    return crud.create_category(db, category)

@router.put("/categories/{cat_id}", response_model=schemas.Category)
def update_category(cat_id: int, category: schemas.CategoryUpdate, db: Session = Depends(get_db), current_user=Depends(security.get_current_admin)):
    return crud.update_category(db, cat_id, category)

@router.delete("/categories/{cat_id}")
def delete_category(cat_id: int, db: Session = Depends(get_db), current_user=Depends(security.get_current_admin)):
    result = crud.delete_category(db, cat_id)
    if not result: raise HTTPException(status_code=404, detail="Không tìm thấy danh mục")
    return result

# --- PRODUCTS ---
@router.get("/products/", response_model=List[schemas.Product])
def read_products(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user=Depends(security.get_current_admin)):
    return crud.get_products(db, skip, limit)

@router.post("/products/", response_model=schemas.Product)
def create_product(product: schemas.ProductCreate, db: Session = Depends(get_db), current_user=Depends(security.get_current_admin)):
    return crud.create_product(db, product)

@router.put("/products/{prod_id}", response_model=schemas.Product)
def update_product(prod_id: int, product: schemas.ProductUpdate, db: Session = Depends(get_db), current_user=Depends(security.get_current_admin)):
    return crud.update_product(db, prod_id, product)

@router.delete("/products/{prod_id}")
def delete_product(prod_id: int, db: Session = Depends(get_db), current_user=Depends(security.get_current_admin)):
    result = crud.delete_product(db, prod_id)
    if not result: raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
    return result

@router.post("/products/{prod_id}/link_options", response_model=schemas.Product)
def link_options(prod_id: int, link_request: schemas.ProductLinkOptionsRequest, db: Session = Depends(get_db), current_user=Depends(security.get_current_admin)):
    return crud.link_product_to_options(db, prod_id, link_request.option_ids)

# --- OPTIONS ---
@router.get("/options/", response_model=List[schemas.Option])
def read_options(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user=Depends(security.get_current_admin)):
    return crud.get_options(db, skip, limit)

@router.post("/options/", response_model=schemas.Option)
def create_option(option: schemas.OptionCreate, db: Session = Depends(get_db), current_user=Depends(security.get_current_admin)):
    return crud.create_option(db, option)

@router.put("/options/{option_id}", response_model=schemas.Option)
def update_option(option_id: int, option: schemas.OptionUpdate, db: Session = Depends(get_db), current_user=Depends(security.get_current_admin)):
    res = crud.update_option(db, option_id, option)
    if not res: raise HTTPException(status_code=404, detail="Not Found")
    return res

@router.delete("/options/{option_id}")
def delete_option(option_id: int, db: Session = Depends(get_db), current_user=Depends(security.get_current_admin)):
    res = crud.delete_option(db, option_id)
    if not res: raise HTTPException(status_code=404, detail="Not Found")
    return res

@router.post("/options/{option_id}/values", response_model=schemas.OptionValue)
def create_option_value(option_id: int, value: schemas.OptionValueCreate, db: Session = Depends(get_db), current_user=Depends(security.get_current_admin)):
    return crud.create_option_value(db, value, option_id)

@router.put("/values/{value_id}", response_model=schemas.OptionValue)
def update_option_value(value_id: int, value: schemas.OptionValueUpdate, db: Session = Depends(get_db), current_user=Depends(security.get_current_admin)):
    res = crud.update_option_value(db, value_id, value)
    if not res: raise HTTPException(status_code=404, detail="Not Found")
    return res

@router.delete("/values/{value_id}")
def delete_option_value(value_id: int, db: Session = Depends(get_db), current_user=Depends(security.get_current_admin)):
    res = crud.delete_option_value(db, value_id)
    if not res: raise HTTPException(status_code=404, detail="Not Found")
    return res