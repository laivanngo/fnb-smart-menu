# Tệp: tests/api/test_auth.py
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.crud import crud
from app.schemas import schemas

@pytest.mark.asyncio
async def test_admin_login(client: AsyncClient, db_session: AsyncSession):
    # 1. Chuẩn bị dữ liệu: Tạo một Admin giả trong DB ảo
    admin_data = schemas.AdminCreate(username="test_admin", password="test_password")
    await crud.create_admin(db_session, admin_data)
    
    # 2. Hành động: Gọi API đăng nhập
    response = await client.post(
        "/admin/token",
        data={"username": "test_admin", "password": "test_password"}
    )
    
    # 3. Kiểm tra kết quả
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

@pytest.mark.asyncio
async def test_admin_login_wrong_password(client: AsyncClient, db_session: AsyncSession):
    # 1. Tạo Admin
    admin_data = schemas.AdminCreate(username="test_admin", password="test_password")
    await crud.create_admin(db_session, admin_data)
    
    # 2. Gọi API với mật khẩu sai
    response = await client.post(
        "/admin/token",
        data={"username": "test_admin", "password": "WRONG_PASSWORD"}
    )
    
    # 3. Phải trả về lỗi 400
    assert response.status_code == 400