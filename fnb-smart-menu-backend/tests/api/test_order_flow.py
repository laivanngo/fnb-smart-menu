# Tệp: tests/api/test_order_flow.py
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.crud import crud
from app.schemas import schemas
from app.models import models

@pytest.mark.asyncio
async def test_full_order_process(client: AsyncClient, db_session: AsyncSession):
    # ==========================================
    # BƯỚC 1: CHUẨN BỊ DỮ LIỆU (SETUP)
    # ==========================================
    # Tạo Danh mục & Sản phẩm giả
    cat = await crud.create_category(db_session, schemas.CategoryCreate(name="Test Cat Flow"))
    prod = await crud.create_product(db_session, schemas.ProductCreate(
        name="Test Tea Flow", base_price=30000, category_id=cat.id
    ))
    
    # ==========================================
    # BƯỚC 2: KHÁCH HÀNG ĐẶT MÓN
    # ==========================================
    order_payload = {
        "customer_name": "Khach Test Flow",
        "customer_phone": "0988888888",
        "customer_address": "Test Address Flow",
        "delivery_method": "TAI_CHO",
        "payment_method": "TIEN_MAT",
        "items": [
            {
                "product_id": prod.id,
                "quantity": 2,
                "options": []
            }
        ]
    }
    
    response = await client.post("/orders", json=order_payload)
    assert response.status_code == 201
    order_data = response.json()
    order_id = order_data["id"]
    
    assert order_data["total_amount"] == 60000
    assert order_data["status"] == "MOI"

    # ==========================================
    # BƯỚC 3: ADMIN DUYỆT ĐƠN (ĐÃ FIX TRÙNG ADMIN)
    # ==========================================
    
    # [FIX]: Dùng tên khác để tránh trùng với 'admin' thật trong DB
    test_username = "superuser_flow_test"
    test_password = "123"
    
    # Kiểm tra xem admin test đã có chưa, nếu chưa thì tạo
    existing_admin = await crud.get_admin_by_username(db_session, test_username)
    if not existing_admin:
        await crud.create_admin(db_session, schemas.AdminCreate(username=test_username, password=test_password))
    
    # Đăng nhập bằng Admin Test
    login_res = await client.post("/admin/token", data={"username": test_username, "password": test_password})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Admin cập nhật trạng thái
    update_res = await client.put(
        f"/admin/orders/{order_id}/status?status=HOAN_TAT",
        headers=headers
    )
    assert update_res.status_code == 200
    assert update_res.json()["status"] == "HOAN_TAT"

    # ==========================================
    # BƯỚC 4: KIỂM TRA TÍCH ĐIỂM
    # ==========================================
    # Logic: 60.000đ / 10.000 = 6 điểm
    from sqlalchemy.future import select
    stmt = select(models.User).where(models.User.phone == "0988888888")
    result = await db_session.execute(stmt)
    user = result.scalars().first()
    
    assert user is not None
    assert user.points == 6