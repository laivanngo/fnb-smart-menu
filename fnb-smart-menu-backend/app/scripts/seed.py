# Tệp: app/scripts/seed.py (ASYNC VERSION)
import asyncio
import os
import sys

# Thêm đường dẫn gốc
sys.path.append(os.getcwd())

from sqlalchemy.future import select
from app.models.models import AsyncSessionLocal, Category, Product, Option, OptionValue, OptionType
from app.crud.crud import link_product_to_options

async def seed_data():
    async with AsyncSessionLocal() as db:
        try:
            print("🛠️  Đang kết nối Database để kiểm tra dữ liệu mẫu...")
            
            # Check async
            stmt = select(Category).where(Category.name == "Trà Sữa")
            result = await db.execute(stmt)
            category = result.scalars().first()
            
            if category:
                print("✅ Dữ liệu mẫu đã tồn tại. Không cần nhập lại.")
                return

            print("🚀 Đang thêm dữ liệu mẫu mới (Trà sữa, Cà phê)...")
            
            # 1. Tạo Danh mục
            cat_tra_sua = Category(name="Trà Sữa", display_order=1)
            cat_ca_phe = Category(name="Cà Phê", display_order=2)
            db.add_all([cat_tra_sua, cat_ca_phe])
            await db.commit()
            # Refresh để lấy ID
            await db.refresh(cat_tra_sua)
            await db.refresh(cat_ca_phe)

            # 2. Tạo Sản phẩm
            prod_matcha = Product(
                name="Trà Sữa Matcha", description="Trà xanh Nhật Bản", base_price=35000,
                image_url="🍵", is_best_seller=True, category_id=cat_tra_sua.id, is_out_of_stock=False
            )
            prod_cafe_den = Product(
                name="Cà Phê Đen", description="Cà phê phin đậm đà", base_price=20000,
                image_url="☕", is_best_seller=False, category_id=cat_ca_phe.id, is_out_of_stock=False
            )
            db.add_all([prod_matcha, prod_cafe_den])
            await db.commit()
            await db.refresh(prod_matcha)
            await db.refresh(prod_cafe_den)

            # 3. Tạo Tùy chọn (Option)
            # Độ ngọt
            opt_duong = Option(name="Độ ngọt", type=OptionType.CHON_1, display_order=1)
            db.add(opt_duong)
            await db.commit()
            await db.refresh(opt_duong)
            
            db.add_all([
                OptionValue(name="100% đường", price_adjustment=0, option_id=opt_duong.id),
                OptionValue(name="50% đường", price_adjustment=0, option_id=opt_duong.id)
            ])

            # Size
            opt_size = Option(name="Kích cỡ", type=OptionType.CHON_1, display_order=2)
            db.add(opt_size)
            await db.commit()
            await db.refresh(opt_size)
            
            db.add_all([
                OptionValue(name="Size Vừa (M)", price_adjustment=0, option_id=opt_size.id),
                OptionValue(name="Size Lớn (L)", price_adjustment=5000, option_id=opt_size.id)
            ])
            
            await db.commit()

            # 4. Gắn Tùy chọn vào Sản phẩm (Dùng hàm CRUD Async)
            # Lưu ý: link_product_to_options là hàm async nên phải await
            await link_product_to_options(db, prod_matcha.id, [opt_size.id, opt_duong.id])
            await link_product_to_options(db, prod_cafe_den.id, [opt_duong.id])
            
            print("🎉 Đã thêm dữ liệu mẫu thành công!")

        except Exception as e:
            print(f"❌ Lỗi khi thêm dữ liệu mẫu: {e}")
            # await db.rollback() # Có thể thêm rollback nếu cần

if __name__ == "__main__":
    asyncio.run(seed_data())