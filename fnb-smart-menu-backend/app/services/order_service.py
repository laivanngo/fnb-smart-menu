# Tệp: app/services/order_service.py (LOGIC NGHIỆP VỤ)
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import datetime

from app.crud import crud
from app.schemas import schemas
from app.models import models

# Các hằng số Business Logic
POINT_CONVERSION_RATE = 500  # 1 điểm = 500đ
EARN_RATE = 10000            # 10.000đ = 1 điểm
DELIVERY_FEE_FAST = 15000

class OrderService:
    
    # 1. LOGIC TÍNH TIỀN (Phức tạp nhất nằm ở đây)
    @staticmethod
    async def calculate_total(db: AsyncSession, order_data: schemas.OrderCalculateRequest):
        sub_total = 0
        order_items_prepared = [] # Lưu lại để dùng khi tạo đơn, đỡ query lại

        # A. Tính tiền món + Topping
        for item in order_data.items:
            # Lấy giá gốc từ DB (Không tin tưởng giá từ Frontend)
            product = await crud.get_product(db, item.product_id)
            if not product: continue
            
            unit_price = float(product.base_price)
            selected_options = []

            if item.options:
                # Lấy giá topping từ DB
                option_values = await crud.get_option_values_by_ids(db, item.options)
                for val in option_values:
                    unit_price += float(val.price_adjustment)
                    # Lưu lại thông tin option để sau này insert vào OrderItemOption
                    selected_options.append({
                        "value_name": val.name,
                        "added_price": float(val.price_adjustment),
                        "option_id": val.option_id # Cần query thêm tên option cha nếu muốn kỹ
                    })
            
            line_total = unit_price * item.quantity
            sub_total += line_total
            
            # Chuẩn bị data cho bước Create Order (để đỡ query lại)
            order_items_prepared.append({
                "product_id": product.id,
                "product_name": product.name,
                "quantity": item.quantity,
                "final_price": line_total, # Giá tổng của line này (hoặc đơn giá tùy thiết kế)
                "note": item.note,
                "ordered_by": item.ordered_by,
                "options_selected": selected_options # Tạm thời chưa có option_name, sẽ fix ở crud nếu cần
            })

        # B. Tính Phí Ship
        delivery_fee = DELIVERY_FEE_FAST if order_data.delivery_method == models.DeliveryMethod.NHANH else 0
        
        # C. Tính Voucher
        discount_amount = 0
        if order_data.voucher_code:
            voucher = await crud.get_voucher_by_code(db, order_data.voucher_code)
            if voucher:
                if sub_total >= float(voucher.min_order_value):
                    if voucher.type == "fixed":
                        discount_amount = float(voucher.value)
                    elif voucher.type == "percentage":
                        discount_amount = sub_total * (float(voucher.value) / 100)
                        if voucher.max_discount and discount_amount > float(voucher.max_discount):
                            discount_amount = float(voucher.max_discount)
        
        if discount_amount > sub_total: discount_amount = sub_total

        # D. Tính Điểm (Nếu khách muốn dùng)
        points_discount = 0
        user_points_available = 0
        
        if order_data.customer_phone:
            user = await crud.get_user_by_phone(db, order_data.customer_phone)
            if user:
                user_points_available = user.points or 0
                if order_data.use_points and user_points_available > 0:
                    temp_total = sub_total + delivery_fee - discount_amount
                    max_discount_by_points = user_points_available * POINT_CONVERSION_RATE
                    points_discount = min(max_discount_by_points, temp_total)
                    points_discount = max(0, points_discount)

        total_amount = max(0, sub_total + delivery_fee - discount_amount - points_discount)

        return {
            "sub_total": sub_total,
            "delivery_fee": delivery_fee,
            "discount_amount": discount_amount,
            "points_discount": points_discount,
            "total_amount": total_amount,
            "user_points_available": user_points_available,
            "can_use_points": user_points_available > 0,
            "items_prepared": order_items_prepared # Dữ liệu phụ để dùng khi create order
        }

    # 2. LOGIC TẠO ĐƠN (Orchestrator - Nhạc trưởng)
    @staticmethod
    async def place_order(db: AsyncSession, order_in: schemas.OrderCreate):
        # Bước 1: Tính toán lại tất cả (Security check)
        calc_result = await OrderService.calculate_total(db, order_in)
        
        # Bước 2: Xử lý User (CRM)
        user = None
        if order_in.customer_phone:
            user = await crud.get_user_by_phone(db, order_in.customer_phone)
            if not user:
                # Silent Registration (Tạo user ngầm)
                user = await crud.create_user(db, {
                    "full_name": order_in.customer_name,
                    "phone": order_in.customer_phone,
                    "role": models.UserRole.CUSTOMER,
                    "points": 0
                })
        
        # Bước 3: Trừ điểm (Nếu dùng)
        if calc_result['points_discount'] > 0 and user:
            points_used = int(calc_result['points_discount'] / POINT_CONVERSION_RATE)
            await crud.update_user_points(db, user.id, -points_used)

        # Bước 4: Lưu Đơn Hàng (Gọi CRUD thuần)
        db_order = await crud.create_order_record(db, order_in, calc_result, user.id if user else None)
        
        # Bước 5: Lưu Chi Tiết Món
        # Lưu ý: Ta cần map lại option_name cho đúng (vì ở bước calculate mới chỉ có value)
        # Để đơn giản, ta sẽ để crud tự xử lý hoặc làm ở đây.
        # Ở đây ta dùng lại data đã prepare ở bước calculate cho nhanh
        
        # Cần một chút xử lý để lấy option_name chuẩn cho items_prepared
        # (Để đơn giản hóa, ta giả định CRUD sẽ handle hoặc chấp nhận thiếu option_name tạm thời)
        # Thực tế nên query tên Option cha ở đây.
        
        await crud.create_order_items(db, db_order.id, calc_result['items_prepared'])
        
        # Bước 6: Cập nhật trạng thái Bàn
        if order_in.table_id:
            await crud.update_table_status(db, order_in.table_id, models.TableStatus.CO_KHACH)
            
        # Bước 7 (Tương lai): Gửi Zalo/SMS ở đây
        # await zalo_service.send_order_notification(...)
        
        return db_order

    # 3. LOGIC HOÀN TẤT ĐƠN (Tích điểm)
    @staticmethod
    async def complete_order(db: AsyncSession, order_id: int):
        # Bước 1: Cập nhật trạng thái đơn
        order = await crud.update_order_status(db, order_id, models.OrderStatus.HOAN_TAT)
        if not order: return None
        
        # Bước 2: Trả bàn
        if order.table_id:
            await crud.update_table_status(db, order.table_id, models.TableStatus.TRONG)
            
        # Bước 3: Tích điểm cho khách
        if order.user_id:
            points_earned = int(order.total_amount / EARN_RATE)
            if points_earned > 0:
                await crud.update_user_points(db, order.user_id, points_earned, float(order.total_amount))
                
        return order