# Tệp: app/main.py (ASYNC ENTERPRISE)
from dotenv import load_dotenv
load_dotenv() 

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import os

# Import Async
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models import models
from app.models.models import AsyncSessionLocal, create_tables

# Import các Router
from app.routers import auth, public_menu, orders, admin_catalog, admin_store

app = FastAPI(title="FNB Smart Menu - Backend API")

# Mount thư mục uploads
UPLOAD_DIRECTORY = "uploads"
STATIC_PATH = "/static"
os.makedirs(UPLOAD_DIRECTORY, exist_ok=True)
app.mount(STATIC_PATH, StaticFiles(directory=UPLOAD_DIRECTORY), name="static")

# Cấu hình CORS
origins = ["*"] 
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === TỰ ĐỘNG KHỞI TẠO (ASYNC STARTUP) ===
@app.on_event("startup")
async def on_startup():
    # 1. Tạo bảng (Dùng hàm sync hack trong models.py để tạo bảng ban đầu)
    # Lưu ý: Trong thực tế nên dùng Alembic, nhưng giữ cái này cho tiện
    try:
        create_tables() 
    except Exception as e:
        print(f"⚠️ Warning creating tables: {e}")

    # 2. Logic tự động sửa lỗi thứ tự hiển thị (Chuyển sang Async)
    async with AsyncSessionLocal() as db:
        try:
            # Dùng cú pháp select thay vì query
            stmt = select(models.Product).where(models.Product.display_order == 0)
            result = await db.execute(stmt)
            zero_order_products = result.scalars().all()
            
            if zero_order_products:
                print("🛠️ Đang tự động cập nhật số thứ tự sản phẩm...")
                stmt_all = select(models.Product)
                res_all = await db.execute(stmt_all)
                all_products = res_all.scalars().all()
                
                for index, prod in enumerate(all_products):
                    prod.display_order = index + 1
                await db.commit()
                print("✅ Đã xong!")
        except Exception as e:
            print(f"⚠️ Lỗi startup: {e}")

# === GẮN CÁC ROUTER VÀO APP ===
app.include_router(auth.router, prefix="/admin", tags=["Authentication"])
app.include_router(public_menu.router, tags=["Public Menu"])
app.include_router(orders.router, tags=["Orders"]) # Prefix rỗng vì router tự định nghĩa
app.include_router(admin_catalog.router, prefix="/admin", tags=["Admin Catalog"])
app.include_router(admin_store.router, prefix="/admin", tags=["Admin Store"])