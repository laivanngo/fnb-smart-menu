# Tệp: crud.py (FINAL - TÍCH ĐIỂM 10k=1đ, ĐỔI ĐIỂM 1đ=500đ)
from sqlalchemy.orm import Session, joinedload, subqueryload
from sqlalchemy import asc, func
from fastapi import HTTPException
import models, schemas, security
from typing import List, Optional
from datetime import datetime

# ==========================================
# 1. AUTH & ADMIN
# ==========================================
def get_admin_by_username(db: Session, username: str):
    return db.query(models.Admin).filter(models.Admin.username == username).first()

def create_admin(db: Session, admin: schemas.AdminCreate):
    hashed_password = security.get_password_hash(admin.password)
    db_admin = models.Admin(username=admin.username, hashed_password=hashed_password)
    db.add(db_admin)
    db.commit()
    db.refresh(db_admin)
    return db_admin

# ==========================================
# 2. CATEGORY
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
# 3. PRODUCT
# ==========================================
def get_products(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Product)\
        .options(joinedload(models.Product.category))\
        .order_by(models.Product.display_order.asc())\
        .offset(skip).limit(limit).all()

def get_product(db: Session, product_id: int):
    return db.query(models.Product).options(joinedload(models.Product.options).joinedload(models.Option.values)).filter(models.Product.id == product_id).first()

def create_product(db: Session, product: schemas.ProductCreate):
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
# 4. OPTIONS
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

def update_option(db: Session, option_id: int, option_update: schemas.OptionUpdate):
    db_opt = db.query(models.Option).filter(models.Option.id == option_id).first()
    if not db_opt: return None
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

def create_option_value(db: Session, value: schemas.OptionValueCreate, option_id: int):
    db_val = models.OptionValue(**value.model_dump(), option_id=option_id)
    db.add(db_val)
    db.commit()
    db.refresh(db_val)
    return db_val

def update_option_value(db: Session, value_id: int, value_data: schemas.OptionValueUpdate):
    db_val = db.query(models.OptionValue).filter(models.OptionValue.id == value_id).first()
    if not db_val: return None
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

def link_product_to_options(db: Session, product_id: int, option_ids: List[int]):
    db_prod = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not db_prod: return None
    options = db.query(models.Option).filter(models.Option.id.in_(option_ids)).all()
    db_prod.options = options
    db.commit()
    return db_prod

# ==========================================
# 5. PUBLIC MENU
# ==========================================
def get_public_menu(db: Session):
    categories = db.query(models.Category).options(
        subqueryload(models.Category.products).subqueryload(models.Product.options).joinedload(models.Option.values)
    ).order_by(models.Category.display_order).all()
    
    for cat in categories:
        for prod in cat.products:
            prod.options.sort(key=lambda x: x.display_order)
            
    return categories

# ==========================================
# 6. TABLE MANAGEMENT
# ==========================================
def get_tables(db: Session, store_id: Optional[int] = None):
    query = db.query(models.Table)
    if store_id:
        query = query.filter(models.Table.store_id == store_id)
    return query.order_by(models.Table.id).all()

def create_table(db: Session, table: schemas.TableCreate, store_id: Optional[int] = None):
    db_table = models.Table(**table.model_dump(), store_id=store_id)
    db.add(db_table)
    db.commit()
    db.refresh(db_table)
    return db_table

def update_table_status(db: Session, table_id: int, status: models.TableStatus):
    db_table = db.query(models.Table).filter(models.Table.id == table_id).first()
    if db_table:
        db_table.status = status
        db.commit()
        db.refresh(db_table)
    return db_table

# ==========================================
# 7. ORDER & LOGIC (ĐẶT HÀNG & TÍNH TOÁN) - [ĐÃ CẬP NHẬT TÍCH ĐIỂM]
# ==========================================

# CẤU HÌNH TỶ LỆ ĐIỂM
POINT_CONVERSION_RATE = 500  # 1 Điểm = 500 VNĐ (Dùng để giảm giá)
EARN_RATE = 10000            # Tiêu 10.000 VNĐ = Tích 1 Điểm (Dùng để cộng điểm)

def calculate_order_total(db: Session, order_data: schemas.OrderCalculateRequest):
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

    delivery_fee = 15000 if order_data.delivery_method == models.DeliveryMethod.NHANH else 0
    discount_amount = 0
    
    # 1. Tính Voucher (Ưu tiên voucher trước)
    if order_data.voucher_code:
        voucher = db.query(models.Voucher).filter(
            models.Voucher.code == order_data.voucher_code,
            models.Voucher.is_active == True
        ).first()
        if voucher:
            if sub_total >= float(voucher.min_order_value):
                if voucher.type == "fixed":
                    discount_amount = float(voucher.value)
                elif voucher.type == "percentage":
                    discount_amount = sub_total * (float(voucher.value) / 100)
                    if voucher.max_discount is not None and discount_amount > float(voucher.max_discount):
                        discount_amount = float(voucher.max_discount)
    
    # Giới hạn voucher không vượt quá sub_total
    if discount_amount > sub_total: discount_amount = sub_total

    # 2. Tính Điểm thưởng (Nếu khách muốn dùng)
    points_discount = 0
    user_points = 0
    
    if order_data.customer_phone:
        user = db.query(models.User).filter(models.User.phone == order_data.customer_phone).first()
        if user:
            user_points = user.points or 0
            
            # Chỉ tính giảm giá nếu khách có tick vào "Dùng điểm"
            if order_data.use_points and user_points > 0:
                # Tính số tiền còn lại sau khi trừ voucher & phí ship
                temp_total_before_points = sub_total + delivery_fee - discount_amount
                
                # Giá trị tối đa có thể giảm từ điểm
                potential_discount = user_points * POINT_CONVERSION_RATE # Điểm * 500đ
                
                # Không cho giảm quá số tiền phải trả (không âm tiền)
                points_discount = min(potential_discount, temp_total_before_points)
                # Đảm bảo không âm (phòng trường hợp voucher đã cover hết)
                points_discount = max(0, points_discount)

    total_amount = max(0, sub_total + delivery_fee - discount_amount - points_discount)
    
    return schemas.OrderCalculateResponse(
        sub_total=sub_total,
        delivery_fee=delivery_fee,
        discount_amount=discount_amount,
        points_discount=points_discount, # Trả về tiền giảm từ điểm
        total_amount=total_amount,
        user_points_available=user_points, # Trả về số điểm hiện có
        can_use_points=(user_points > 0)
    )

