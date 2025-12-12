# Tệp: app/scripts/create_admin.py (ASYNC VERSION)
import asyncio
import os
import sys

# Thêm đường dẫn gốc để Python tìm thấy module 'app'
sys.path.append(os.getcwd())

from sqlalchemy.future import select
from app.models.models import AsyncSessionLocal, Admin
from app.core.security import get_password_hash

async def create_super_admin():
    print("👤 Đang kiểm tra tài khoản Admin...")
    async with AsyncSessionLocal() as db:
        try:
            username = "admin"
            password = "123"

            # Kiểm tra tồn tại (Async syntax)
            stmt = select(Admin).where(Admin.username == username)
            result = await db.execute(stmt)
            existing_admin = result.scalars().first()
            
            if existing_admin:
                print(f"⚠️ Tài khoản '{username}' đã tồn tại! Bỏ qua.")
                return

            print(f"🚀 Đang tạo tài khoản Admin mới: {username}...")
            hashed_pw = get_password_hash(password)
            new_admin = Admin(username=username, hashed_password=hashed_pw)
            
            db.add(new_admin)
            await db.commit()
            print(f"✅ Tạo thành công! Đăng nhập bằng: {username} / {password}")

        except Exception as e:
            print(f"❌ Lỗi tạo admin: {e}")

if __name__ == "__main__":
    # Chạy event loop
    asyncio.run(create_super_admin())