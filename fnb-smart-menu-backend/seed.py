# Tệp: seed.py (ĐÃ CẬP NHẬT THEO Ý BẠN: link_product_to_options)
import os
from dotenv import load_dotenv
load_dotenv() # Nạp biến môi trường

from sqlalchemy.orm import Session
from models import (
    SessionLocal, Category, Product, Option, OptionValue, OptionType, create_tables
)
# Nhập hàm với tên chuẩn semantic
from crud import link_product_to_options 

def seed_data():
    db: Session = SessionLocal()
    try:
        print("🛠️  Đang kết nối Database để kiểm tra...")
        
        category = db.query(Category).filter(Category.name == "Trà Sữa").first()
        if category:
            print("✅ Dữ liệu mẫu đã tồn tại. Không cần nhập lại.")
            return

        print("🚀 Đang thêm dữ liệu mẫu mới...")
        
        # 3. TẠO DANH MỤC
        cat_tra_sua = Category(name="Trà Sữa", display_order=1)
        cat_ca_phe = Category(name="Cà Phê", display_order=2)
        db.add_all([cat_tra_sua, cat_ca_phe])
        db.commit()

        # 4. TẠO SẢN PHẨM
        prod_matcha = Product(
            name="Trà Sữa Matcha", description="Trà xanh Nhật Bản", base_price=35000,
            image_url="🍵", is_best_seller=True, category_id=cat_tra_sua.id, is_out_of_stock=False
        )
        prod_cafe_den = Product(
            name="Cà Phê Đen", description="Cà phê phin đậm đà", base_price=20000,
            image_url="☕", is_best_seller=False, category_id=cat_ca_phe.id, is_out_of_stock=False
        )
        db.add_all([prod_matcha, prod_cafe_den])
        db.commit()

        # 5. TẠO TÙY CHỌN
        # Độ ngọt
        opt_duong = Option(name="Độ ngọt", type=OptionType.CHON_1, display_order=1)
        db.add(opt_duong)
        db.commit() 
        db.add_all([
            OptionValue(name="100% đường", price_adjustment=0, option_id=opt_duong.id),
            OptionValue(name="50% đường", price_adjustment=0, option_id=opt_duong.id)
        ])

        # Size
        opt_size = Option(name="Kích cỡ", type=OptionType.CHON_1, display_order=2)
        db.add(opt_size)
        db.commit()
        db.add_all([
            OptionValue(name="Size Vừa (M)", price_adjustment=0, option_id=opt_size.id),
            OptionValue(name="Size Lớn (L)", price_adjustment=5000, option_id=opt_size.id)
        ])
        
        # Topping
        opt_topping = Option(name="Topping", type=OptionType.CHON_NHIEU, display_order=3)
        db.add(opt_topping)
        db.commit()
        db.add_all([
            OptionValue(name="Thạch dừa", price_adjustment=5000, option_id=opt_topping.id),
            OptionValue(name="Trân châu đen", price_adjustment=7000, option_id=opt_topping.id)
        ])
        
        db.commit()

        # 6. GẮN TÙY CHỌN (Dùng tên hàm mới)
        link_product_to_options(db, prod_matcha.id, [opt_size.id, opt_topping.id, opt_duong.id])
        link_product_to_options(db, prod_cafe_den.id, [opt_duong.id])
        
        print("🎉 Đã thêm dữ liệu mẫu thành công!")

    except Exception as e:
        print(f"❌ Lỗi khi thêm dữ liệu mẫu: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_tables() 
    seed_data()