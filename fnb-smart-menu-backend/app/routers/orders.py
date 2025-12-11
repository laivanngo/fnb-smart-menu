# Tệp: app/routers/orders.py (ĐÃ SỬA ĐƯỜNG DẪN KHỚP VỚI FRONTEND)

from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

# Import chuẩn Enterprise
from app.crud import crud
from app.schemas import schemas
from app.models import models
from app.core import security
from app.models.models import SessionLocal

# Import WebSocket Manager (Xử lý lỗi nếu file chưa load kịp)
try:
    from app.core.websocket import manager
except ImportError:
    manager = None

# QUAN TRỌNG: Không set prefix ở đây, ta sẽ định nghĩa full path cho từng API
router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ==================================================================
# 1. API CHO KHÁCH HÀNG (PUBLIC)
# Đường dẫn: /orders/...
# ==================================================================

@router.post("/orders/calculate", response_model=schemas.OrderCalculateResponse)
def calculate_order(order_data: schemas.OrderCalculateRequest, db: Session = Depends(get_db)):
    """Tính tiền đơn hàng (Khách dùng)"""
    return crud.calculate_order_total(db, order_data)

@router.post("/orders", response_model=schemas.PublicOrderResponse, status_code=status.HTTP_201_CREATED)
async def submit_new_order(order_data: schemas.OrderCreate, db: Session = Depends(get_db)):
    """Gửi đơn hàng mới (Khách dùng)"""
    # 1. Lưu vào DB
    db_order = crud.create_order(db, order_data)
    
    # 2. Bắn thông báo Real-time (WebSocket)
    if manager:
        print(f"🔔 Gửi thông báo WebSocket cho đơn #{db_order.id}")
        msg = {
            "type": "new_order",
            "order_id": db_order.id,
            "customer_name": db_order.customer_name,
            "table_id": db_order.table_id,
            "total_amount": float(db_order.total_amount),
            "timestamp": datetime.now().isoformat()
        }
        await manager.broadcast(msg)
    
    return db_order

# ==================================================================
# 2. API CHO ADMIN (CẦN LOGIN)
# Đường dẫn: /admin/orders/...
# ==================================================================

@router.get("/admin/orders/", response_model=List[schemas.OrderDetail]) 
def read_orders(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user = Depends(security.get_current_admin)):
    """Lấy danh sách đơn hàng"""
    return crud.get_orders(db, skip, limit)

@router.get("/admin/orders/{order_id}", response_model=schemas.OrderDetail)
def read_order_detail(order_id: int, db: Session = Depends(get_db), current_user = Depends(security.get_current_admin)):
    """Xem chi tiết đơn hàng"""
    return crud.get_order_details(db, order_id)

@router.put("/admin/orders/{order_id}/status", response_model=schemas.AdminOrderListResponse)
def update_status(order_id: int, status: models.OrderStatus, db: Session = Depends(get_db), current_user = Depends(security.get_current_admin)):
    """Cập nhật trạng thái đơn"""
    if status == models.OrderStatus.HOAN_TAT:
        return crud.complete_order(db, order_id)
    else:
        return crud.update_order_status(db, order_id, status)

# ==================================================================
# 3. WEBSOCKET ENDPOINTS (REAL-TIME)
# Đường dẫn: /ws/...
# ==================================================================

@router.websocket("/ws/admin/orders")
async def websocket_admin(websocket: WebSocket):
    """Kênh thông báo cho Admin (Nghe tin đơn mới)"""
    if manager:
        await manager.connect(websocket)
        try:
            while True:
                # Giữ kết nối sống, chờ tin nhắn (dù admin ít khi gửi lên)
                await websocket.receive_text()
        except WebSocketDisconnect:
            manager.disconnect(websocket)

@router.websocket("/ws/group/{group_id}")
async def websocket_group(websocket: WebSocket, group_id: str):
    """Kênh đặt đơn nhóm"""
    if manager:
        await manager.connect_group(websocket, group_id)
        try:
            while True:
                data = await websocket.receive_json()
                await manager.broadcast_group(group_id, data, sender_socket=websocket)
        except WebSocketDisconnect:
            manager.disconnect_group(websocket, group_id)