# Tệp: app/crud/crud.py (FULL ASYNC - ĐÃ VIẾT LẠI HOÀN TOÀN)
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload, joinedload
from sqlalchemy import desc, update, delete
import logging
from typing import List, Optional
from datetime import datetime

# Import các thành phần từ app
from app.models import models
from app.schemas import schemas
from app.core import security

# ==========================================
# 1. AUTH & ADMIN
# ==========================================
async def get_admin_by_username(db: AsyncSession, username: str):
    stmt = select(models.Admin).where(models.Admin.username == username)
    result = await db.execute(stmt)
    return result.scalars().first()

async def create_admin(db: AsyncSession, admin: schemas.AdminCreate):
    hashed_password = security.get_password_hash(admin.password)
    db_admin = models.Admin(username=admin.username, hashed_password=hashed_password)
    db.add(db_admin)
    await db.commit()
    await db.refresh(db_admin)
    return db_admin

# ==========================================
# 2. CATEGORY
# ==========================================
async def get_categories(db: AsyncSession, skip: int = 0, limit: int = 100):
    stmt = select(models.Category).order_by(models.Category.display_order).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()

async def create_category(db: AsyncSession, category: schemas.CategoryCreate):
    db_category = models.Category(name=category.name, display_order=category.display_order)
    db.add(db_category)
    await db.commit()
    await db.refresh(db_category)
    return db_category

async def update_category(db: AsyncSession, category_id: int, category: schemas.CategoryUpdate):
    stmt = select(models.Category).where(models.Category.id == category_id)
    result = await db.execute(stmt)
    db_cat = result.scalars().first()
    
    if not db_cat: return None
    
    for key, value in category.model_dump(exclude_unset=True).items():
        setattr(db_cat, key, value)
    
    await db.commit()
    await db.refresh(db_cat)
    return db_cat

async def delete_category(db: AsyncSession, category_id: int):
    stmt = select(models.Category).where(models.Category.id == category_id)
    result = await db.execute(stmt)
    db_cat = result.scalars().first()
    
    if not db_cat: return None
    
    await db.delete(db_cat)
    await db.commit()
    return db_cat

# ==========================================
# 3. PRODUCT
# ==========================================
async def get_products(db: AsyncSession, skip: int = 0, limit: int = 100):
    stmt = select(models.Product)\
        .options(
            selectinload(models.Product.category),
            # Load sâu: Product -> Options -> Values
            selectinload(models.Product.options).selectinload(models.Option.values) 
        )\
        .order_by(models.Product.display_order.asc())\
        .offset(skip).limit(limit)
    
    result = await db.execute(stmt)
    return result.scalars().all()

async def get_product(db: AsyncSession, product_id: int):
    stmt = select(models.Product)\
        .options(selectinload(models.Product.options).selectinload(models.Option.values))\
        .where(models.Product.id == product_id)
    result = await db.execute(stmt)
    return result.scalars().first()

async def create_product(db: AsyncSession, product: schemas.ProductCreate):
    stmt = select(models.Category).where(models.Category.id == product.category_id)
    result = await db.execute(stmt)
    cat = result.scalars().first()
    
    if not cat: return None
    
    db_product = models.Product(**product.model_dump())
    db.add(db_product)
    await db.commit()
    await db.refresh(db_product)
    return db_product

async def update_product(db: AsyncSession, product_id: int, product: schemas.ProductUpdate):
    # 1. Tìm sản phẩm
    stmt = select(models.Product).where(models.Product.id == product_id)
    result = await db.execute(stmt)
    db_prod = result.scalars().first()
    
    if not db_prod: return None
    
    # 2. Cập nhật dữ liệu
    for key, value in product.model_dump(exclude_unset=True).items():
        setattr(db_prod, key, value)
    
    await db.commit()
    
    # 3. [FIX QUAN TRỌNG] Refresh và Load lại Options để trả về cho Schema
    # Refresh để lấy data mới nhất từ DB
    await db.refresh(db_prod) 
    
    # Query lại lần nữa để nạp mối quan hệ (Eager Loading)
    # Vì db.refresh không nạp được relationship trong async
    stmt_reload = select(models.Product)\
        .options(
            selectinload(models.Product.category),
            selectinload(models.Product.options).selectinload(models.Option.values)
        )\
        .where(models.Product.id == product_id)
        
    result_reload = await db.execute(stmt_reload)
    return result_reload.scalars().first()

async def delete_product(db: AsyncSession, product_id: int):
    stmt = select(models.Product).where(models.Product.id == product_id)
    result = await db.execute(stmt)
    db_prod = result.scalars().first()
    
    if not db_prod: return None
    
    await db.delete(db_prod)
    await db.commit()
    return db_prod

