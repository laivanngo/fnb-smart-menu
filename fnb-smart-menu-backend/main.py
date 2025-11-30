# File: main.py
# Đây là "Bộ não" chính của Backend. Mọi yêu cầu từ Website sẽ đi qua đây.

from dotenv import load_dotenv
load_dotenv() # Bước 1: Nạp các biến mật khẩu, cấu hình từ file .env

# --- NHẬP CÁC THƯ VIỆN CẦN THIẾT ---
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List
from fastapi.staticfiles import StaticFiles # Dùng để phục vụ file ảnh tĩnh
import shutil # Dùng để lưu file ảnh vào ổ cứng
import os
import uuid # Dùng để tạo tên file ngẫu nhiên không trùng
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware

# Nhập các file code con của chúng ta
import crud, models, schemas, security
from models import SessionLocal

# Nhập trình quản lý thông báo Real-time (WebSocket)
try:
    from websocket_manager import manager
    print("✅ Đã tải hệ thống thông báo Real-time!")
except ImportError:
    manager = None
    print("⚠️ Không tìm thấy hệ thống thông báo!")

# --- KHỞI TẠO ỨNG DỤNG ---
app = FastAPI(title="FNB Smart Menu - Backend API")

# --- CẤU HÌNH LƯU TRỮ ẢNH (QUAN TRỌNG CHO VPS) ---
UPLOAD_DIRECTORY = "uploads" # Tên thư mục chứa ảnh thật trên máy
STATIC_PATH = "/static"      # Đường dẫn ảo để web truy cập
os.makedirs(UPLOAD_DIRECTORY, exist_ok=True) # Tự tạo thư mục nếu chưa có
# "Mount" thư mục ra ngoài internet để trình duyệt xem được ảnh
app.mount(STATIC_PATH, StaticFiles(directory=UPLOAD_DIRECTORY), name="static")

# --- CẤU HÌNH BẢO MẬT (CORS) ---
# Cho phép Frontend (React/Next.js) gọi API vào Backend này
origins = ["*"] 
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Hàm phụ trợ: Lấy kết nối Database, dùng xong tự trả lại
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Khi Server khởi động, tự động tạo các bảng dữ liệu nếu chưa có
@app.on_event("startup")
def on_startup():
    models.create_tables()

