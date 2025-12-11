# Tệp: app/main.py (ENTERPRISE - CLEAN)
from dotenv import load_dotenv
load_dotenv() 

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import os

from app.models import models
from app.models.models import SessionLocal

# Import các Router đã chia nhỏ
from app.routers import auth, public_menu, orders, admin_catalog, admin_store

app = FastAPI(title="FNB Smart Menu - Backend API")

# Mount thư mục uploads
UPLOAD_DIRECTORY = "uploads"
STATIC_PATH = "/static"
os.makedirs(UPLOAD_DIRECTORY, exist_ok=True)
app.mount(STATIC_PATH, StaticFiles(directory=UPLOAD_DIRECTORY), name="static")

# Cấu hình CORS
origins = ["*"] # Chỉnh lại thành danh sách cụ thể khi lên Production
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === TỰ ĐỘNG SỬA LỖI & KHỞI TẠO ===
@app.on_event("startup")
def on_startup():
    models.create_tables()
    # Logic tự động sửa lỗi thứ tự hiển thị
    db = SessionLocal()
    try:
        zero_order_products = db.query(models.Product).filter(models.Product.display_order == 0).all()
        if zero_order_products:
            print("🛠️ Đang tự động cập nhật số thứ tự sản phẩm...")
            all_products = db.query(models.Product).all()
            for index, prod in enumerate(all_products):
                prod.display_order = index + 1
            db.commit()
            print("✅ Đã xong!")
    except Exception as e:
        print(f"⚠️ Lỗi startup: {e}")
    finally:
        db.close()

# === GẮN CÁC ROUTER VÀO APP (ĐÃ CHỈNH SỬA ĐỂ KHỚP API CŨ) ===

# 1. Auth (Đường dẫn cũ: /admin/token)
app.include_router(auth.router, prefix="/admin", tags=["Authentication"])

# 2. Public Menu (Đường dẫn cũ: /menu)
app.include_router(public_menu.router, tags=["Public Menu"])

# 3. Orders (QUAN TRỌNG: SỬA LẠI ĐỂ KHỚP API CŨ)
# Router này chứa cả /orders (khách đặt) và /admin/orders (admin xem)
# Nên ta không dùng prefix chung, mà để prefix rỗng, router tự định nghĩa.
app.include_router(orders.router, tags=["Orders"])

# 4. Admin Catalog (Sản phẩm, Danh mục)
# Các API trong admin_catalog.py đã có sẵn chữ /products, /categories...
# Nên ta dùng prefix /admin để thành /admin/products...
app.include_router(admin_catalog.router, prefix="/admin", tags=["Admin Catalog"])

# 5. Admin Store (Bàn, Voucher, Ảnh)
app.include_router(admin_store.router, prefix="/admin", tags=["Admin Store"])