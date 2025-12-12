# Tệp: tests/api/test_menu.py
import pytest
from httpx import AsyncClient

# Đánh dấu đây là test Async
@pytest.mark.asyncio
async def test_read_menu_public(client: AsyncClient):
    # 1. Hành động: Gọi API /menu
    response = await client.get("/menu")
    
    # 2. Kiểm tra kết quả (Assert)
    assert response.status_code == 200
    
    # Kiểm tra dữ liệu trả về phải là một danh sách (List)
    data = response.json()
    assert isinstance(data, list)
    
    # (Optional) Nếu bạn đã seed data, danh sách không được rỗng
    # assert len(data) > 0