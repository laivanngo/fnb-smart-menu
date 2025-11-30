# File: fnb-smart-menu-backend/main.py (BẢN FINAL - TỰ ĐỘNG SỬA LỖI)

from dotenv import load_dotenv
load_dotenv() 

from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List
from fastapi.staticfiles import StaticFiles
import shutil
import os
import uuid
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware

import crud, models, schemas, security
from models import SessionLocal

try:
    from websocket_manager import manager
    print("✅ Đã tải hệ thống thông báo Real-time!")
except ImportError:
    manager = None
    print("⚠️ Không tìm thấy hệ thống thông báo!")

app = FastAPI(title="FNB Smart Menu - Backend API")

UPLOAD_DIRECTORY = "uploads"
STATIC_PATH = "/static"
os.makedirs(UPLOAD_DIRECTORY, exist_ok=True)
app.mount(STATIC_PATH, StaticFiles(directory=UPLOAD_DIRECTORY), name="static")

origins = ["*"] 
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# === TỰ ĐỘNG SỬA LỖI THỨ TỰ KHI KHỞI ĐỘNG ===
@app.on_event("startup")
def on_startup():
    models.create_tables()
    
    # Logic tự động sửa lỗi thứ tự (Thay thế cho script fix_order.py)
    db = SessionLocal()
    try:
        # Kiểm tra xem có sản phẩm nào đang có thứ tự = 0 không
        zero_order_products = db.query(models.Product).filter(models.Product.display_order == 0).all()
        if zero_order_products:
            print("🛠️ Phát hiện sản phẩm chưa có số thứ tự. Đang tự động cập nhật...")
            all_products = db.query(models.Product).all()
            for index, prod in enumerate(all_products):
                prod.display_order = index + 1
            db.commit()
            print("✅ Đã tự động sửa xong số thứ tự!")
    except Exception as e:
        print(f"⚠️ Lỗi khi tự động sửa thứ tự: {e}")
    finally:
        db.close()

# ... (CÁC API GIỮ NGUYÊN NHƯ CŨ) ...

# 0. UPLOAD
@app.post("/admin/upload-image")
async def upload_image(file: UploadFile = File(...), current_user = Depends(security.get_current_admin)):
    try:
        file_extension = file.filename.split(".")[-1]
        file_name = f"{uuid.uuid4()}.{file_extension}"
        file_path = os.path.join(UPLOAD_DIRECTORY, file_name)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return {"image_url": f"{STATIC_PATH}/{file_name}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi lưu ảnh: {str(e)}")

# 1. API KHÁCH
@app.get("/menu", response_model=List[schemas.PublicCategory])
def get_full_menu(db: Session = Depends(get_db)):
    return crud.get_public_menu(db)

@app.post("/orders/calculate", response_model=schemas.OrderCalculateResponse)
def calculate_order(order_data: schemas.OrderCalculateRequest, db: Session = Depends(get_db)):
    return crud.calculate_order_total(db, order_data)

@app.post("/orders", response_model=schemas.PublicOrderResponse, status_code=status.HTTP_201_CREATED)
async def submit_new_order(order_data: schemas.OrderCreate, db: Session = Depends(get_db)):
    db_order = crud.create_order(db, order_data)
    if manager:
        msg = {
            "type": "new_order",
            "order_id": db_order.id,
            "customer_name": db_order.customer_name,
            "total_amount": db_order.total_amount,
            "timestamp": datetime.now().isoformat()
        }
        await manager.broadcast(msg)
    return db_order