# ============================================================
# 0. API UPLOAD ẢNH (DÀNH CHO ADMIN)
# ============================================================
@app.post("/admin/upload-image")
async def upload_image(file: UploadFile = File(...), current_user = Depends(security.get_current_admin)):
    try:
        # 1. Tạo tên file mới ngẫu nhiên (để tránh trùng tên làm mất ảnh cũ)
        # Ví dụ: ảnh gốc "cafe.jpg" -> thành "a1b2-c3d4-e5f6.jpg"
        file_extension = file.filename.split(".")[-1]
        file_name = f"{uuid.uuid4()}.{file_extension}"
        
        # 2. Đường dẫn lưu file trên ổ cứng VPS
        file_path = os.path.join(UPLOAD_DIRECTORY, file_name)
        
        # 3. Ghi dữ liệu từ file tải lên vào ổ cứng
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # 4. Trả về đường dẫn web để hiển thị
        # Kết quả: /static/a1b2-c3d4-e5f6.jpg
        return {"image_url": f"{STATIC_PATH}/{file_name}"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi lưu ảnh: {str(e)}")

# ============================================================
# 1. API CÔNG KHAI (KHÁCH HÀNG DÙNG)
# ============================================================
@app.get("/menu", response_model=List[schemas.PublicCategory])
def get_full_menu(db: Session = Depends(get_db)):
    """Lấy toàn bộ thực đơn để hiển thị cho khách"""
    return crud.get_public_menu(db)

@app.post("/orders/calculate", response_model=schemas.OrderCalculateResponse)
def calculate_order(order_data: schemas.OrderCalculateRequest, db: Session = Depends(get_db)):
    """Tính toán tổng tiền (để hiển thị trước khi khách bấm Đặt)"""
    return crud.calculate_order_total(db, order_data)

@app.post("/orders", response_model=schemas.PublicOrderResponse, status_code=status.HTTP_201_CREATED)
async def submit_new_order(order_data: schemas.OrderCreate, db: Session = Depends(get_db)):
    """Khách bấm nút 'Đặt hàng'"""
    # 1. Lưu đơn hàng vào Database
    db_order = crud.create_order(db, order_data)
    
    # 2. Bắn thông báo 'Ting ting' cho Admin qua WebSocket
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

# ============================================================
# 2. WEBSOCKETS (KÊNH LIÊN LẠC REAL-TIME)
# ============================================================
@app.websocket("/ws/admin/orders")
async def websocket_admin(websocket: WebSocket):
    """Kênh riêng cho Admin nhận đơn mới"""
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text() # Giữ kết nối luôn mở
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.websocket("/ws/group/{group_id}")
async def websocket_group(websocket: WebSocket, group_id: str):
    """Kênh cho tính năng Đặt đơn nhóm"""
    await manager.connect_group(websocket, group_id)
    try:
        while True:
            data = await websocket.receive_json()
            # Gửi tin nhắn cho mọi người trong nhóm (trừ người gửi)
            await manager.broadcast_group(group_id, data, sender_socket=websocket)
    except WebSocketDisconnect:
        manager.disconnect_group(websocket, group_id)

# ============================================================
# 3. API ADMIN - ĐĂNG NHẬP
# ============================================================
@app.post("/admin/token", response_model=schemas.Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Xác thực tài khoản Admin và cấp 'Thẻ từ' (Token)"""
    admin = crud.get_admin_by_username(db, form_data.username)
    if not admin or not security.verify_password(form_data.password, admin.hashed_password):
        raise HTTPException(status_code=400, detail="Sai tài khoản hoặc mật khẩu")
    return {"access_token": security.create_access_token(data={"sub": admin.username}), "token_type": "bearer"}

# ============================================================
# 4. API ADMIN - QUẢN LÝ DANH MỤC (CATEGORIES)
# ============================================================
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

# ============================================================
# 5. API ADMIN - QUẢN LÝ SẢN PHẨM (PRODUCTS)
# ============================================================
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

# --- QUAN TRỌNG: API NÀY ĐÃ ĐƯỢC SỬA URL CHO KHỚP VỚI FRONTEND ---
@app.post("/admin/products/{prod_id}/link_options", response_model=schemas.Product)
def link_options(prod_id: int, link_request: schemas.ProductLinkOptionsRequest, db: Session = Depends(get_db), current_user=Depends(security.get_current_admin)):
    """Gắn các nhóm tùy chọn (Size, Đường...) vào sản phẩm"""
    # Sử dụng hàm đã đổi tên 'to' cho dễ hiểu
    return crud.link_product_to_options(db, prod_id, link_request.option_ids)

# ============================================================
# 6. API ADMIN - QUẢN LÝ TÙY CHỌN (OPTIONS)
# ============================================================
@app.get("/admin/options/", response_model=List[schemas.Option])
def read_options(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user=Depends(security.get_current_admin)):
    return crud.get_options(db, skip, limit)

@app.post("/admin/options/", response_model=schemas.Option)
def create_option(option: schemas.OptionCreate, db: Session = Depends(get_db), current_user=Depends(security.get_current_admin)):
    return crud.create_option(db, option)

@app.post("/admin/options/{option_id}/values", response_model=schemas.OptionValue)
def create_option_value(option_id: int, value: schemas.OptionValueCreate, db: Session = Depends(get_db), current_user=Depends(security.get_current_admin)):
    return crud.create_option_value(db, value, option_id)

# ============================================================
# 7. API ADMIN - QUẢN LÝ ĐƠN HÀNG (ORDERS)
# ============================================================
@app.get("/admin/orders/", response_model=List[schemas.AdminOrderListResponse])
def read_orders(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user = Depends(security.get_current_admin)):
    return crud.get_orders(db, skip, limit)

@app.get("/admin/orders/{order_id}", response_model=schemas.OrderDetail)
def read_order_detail(order_id: int, db: Session = Depends(get_db), current_user = Depends(security.get_current_admin)):
    return crud.get_order_details(db, order_id)

@app.put("/admin/orders/{order_id}/status", response_model=schemas.AdminOrderListResponse)
def update_status(order_id: int, status: models.OrderStatus, db: Session = Depends(get_db), current_user = Depends(security.get_current_admin)):
    return crud.update_order_status(db, order_id, status)