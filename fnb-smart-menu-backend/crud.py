# Tệp: crud.py (FULL FEATURES - Super App)
from sqlalchemy.orm import Session, joinedload, subqueryload
from sqlalchemy import asc, func
from fastapi import HTTPException
import models, schemas, security
from typing import List

# ==========================================
# 1. AUTH & ADMIN (Đăng nhập)
# ==========================================
def get_admin_by_username(db: Session, username: str):
    # Tạm thời vẫn dùng bảng Admin cũ để login
    return db.query(models.Admin).filter(models.Admin.username == username).first()

def create_admin(db: Session, admin: schemas.AdminCreate):
    hashed_password = security.get_password_hash(admin.password)
    db_admin = models.Admin(username=admin.username, hashed_password=hashed_password)
    db.add(db_admin)
    db.commit()
    db.refresh(db_admin)
    return db_admin

# ==========================================
# 2. CATEGORY (Quản lý Danh mục)
# ==========================================
def get_categories(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Category).order_by(models.Category.display_order).offset(skip).limit(limit).all()

def create_category(db: Session, category: schemas.CategoryCreate):
    db_category = models.Category(name=category.name, display_order=category.display_order)
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

def update_category(db: Session, category_id: int, category: schemas.CategoryUpdate):
    db_cat = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not db_cat: return None
    # Cập nhật các trường có giá trị (không None)
    for key, value in category.model_dump(exclude_unset=True).items():
        setattr(db_cat, key, value)
    db.commit()
    db.refresh(db_cat)
    return db_cat

def delete_category(db: Session, category_id: int):
    db_cat = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not db_cat: return None
    db.delete(db_cat)
    db.commit()
    return db_cat

# ==========================================
# 3. PRODUCT (Quản lý Sản phẩm)
# ==========================================
def get_products(db: Session, skip: int = 0, limit: int = 100):
    # Lấy sản phẩm kèm theo thông tin danh mục
    return db.query(models.Product)\
        .options(joinedload(models.Product.category))\
        .order_by(models.Product.display_order.asc())\
        .offset(skip).limit(limit).all()

def get_product(db: Session, product_id: int):
    # Lấy chi tiết sản phẩm kèm options
    return db.query(models.Product).options(joinedload(models.Product.options).joinedload(models.Option.values)).filter(models.Product.id == product_id).first()

def create_product(db: Session, product: schemas.ProductCreate):
    # Kiểm tra danh mục có tồn tại không
    cat = db.query(models.Category).filter(models.Category.id == product.category_id).first()
    if not cat: return None
    
    db_product = models.Product(**product.model_dump())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

def update_product(db: Session, product_id: int, product: schemas.ProductUpdate):
    db_prod = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not db_prod: return None
    for key, value in product.model_dump(exclude_unset=True).items():
        setattr(db_prod, key, value)
    db.commit()
    db.refresh(db_prod)
    return db_prod

def delete_product(db: Session, product_id: int):
    db_prod = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not db_prod: return None
    db.delete(db_prod)
    db.commit()
    return db_prod

# ==========================================
# 4. OPTIONS (Quản lý Tùy chọn: Size, Đường, Đá...)
# ==========================================
def get_options(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Option)\
        .options(joinedload(models.Option.values))\
        .order_by(models.Option.display_order.asc())\
        .offset(skip).limit(limit).all()

def create_option(db: Session, option: schemas.OptionCreate):
    db_option = models.Option(name=option.name, type=option.type, display_order=option.display_order)
    db.add(db_option)
    db.commit()
    db.refresh(db_option)
    return db_option

def create_option_value(db: Session, value: schemas.OptionValueCreate, option_id: int):
    # Tạo giá trị con (vd: Size L, Size M)
    db_val = models.OptionValue(**value.model_dump(), option_id=option_id)
    db.add(db_val)
    db.commit()
    db.refresh(db_val)
    return db_val

def link_product_to_options(db: Session, product_id: int, option_ids: List[int]):
    # Gán các nhóm tùy chọn vào sản phẩm
    db_prod = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not db_prod: return None
    
    options = db.query(models.Option).filter(models.Option.id.in_(option_ids)).all()
    db_prod.options = options
    db.commit()
    return db_prod