# ==========================================
# 4. OPTIONS
# ==========================================
async def get_options(db: AsyncSession, skip: int = 0, limit: int = 100):
    stmt = select(models.Option)\
        .options(selectinload(models.Option.values))\
        .order_by(models.Option.display_order.asc())\
        .offset(skip).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()

async def create_option(db: AsyncSession, option: schemas.OptionCreate):
    db_option = models.Option(name=option.name, type=option.type, display_order=option.display_order)
    db.add(db_option)
    await db.commit()
    await db.refresh(db_option)
    return db_option

async def update_option(db: AsyncSession, option_id: int, option_update: schemas.OptionUpdate):
    stmt = select(models.Option).where(models.Option.id == option_id)
    result = await db.execute(stmt)
    db_opt = result.scalars().first()
    
    if not db_opt: return None
    
    for key, value in option_update.model_dump(exclude_unset=True).items():
        setattr(db_opt, key, value)
    
    await db.commit()
    await db.refresh(db_opt)
    return db_opt

async def delete_option(db: AsyncSession, option_id: int):
    stmt = select(models.Option).where(models.Option.id == option_id)
    result = await db.execute(stmt)
    db_opt = result.scalars().first()
    
    if not db_opt: return None
    
    await db.delete(db_opt)
    await db.commit()
    return db_opt

async def create_option_value(db: AsyncSession, value: schemas.OptionValueCreate, option_id: int):
    db_val = models.OptionValue(**value.model_dump(), option_id=option_id)
    db.add(db_val)
    await db.commit()
    await db.refresh(db_val)
    return db_val

async def update_option_value(db: AsyncSession, value_id: int, value_data: schemas.OptionValueUpdate):
    stmt = select(models.OptionValue).where(models.OptionValue.id == value_id)
    result = await db.execute(stmt)
    db_val = result.scalars().first()
    
    if not db_val: return None
    
    for key, value in value_data.model_dump(exclude_unset=True).items():
        setattr(db_val, key, value)
    
    await db.commit()
    await db.refresh(db_val)
    return db_val

async def delete_option_value(db: AsyncSession, value_id: int):
    stmt = select(models.OptionValue).where(models.OptionValue.id == value_id)
    result = await db.execute(stmt)
    db_val = result.scalars().first()
    
    if not db_val: return None
    
    await db.delete(db_val)
    await db.commit()
    return db_val

async def link_product_to_options(db: AsyncSession, product_id: int, option_ids: List[int]):
    # 1. Lấy sản phẩm (cần load options để gán)
    stmt = select(models.Product)\
        .options(selectinload(models.Product.options))\
        .where(models.Product.id == product_id)
    
    result = await db.execute(stmt)
    db_prod = result.scalars().first()
    
    if not db_prod: return None
    
    # 2. Lấy danh sách options mới
    stmt_opts = select(models.Option).where(models.Option.id.in_(option_ids))
    result_opts = await db.execute(stmt_opts)
    options = result_opts.scalars().all()
    
    # 3. Cập nhật quan hệ
    db_prod.options = list(options) 
    await db.commit()
    
    # [FIX QUAN TRỌNG]: Query lại lần nữa để load sâu (Product -> Options -> Values)
    # Vì Pydantic Schema yêu cầu trả về cấu trúc lồng nhau đầy đủ
    stmt_reload = select(models.Product)\
        .options(
            selectinload(models.Product.category),
            selectinload(models.Product.options).selectinload(models.Option.values)
        )\
        .where(models.Product.id == product_id)
        
    result_reload = await db.execute(stmt_reload)
    return result_reload.scalars().first()

# ==========================================
# 5. PUBLIC MENU
# ==========================================
async def get_public_menu(db: AsyncSession):
    # Load sâu để lấy menu đầy đủ: Categories -> Products -> Options -> Values
    stmt = select(models.Category).options(
        selectinload(models.Category.products).options(
            selectinload(models.Product.options).selectinload(models.Option.values)
        )
    ).order_by(models.Category.display_order)
    
    result = await db.execute(stmt)
    categories = result.scalars().all()
    
    # Sort options thủ công vì sort trong query nested phức tạp
    for cat in categories:
        for prod in cat.products:
            prod.options.sort(key=lambda x: x.display_order)
            
    return categories

# ==========================================
# 6. TABLE MANAGEMENT
# ==========================================
async def get_tables(db: AsyncSession, store_id: Optional[int] = None):
    stmt = select(models.Table)
    if store_id:
        stmt = stmt.where(models.Table.store_id == store_id)
    stmt = stmt.order_by(models.Table.id)
    
    result = await db.execute(stmt)
    return result.scalars().all()

async def create_table(db: AsyncSession, table: schemas.TableCreate, store_id: Optional[int] = None):
    db_table = models.Table(**table.model_dump(), store_id=store_id)
    db.add(db_table)
    await db.commit()
    await db.refresh(db_table)
    return db_table