# 2. WEBSOCKET
@app.websocket("/ws/admin/orders")
async def websocket_admin(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.websocket("/ws/group/{group_id}")
async def websocket_group(websocket: WebSocket, group_id: str):
    await manager.connect_group(websocket, group_id)
    try:
        while True:
            data = await websocket.receive_json()
            await manager.broadcast_group(group_id, data, sender_socket=websocket)
    except WebSocketDisconnect:
        manager.disconnect_group(websocket, group_id)

# 3. LOGIN
@app.post("/admin/token", response_model=schemas.Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    admin = crud.get_admin_by_username(db, form_data.username)
    if not admin or not security.verify_password(form_data.password, admin.hashed_password):
        raise HTTPException(status_code=400, detail="Sai tài khoản hoặc mật khẩu")
    return {"access_token": security.create_access_token(data={"sub": admin.username}), "token_type": "bearer"}

# 4. CATEGORIES
@app.get("/admin/categories/", response_model=List[schemas.Category])
def read_categories(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user=Depends(security.get_current_admin)):
    return crud.get_categories(db, skip, limit)

@app.post("/admin/categories/", response_model=schemas.Category)
def create_category(category: schemas.CategoryCreate, db: Session = Depends(get_db), current_user=Depends(security.get_current_admin)):
    return crud.create_category(db, category)

@app.put("/admin/categories/{cat_id}", response_model=schemas.Category)
def update_category(cat_id: int, category: schemas.CategoryUpdate, db: Session = Depends(get_db), current_user=Depends(security.get_current_admin)):
    return crud.update_category(db, cat_id, category)

@app.delete("/admin/categories/{cat_id}")
def delete_category(cat_id: int, db: Session = Depends(get_db), current_user=Depends(security.get_current_admin)):
    result = crud.delete_category(db, cat_id)
    if not result: raise HTTPException(status_code=404, detail="Không tìm thấy danh mục")
    return result

# 5. PRODUCTS
@app.get("/admin/products/", response_model=List[schemas.Product])
def read_products(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user=Depends(security.get_current_admin)):
    return crud.get_products(db, skip, limit)

@app.post("/admin/products/", response_model=schemas.Product)
def create_product(product: schemas.ProductCreate, db: Session = Depends(get_db), current_user=Depends(security.get_current_admin)):
    return crud.create_product(db, product)

@app.put("/admin/products/{prod_id}", response_model=schemas.Product)
def update_product(prod_id: int, product: schemas.ProductUpdate, db: Session = Depends(get_db), current_user=Depends(security.get_current_admin)):
    return crud.update_product(db, prod_id, product)

@app.delete("/admin/products/{prod_id}")
def delete_product(prod_id: int, db: Session = Depends(get_db), current_user=Depends(security.get_current_admin)):
    result = crud.delete_product(db, prod_id)
    if not result: raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
    return result

@app.post("/admin/products/{prod_id}/link_options", response_model=schemas.Product)
def link_options(prod_id: int, link_request: schemas.ProductLinkOptionsRequest, db: Session = Depends(get_db), current_user=Depends(security.get_current_admin)):
    return crud.link_product_to_options(db, prod_id, link_request.option_ids)

# 6. OPTIONS
@app.get("/admin/options/", response_model=List[schemas.Option])
def read_options(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user=Depends(security.get_current_admin)):
    return crud.get_options(db, skip, limit)

@app.post("/admin/options/", response_model=schemas.Option)
def create_option(option: schemas.OptionCreate, db: Session = Depends(get_db), current_user=Depends(security.get_current_admin)):
    return crud.create_option(db, option)

@app.post("/admin/options/{option_id}/values", response_model=schemas.OptionValue)
def create_option_value(option_id: int, value: schemas.OptionValueCreate, db: Session = Depends(get_db), current_user=Depends(security.get_current_admin)):
    return crud.create_option_value(db, value, option_id)

@app.put("/admin/values/{value_id}", response_model=schemas.OptionValue)
def update_option_value(value_id: int, value: schemas.OptionValueUpdate, db: Session = Depends(get_db), current_user=Depends(security.get_current_admin)):
    updated_val = crud.update_option_value(db, value_id, value)
    if not updated_val: raise HTTPException(status_code=404, detail="Không tìm thấy lựa chọn này")
    return updated_val

@app.delete("/admin/values/{value_id}")
def delete_option_value(value_id: int, db: Session = Depends(get_db), current_user=Depends(security.get_current_admin)):
    result = crud.delete_option_value(db, value_id)
    if not result: raise HTTPException(status_code=404, detail="Không tìm thấy lựa chọn này")
    return result

@app.put("/admin/options/{option_id}", response_model=schemas.Option)
def update_option(option_id: int, option: schemas.OptionUpdate, db: Session = Depends(get_db), current_user=Depends(security.get_current_admin)):
    updated_opt = crud.update_option(db, option_id, option)
    if not updated_opt: raise HTTPException(status_code=404, detail="Không tìm thấy nhóm tùy chọn")
    return updated_opt

@app.delete("/admin/options/{option_id}")
def delete_option(option_id: int, db: Session = Depends(get_db), current_user=Depends(security.get_current_admin)):
    result = crud.delete_option(db, option_id)
    if not result: raise HTTPException(status_code=404, detail="Không tìm thấy nhóm tùy chọn")
    return result

# 7. ORDERS
@app.get("/admin/orders/", response_model=List[schemas.OrderDetail]) 
def read_orders(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user = Depends(security.get_current_admin)):
    return crud.get_orders(db, skip, limit)

@app.get("/admin/orders/{order_id}", response_model=schemas.OrderDetail)
def read_order_detail(order_id: int, db: Session = Depends(get_db), current_user = Depends(security.get_current_admin)):
    return crud.get_order_details(db, order_id)

@app.put("/admin/orders/{order_id}/status", response_model=schemas.AdminOrderListResponse)
def update_status(order_id: int, status: models.OrderStatus, db: Session = Depends(get_db), current_user = Depends(security.get_current_admin)):
    return crud.update_order_status(db, order_id, status)

# ============================================================
# 8. API ADMIN - QUẢN LÝ VOUCHER (MÃ GIẢM GIÁ) - Thêm mới đoạn này
# ============================================================
@app.get("/admin/vouchers/", response_model=List[schemas.Voucher])
def read_vouchers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user=Depends(security.get_current_admin)):
    return crud.get_vouchers(db, skip, limit)

@app.post("/admin/vouchers/", response_model=schemas.Voucher)
def create_voucher(voucher: schemas.VoucherCreate, db: Session = Depends(get_db), current_user=Depends(security.get_current_admin)):
    return crud.create_voucher(db, voucher)

@app.put("/admin/vouchers/{voucher_id}", response_model=schemas.Voucher)
def update_voucher(voucher_id: int, voucher: schemas.VoucherCreate, db: Session = Depends(get_db), current_user=Depends(security.get_current_admin)):
    updated_voucher = crud.update_voucher(db, voucher_id, voucher)
    if not updated_voucher:
        raise HTTPException(status_code=404, detail="Không tìm thấy voucher")
    return updated_voucher

@app.delete("/admin/vouchers/{voucher_id}")
def delete_voucher(voucher_id: int, db: Session = Depends(get_db), current_user=Depends(security.get_current_admin)):
    result = crud.delete_voucher(db, voucher_id)
    if not result:
        raise HTTPException(status_code=404, detail="Không tìm thấy voucher")
    return result