# ==========================================
# 5. PUBLIC MENU (API cho Khách hàng xem Menu)
# ==========================================
def get_public_menu(db: Session):
    # Lấy toàn bộ menu với cấu trúc lồng nhau: Category -> Product -> Option -> Value
    # Sử dụng subqueryload để tối ưu hiệu suất truy vấn
    categories = db.query(models.Category).options(
        subqueryload(models.Category.products).subqueryload(models.Product.options).joinedload(models.Option.values)
    ).order_by(models.Category.display_order).all()
    
    # Sắp xếp thủ công options theo display_order (nếu DB chưa sắp xếp)
    for cat in categories:
        for prod in cat.products:
            prod.options.sort(key=lambda x: x.display_order)
            
    return categories

# ==========================================
# 6. ORDER & CALCULATE (Tính tiền & Đặt hàng)
# ==========================================
def calculate_order_total(db: Session, order_data: schemas.OrderCalculateRequest):
    # 1. Tính tổng tiền hàng (Subtotal)
    sub_total = 0
    
    for item in order_data.items:
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if not product: continue
        
        item_price = float(product.base_price)
        
        if item.options:
            option_values = db.query(models.OptionValue).filter(models.OptionValue.id.in_(item.options)).all()
            for val in option_values:
                item_price += float(val.price_adjustment)
        
        sub_total += item_price * item.quantity

    # 2. Tính phí giao hàng
    delivery_fee = 15000 if order_data.delivery_method == models.DeliveryMethod.NHANH else 0
    
    # 3. XỬ LÝ VOUCHER (LOGIC MỚI)
    discount_amount = 0
    
    # Nếu khách có gửi mã lên
    if order_data.voucher_code:
        # Tìm voucher trong DB (phải đang kích hoạt)
        voucher = db.query(models.Voucher).filter(
            models.Voucher.code == order_data.voucher_code,
            models.Voucher.is_active == True
        ).first()
        
        # Nếu tìm thấy voucher
        if voucher:
            # Kiểm tra: Đơn hàng có đủ giá trị tối thiểu không?
            if sub_total >= float(voucher.min_order_value):
                
                # Trường hợp 1: Giảm số tiền cố định (Fixed)
                if voucher.type == "fixed":
                    discount_amount = float(voucher.value)
                
                # Trường hợp 2: Giảm theo phần trăm (Percentage)
                elif voucher.type == "percentage":
                    discount_amount = sub_total * (float(voucher.value) / 100)
                    
                    # Kiểm tra: Có vượt quá mức giảm tối đa không?
                    if voucher.max_discount is not None and discount_amount > float(voucher.max_discount):
                        discount_amount = float(voucher.max_discount)
            else:
                # Nếu không đủ điều kiện đơn tối thiểu -> Không giảm
                print(f"Voucher {voucher.code} yêu cầu đơn tối thiểu {voucher.min_order_value}")

    # Đảm bảo tiền giảm không lớn hơn tiền hàng (không để âm tiền)
    if discount_amount > sub_total:
        discount_amount = sub_total

    # 4. Tổng cuối cùng
    total_amount = sub_total + delivery_fee - discount_amount
    
    return schemas.OrderCalculateResponse(
        sub_total=sub_total,
        delivery_fee=delivery_fee,
        discount_amount=discount_amount,
        total_amount=total_amount if total_amount > 0 else 0
    )

def create_order(db: Session, order: schemas.OrderCreate):
    # Tính toán lại giá tiền lần cuối ở server để bảo mật (không tin client gửi lên)
    calc_result = calculate_order_total(db, schemas.OrderCalculateRequest(
        items=order.items,
        voucher_code=order.voucher_code,
        delivery_method=order.delivery_method
    ))
    
    # Tạo đơn hàng
    db_order = models.Order(
        customer_name=order.customer_name,
        customer_phone=order.customer_phone,
        customer_address=order.customer_address,
        customer_note=order.customer_note,
        sub_total=calc_result.sub_total,
        delivery_fee=calc_result.delivery_fee,
        discount_amount=calc_result.discount_amount,
        total_amount=calc_result.total_amount,
        delivery_method_selected=order.delivery_method,
        payment_method=order.payment_method,
        voucher_code=order.voucher_code
    )
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    
    # Lưu chi tiết món ăn (Order Items)
    for item in order.items:
        # Lấy thông tin sản phẩm
        db_product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if not db_product: continue

        # Tính giá của item này tại thời điểm đặt
        item_price_at_order = float(db_product.base_price)
        
        # Tạo OrderItem
        db_item = models.OrderItem(
            order_id=db_order.id,
            product_id=db_product.id,
            product_name=db_product.name,
            quantity=item.quantity,
            item_price=0, # Sẽ update sau khi cộng option
            item_note=item.note,
            ordered_by=item.ordered_by
        )
        db.add(db_item)
        db.commit()
        db.refresh(db_item)
        
        # Lưu options đã chọn và cộng giá
        if item.options:
            option_values = db.query(models.OptionValue).filter(models.OptionValue.id.in_(item.options)).all()
            for val in option_values:
                item_price_at_order += float(val.price_adjustment)
                
                # Lưu chi tiết option đã chọn
                # Tìm tên option cha
                opt_parent = db.query(models.Option).filter(models.Option.id == val.option_id).first()
                
                db_opt_selected = models.OrderItemOption(
                    order_item_id=db_item.id,
                    option_name=opt_parent.name if opt_parent else "Option",
                    value_name=val.name,
                    added_price=val.price_adjustment
                )
                db.add(db_opt_selected)
        
        # Update giá cuối cùng của item
        db_item.item_price = item_price_at_order
        db.add(db_item)
    
    db.commit()
    db.refresh(db_order)
    return db_order