async def update_table_status(db: AsyncSession, table_id: int, status: models.TableStatus):
    stmt = select(models.Table).where(models.Table.id == table_id)
    result = await db.execute(stmt)
    db_table = result.scalars().first()
    
    if db_table:
        db_table.status = status
        await db.commit()
        await db.refresh(db_table)
    return db_table

# ==========================================
# 7. ORDER & LOGIC
# ==========================================
POINT_CONVERSION_RATE = 500
EARN_RATE = 10000

async def calculate_order_total(db: AsyncSession, order_data: schemas.OrderCalculateRequest):
    sub_total = 0
    
    # Lặp qua từng món để tính tiền (Async cần xử lý khéo trong loop)
    for item in order_data.items:
        # Lấy thông tin sản phẩm
        stmt_prod = select(models.Product).where(models.Product.id == item.product_id)
        res_prod = await db.execute(stmt_prod)
        product = res_prod.scalars().first()
        
        if not product: continue
        
        item_price = float(product.base_price)
        
        # Tính tiền topping
        if item.options:
            stmt_opts = select(models.OptionValue).where(models.OptionValue.id.in_(item.options))
            res_opts = await db.execute(stmt_opts)
            option_values = res_opts.scalars().all()
            
            for val in option_values:
                item_price += float(val.price_adjustment)
        
        sub_total += item_price * item.quantity

    delivery_fee = 15000 if order_data.delivery_method == models.DeliveryMethod.NHANH else 0
    discount_amount = 0
    
    # Tính Voucher
    if order_data.voucher_code:
        stmt_voucher = select(models.Voucher).where(
            models.Voucher.code == order_data.voucher_code,
            models.Voucher.is_active == True
        )
        res_voucher = await db.execute(stmt_voucher)
        voucher = res_voucher.scalars().first()
        
        if voucher:
            if sub_total >= float(voucher.min_order_value):
                if voucher.type == "fixed":
                    discount_amount = float(voucher.value)
                elif voucher.type == "percentage":
                    discount_amount = sub_total * (float(voucher.value) / 100)
                    if voucher.max_discount is not None and discount_amount > float(voucher.max_discount):
                        discount_amount = float(voucher.max_discount)
    
    if discount_amount > sub_total: discount_amount = sub_total

    points_discount = 0
    user_points = 0
    
    # Tính điểm
    if order_data.customer_phone:
        stmt_user = select(models.User).where(models.User.phone == order_data.customer_phone)
        res_user = await db.execute(stmt_user)
        user = res_user.scalars().first()
        
        if user:
            user_points = user.points or 0
            if order_data.use_points and user_points > 0:
                temp_total_before_points = sub_total + delivery_fee - discount_amount
                potential_discount = user_points * POINT_CONVERSION_RATE
                points_discount = min(potential_discount, temp_total_before_points)
                points_discount = max(0, points_discount)

    total_amount = max(0, sub_total + delivery_fee - discount_amount - points_discount)
    
    return schemas.OrderCalculateResponse(
        sub_total=sub_total,
        delivery_fee=delivery_fee,
        discount_amount=discount_amount,
        points_discount=points_discount,
        total_amount=total_amount,
        user_points_available=user_points,
        can_use_points=(user_points > 0)
    )

