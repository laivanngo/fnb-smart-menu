# Tệp: app/routers/admin_catalog.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.crud import crud
from app.schemas import schemas
from app.core import security
from app.models.models import AsyncSessionLocal

router = APIRouter()

async def get_db():
    async with AsyncSessionLocal() as db:
        try: yield db
        finally: await db.close()

# --- CATEGORIES ---
@router.get("/categories/", response_model=List[schemas.Category])
async def read_categories(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db), current_user=Depends(security.get_current_admin)):
    return await crud.get_categories(db, skip, limit)

@router.post("/categories/", response_model=schemas.Category)
async def create_category(category: schemas.CategoryCreate, db: AsyncSession = Depends(get_db), current_user=Depends(security.get_current_admin)):
    return await crud.create_category(db, category)

@router.put("/categories/{cat_id}", response_model=schemas.Category)
async def update_category(cat_id: int, category: schemas.CategoryUpdate, db: AsyncSession = Depends(get_db), current_user=Depends(security.get_current_admin)):
    return await crud.update_category(db, cat_id, category)

@router.delete("/categories/{cat_id}")
async def delete_category(cat_id: int, db: AsyncSession = Depends(get_db), current_user=Depends(security.get_current_admin)):
    result = await crud.delete_category(db, cat_id)
    if not result: raise HTTPException(status_code=404, detail="Không tìm thấy danh mục")
    return result

# --- PRODUCTS ---
@router.get("/products/", response_model=List[schemas.Product])
async def read_products(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db), current_user=Depends(security.get_current_admin)):
    return await crud.get_products(db, skip, limit)

@router.post("/products/", response_model=schemas.Product)
async def create_product(product: schemas.ProductCreate, db: AsyncSession = Depends(get_db), current_user=Depends(security.get_current_admin)):
    return await crud.create_product(db, product)

@router.put("/products/{prod_id}", response_model=schemas.Product)
async def update_product(prod_id: int, product: schemas.ProductUpdate, db: AsyncSession = Depends(get_db), current_user=Depends(security.get_current_admin)):
    return await crud.update_product(db, prod_id, product)

@router.delete("/products/{prod_id}")
async def delete_product(prod_id: int, db: AsyncSession = Depends(get_db), current_user=Depends(security.get_current_admin)):
    result = await crud.delete_product(db, prod_id)
    if not result: raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
    return result

@router.post("/products/{prod_id}/link_options", response_model=schemas.Product)
async def link_options(prod_id: int, link_request: schemas.ProductLinkOptionsRequest, db: AsyncSession = Depends(get_db), current_user=Depends(security.get_current_admin)):
    return await crud.link_product_to_options(db, prod_id, link_request.option_ids)

# --- OPTIONS ---
@router.get("/options/", response_model=List[schemas.Option])
async def read_options(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db), current_user=Depends(security.get_current_admin)):
    return await crud.get_options(db, skip, limit)

@router.post("/options/", response_model=schemas.Option)
async def create_option(option: schemas.OptionCreate, db: AsyncSession = Depends(get_db), current_user=Depends(security.get_current_admin)):
    return await crud.create_option(db, option)

@router.put("/options/{option_id}", response_model=schemas.Option)
async def update_option(option_id: int, option: schemas.OptionUpdate, db: AsyncSession = Depends(get_db), current_user=Depends(security.get_current_admin)):
    res = await crud.update_option(db, option_id, option)
    if not res: raise HTTPException(status_code=404, detail="Not Found")
    return res

@router.delete("/options/{option_id}")
async def delete_option(option_id: int, db: AsyncSession = Depends(get_db), current_user=Depends(security.get_current_admin)):
    res = await crud.delete_option(db, option_id)
    if not res: raise HTTPException(status_code=404, detail="Not Found")
    return res

@router.post("/options/{option_id}/values", response_model=schemas.OptionValue)
async def create_option_value(option_id: int, value: schemas.OptionValueCreate, db: AsyncSession = Depends(get_db), current_user=Depends(security.get_current_admin)):
    return await crud.create_option_value(db, value, option_id)

@router.put("/values/{value_id}", response_model=schemas.OptionValue)
async def update_option_value(value_id: int, value: schemas.OptionValueUpdate, db: AsyncSession = Depends(get_db), current_user=Depends(security.get_current_admin)):
    res = await crud.update_option_value(db, value_id, value)
    if not res: raise HTTPException(status_code=404, detail="Not Found")
    return res

@router.delete("/values/{value_id}")
async def delete_option_value(value_id: int, db: AsyncSession = Depends(get_db), current_user=Depends(security.get_current_admin)):
    res = await crud.delete_option_value(db, value_id)
    if not res: raise HTTPException(status_code=404, detail="Not Found")
    return res