# ==========================================
# 7. ADMIN ORDER VIEW (Xem đơn hàng)
# ==========================================
def get_orders(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Order).options(
        subqueryload(models.Order.items).subqueryload(models.OrderItem.options_selected)
    ).order_by(models.Order.id.desc()).offset(skip).limit(limit).all()

def get_order_details(db: Session, order_id: int):
    # Lấy đơn hàng kèm theo items và options đã chọn
    return db.query(models.Order).options(
        subqueryload(models.Order.items).subqueryload(models.OrderItem.options_selected)
    ).filter(models.Order.id == order_id).first()

def update_order_status(db: Session, order_id: int, status: models.OrderStatus):
    db_order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if db_order:
        db_order.status = status
        db.commit()
        db.refresh(db_order)
    return db_order

# ==========================================
# 8. QUẢN LÝ GIÁ TRỊ TÙY CHỌN (OPTION VALUES) - Thêm mới đoạn này
# ==========================================
def update_option_value(db: Session, value_id: int, value_data: schemas.OptionValueUpdate):
    db_val = db.query(models.OptionValue).filter(models.OptionValue.id == value_id).first()
    if not db_val: return None
    
    # Chỉ cập nhật những trường được gửi lên (exclude_unset=True)
    for key, value in value_data.model_dump(exclude_unset=True).items():
        setattr(db_val, key, value)
        
    db.commit()
    db.refresh(db_val)
    return db_val

def delete_option_value(db: Session, value_id: int):
    db_val = db.query(models.OptionValue).filter(models.OptionValue.id == value_id).first()
    if not db_val: return None
    db.delete(db_val)
    db.commit()
    return db_val

# ==========================================
# 9. QUẢN LÝ NHÓM TÙY CHỌN (OPTIONS) - Thêm mới đoạn này
# ==========================================
def update_option(db: Session, option_id: int, option_update: schemas.OptionUpdate):
    db_opt = db.query(models.Option).filter(models.Option.id == option_id).first()
    if not db_opt: return None
    
    # Cập nhật các trường (tên, thứ tự, loại...)
    for key, value in option_update.model_dump(exclude_unset=True).items():
        setattr(db_opt, key, value)
        
    db.commit()
    db.refresh(db_opt)
    return db_opt

def delete_option(db: Session, option_id: int):
    db_opt = db.query(models.Option).filter(models.Option.id == option_id).first()
    if not db_opt: return None
    db.delete(db_opt)
    db.commit()
    return db_opt

# ==========================================
# 10. QUẢN LÝ VOUCHER (MÃ GIẢM GIÁ) - Thêm mới đoạn này
# ==========================================
def get_vouchers(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Voucher).offset(skip).limit(limit).all()

def create_voucher(db: Session, voucher: schemas.VoucherCreate):
    db_voucher = models.Voucher(**voucher.model_dump())
    db.add(db_voucher)
    db.commit()
    db.refresh(db_voucher)
    return db_voucher

def update_voucher(db: Session, voucher_id: int, voucher: schemas.VoucherCreate):
    db_voucher = db.query(models.Voucher).filter(models.Voucher.id == voucher_id).first()
    if not db_voucher: return None
    # Cập nhật các trường
    for key, value in voucher.model_dump(exclude_unset=True).items():
        setattr(db_voucher, key, value)
    db.commit()
    db.refresh(db_voucher)
    return db_voucher

def delete_voucher(db: Session, voucher_id: int):
    db_voucher = db.query(models.Voucher).filter(models.Voucher.id == voucher_id).first()
    if not db_voucher: return None
    db.delete(db_voucher)
    db.commit()
    return db_voucher