async def create_order(db: AsyncSession, order: schemas.OrderCreate):
    # Tái sử dụng logic tính toán (phải await)
    calc_result = await calculate_order_total(db, schemas.OrderCalculateRequest(
        items=order.items,
        voucher_code=order.voucher_code,
        delivery_method=order.delivery_method,
        customer_phone=order.customer_phone,
        use_points=order.use_points
    ))
    
    # Xử lý User
    user = None
    if order.customer_phone:
        stmt_user = select(models.User).where(models.User.phone == order.customer_phone)
        res_user = await db.execute(stmt_user)
        user = res_user.scalars().first()
        
        if not user:
            user = models.User(
                full_name=order.customer_name,
                phone=order.customer_phone,
                role=models.UserRole.CUSTOMER,
                points=0
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)

    # Trừ điểm
    if calc_result.points_discount > 0 and user:
        points_to_deduct = int(calc_result.points_discount / POINT_CONVERSION_RATE)
        user.points = max(0, user.points - points_to_deduct)
        db.add(user) # Đánh dấu update

    # Tạo Order
    db_order = models.Order(
        customer_name=order.customer_name,
        customer_phone=order.customer_phone,
        customer_address=order.customer_address,
        customer_note=order.customer_note,
        sub_total=calc_result.sub_total,
        delivery_fee=calc_result.delivery_fee,
        discount_amount=calc_result.discount_amount,
        points_discount=calc_result.points_discount,
        total_amount=calc_result.total_amount,
        delivery_method_selected=order.delivery_method,
        payment_method=order.payment_method,
        voucher_code=order.voucher_code,
        table_id=order.table_id,
        user_id=user.id if user else None
    )
    db.add(db_order)
    await db.commit()
    await db.refresh(db_order)
    
    # Cập nhật trạng thái bàn
    if order.table_id:
        await update_table_status(db, order.table_id, models.TableStatus.CO_KHACH)

    # Lưu chi tiết món
    for item in order.items:
        stmt_prod = select(models.Product).where(models.Product.id == item.product_id)
        res_prod = await db.execute(stmt_prod)
        db_product = res_prod.scalars().first()
        
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
        await db.commit()
        await db.refresh(db_item)
        
        if item.options:
            stmt_opts = select(models.OptionValue).where(models.OptionValue.id.in_(item.options))
            res_opts = await db.execute(stmt_opts)
            option_values = res_opts.scalars().all()
            
            for val in option_values:
                item_price_at_order += float(val.price_adjustment)
                
                stmt_parent = select(models.Option).where(models.Option.id == val.option_id)
                res_parent = await db.execute(stmt_parent)
                opt_parent = res_parent.scalars().first()
                
                db_opt_selected = models.OrderItemOption(
                    order_item_id=db_item.id,
                    option_name=opt_parent.name if opt_parent else "Option",
                    value_name=val.name,
                    added_price=val.price_adjustment
                )
                db.add(db_opt_selected)
        
        # Cập nhật giá cuối cùng của item (đã cộng topping)
        db_item.item_price = item_price_at_order
        db.add(db_item)
    
    await db.commit()
    await db.refresh(db_order)
    return db_order

async def get_orders(db: AsyncSession, skip: int = 0, limit: int = 100):
    stmt = select(models.Order).options(
        selectinload(models.Order.items).selectinload(models.OrderItem.options_selected)
    ).order_by(desc(models.Order.id)).offset(skip).limit(limit)
    
    result = await db.execute(stmt)
    return result.scalars().all()

async def get_order_details(db: AsyncSession, order_id: int):
    stmt = select(models.Order).options(
        selectinload(models.Order.items).selectinload(models.OrderItem.options_selected)
    ).where(models.Order.id == order_id)
    
    result = await db.execute(stmt)
    return result.scalars().first()

async def update_order_status(db: AsyncSession, order_id: int, status: models.OrderStatus):
    stmt = select(models.Order).where(models.Order.id == order_id)
    result = await db.execute(stmt)
    db_order = result.scalars().first()
    
    if db_order:
        db_order.status = status
        await db.commit()
        await db.refresh(db_order)
    return db_order

async def complete_order(db: AsyncSession, order_id: int):
    stmt = select(models.Order).where(models.Order.id == order_id)
    result = await db.execute(stmt)
    order = result.scalars().first()
    
    if not order: return None
    
    order.status = models.OrderStatus.HOAN_TAT
    
    if order.table_id:
        await update_table_status(db, order.table_id, models.TableStatus.TRONG)
            
    if order.user_id:
        stmt_user = select(models.User).where(models.User.id == order.user_id)
        res_user = await db.execute(stmt_user)
        user = res_user.scalars().first()
        
        if user:
            diem_tich_luy = int(order.total_amount / EARN_RATE)
            user.points = (user.points or 0) + diem_tich_luy
            user.total_spent = (user.total_spent or 0) + order.total_amount
            user.order_count = (user.order_count or 0) + 1
            user.last_order_date = datetime.now()
            
    await db.commit()
    await db.refresh(order)
    return order

# ==========================================
# 9. VOUCHER MANAGEMENT
# ==========================================
async def get_vouchers(db: AsyncSession, skip: int = 0, limit: int = 100):
    stmt = select(models.Voucher).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()

async def create_voucher(db: AsyncSession, voucher: schemas.VoucherCreate):
    db_voucher = models.Voucher(**voucher.model_dump())
    db.add(db_voucher)
    await db.commit()
    await db.refresh(db_voucher)
    return db_voucher

async def update_voucher(db: AsyncSession, voucher_id: int, voucher: schemas.VoucherCreate):
    stmt = select(models.Voucher).where(models.Voucher.id == voucher_id)
    result = await db.execute(stmt)
    db_voucher = result.scalars().first()
    
    if not db_voucher: return None
    
    for key, value in voucher.model_dump(exclude_unset=True).items():
        setattr(db_voucher, key, value)
        
    await db.commit()
    await db.refresh(db_voucher)
    return db_voucher

async def delete_voucher(db: AsyncSession, voucher_id: int):
    stmt = select(models.Voucher).where(models.Voucher.id == voucher_id)
    result = await db.execute(stmt)
    db_voucher = result.scalars().first()
    
    if not db_voucher: return None
    
    await db.delete(db_voucher)
    await db.commit()
    return db_voucher