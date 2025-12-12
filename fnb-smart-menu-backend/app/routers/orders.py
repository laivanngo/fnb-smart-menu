# Tệp: app/routers/orders.py (ASYNC VERSION)
from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession # Import AsyncSession
from typing import List
from datetime import datetime

from app.crud import crud
from app.schemas import schemas
from app.models import models
from app.core import security
from app.models.models import AsyncSessionLocal

try:
    from app.core.websocket import manager
except ImportError:
    manager = None

router = APIRouter()

# Dependency Async
async def get_db():
    async with AsyncSessionLocal() as db:
        try: yield db
        finally: await db.close()

# --- API KHÁCH HÀNG ---
@router.post("/orders/calculate", response_model=schemas.OrderCalculateResponse)
async def calculate_order(order_data: schemas.OrderCalculateRequest, db: AsyncSession = Depends(get_db)):
    return await crud.calculate_order_total(db, order_data)

@router.post("/orders", response_model=schemas.PublicOrderResponse, status_code=status.HTTP_201_CREATED)
async def submit_new_order(order_data: schemas.OrderCreate, db: AsyncSession = Depends(get_db)):
    db_order = await crud.create_order(db, order_data)
    if manager:
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

# --- API ADMIN ---
@router.get("/admin/orders/", response_model=List[schemas.OrderDetail]) 
async def read_orders(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db), current_user = Depends(security.get_current_admin)):
    return await crud.get_orders(db, skip, limit)

@router.get("/admin/orders/{order_id}", response_model=schemas.OrderDetail)
async def read_order_detail(order_id: int, db: AsyncSession = Depends(get_db), current_user = Depends(security.get_current_admin)):
    return await crud.get_order_details(db, order_id)

@router.put("/admin/orders/{order_id}/status", response_model=schemas.AdminOrderListResponse)
async def update_status(order_id: int, status: models.OrderStatus, db: AsyncSession = Depends(get_db), current_user = Depends(security.get_current_admin)):
    if status == models.OrderStatus.HOAN_TAT:
        return await crud.complete_order(db, order_id)
    else:
        return await crud.update_order_status(db, order_id, status)

# --- WEBSOCKET (Đã là async sẵn, nhưng cứ giữ nguyên) ---
@router.websocket("/ws/admin/orders")
async def websocket_admin(websocket: WebSocket):
    if manager:
        await manager.connect(websocket)
        try:
            while True: await websocket.receive_text()
        except WebSocketDisconnect:
            manager.disconnect(websocket)

@router.websocket("/ws/group/{group_id}")
async def websocket_group(websocket: WebSocket, group_id: str):
    if manager:
        await manager.connect_group(websocket, group_id)
        try:
            while True:
                data = await websocket.receive_json()
                await manager.broadcast_group(group_id, data, sender_socket=websocket)
        except WebSocketDisconnect:
            manager.disconnect_group(websocket, group_id)