def create_order(db: Session, order: schemas.OrderCreate):
    # 1. Tính toán lại giá (bao gồm cả điểm nếu có)
    calc_result = calculate_order_total(db, schemas.OrderCalculateRequest(
        items=order.items,
        voucher_code=order.voucher_code,
        delivery_method=order.delivery_method,
        customer_phone=order.customer_phone,
        use_points=order.use_points
    ))
    
    # 2. Xử lý User (Tìm hoặc Tạo mới)
    user = None
    if order.customer_phone:
        user = db.query(models.User).filter(models.User.phone == order.customer_phone).first()
        if not user:
            # Tạo khách hàng mới (Silent Registration)
            user = models.User(
                full_name=order.customer_name,
                phone=order.customer_phone,
                role=models.UserRole.CUSTOMER,
                points=0 # Khách mới tinh chưa có điểm
            )
            db.add(user)
            db.commit()
            db.refresh(user)

    # 3. TRỪ ĐIỂM (Nếu khách đã dùng)
    if calc_result.points_discount > 0 and user:
        # Tính ngược lại số điểm cần trừ: Tiền giảm / 500
        points_to_deduct = int(calc_result.points_discount / POINT_CONVERSION_RATE)
        user.points = max(0, user.points - points_to_deduct)
        db.add(user) # Đánh dấu update

    # 4. Tạo đơn hàng
    db_order = models.Order(
        customer_name=order.customer_name,
        customer_phone=order.customer_phone,
        customer_address=order.customer_address,
        customer_note=order.customer_note,
        sub_total=calc_result.sub_total,
        delivery_fee=calc_result.delivery_fee,
        discount_amount=calc_result.discount_amount,
        points_discount=calc_result.points_discount, # Lưu số tiền đã giảm do điểm
        total_amount=calc_result.total_amount,
        delivery_method_selected=order.delivery_method,
        payment_method=order.payment_method,
        voucher_code=order.voucher_code,
        table_id=order.table_id,
        user_id=user.id if user else None # Gắn user vào đơn để sau này cộng điểm
    )
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    
    # 3. Nếu có bàn -> Cập nhật bàn thành CO_KHACH
    if order.table_id:
        update_table_status(db, order.table_id, models.TableStatus.CO_KHACH)

    # 4. Lưu chi tiết món
    for item in order.items:
        db_product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if not db_product: continue

        item_price_at_order = float(db_product.base_price)
        db_item = models.OrderItem(
            order_id=db_order.id,
            product_id=db_product.id,
            product_name=db_product.name,
            quantity=item.quantity,
            item_price=0,
            item_note=item.note,
            ordered_by=item.ordered_by
        )
        db.add(db_item)
        db.commit()
        db.refresh(db_item)
        
        if item.options:
            option_values = db.query(models.OptionValue).filter(models.OptionValue.id.in_(item.options)).all()
            for val in option_values:
                item_price_at_order += float(val.price_adjustment)
                opt_parent = db.query(models.Option).filter(models.Option.id == val.option_id).first()
                db_opt_selected = models.OrderItemOption(
                    order_item_id=db_item.id,
                    option_name=opt_parent.name if opt_parent else "Option",
                    value_name=val.name,
                    added_price=val.price_adjustment
                )
                db.add(db_opt_selected)
        
        db_item.item_price = item_price_at_order
        db.add(db_item)
    
    db.commit()
    db.refresh(db_order)
    return db_order

# ==========================================
# 8. HOÀN TẤT & CỘNG ĐIỂM (EARN POINTS)
# ==========================================
def get_orders(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Order).options(
        subqueryload(models.Order.items).subqueryload(models.OrderItem.options_selected)
    ).order_by(models.Order.id.desc()).offset(skip).limit(limit).all()

def get_order_details(db: Session, order_id: int):
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

def complete_order(db: Session, order_id: int):
    """
    Khi đơn HOÀN TẤT:
    1. Cập nhật trạng thái
    2. Trả bàn (nếu có)
    3. TÍCH ĐIỂM cho khách (10k = 1 điểm)
    """
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order: return None
    
    order.status = models.OrderStatus.HOAN_TAT
    
    if order.table_id:
        update_table_status(db, order.table_id, models.TableStatus.TRONG)
            
    # TÍCH ĐIỂM (Chỉ tích nếu đơn có user_id)
    if order.user_id:
        user = db.query(models.User).filter(models.User.id == order.user_id).first()
        if user:
            # Quy ước: 10,000 VNĐ (trên tổng thực trả) = 1 điểm
            diem_tich_luy = int(order.total_amount / EARN_RATE)
            
            user.points = (user.points or 0) + diem_tich_luy
            user.total_spent = (user.total_spent or 0) + order.total_amount
            user.order_count = (user.order_count or 0) + 1
            user.last_order_date = datetime.now()
            
    db.commit()
    db.refresh(order)
    return order

# ==========================================
# 9. VOUCHER MANAGEMENT
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