# Tệp: schemas.py (CẬP NHẬT TÍCH ĐIỂM)
from pydantic import BaseModel, ConfigDict
from typing import List, Optional
import models 
from datetime import datetime, date
from decimal import Decimal

# --- CÁC SCHEMAS CƠ BẢN GIỮ NGUYÊN ---
class AdminBase(BaseModel):
    username: str
class AdminCreate(AdminBase):
    password: str
class Admin(AdminBase):
    id: int
    model_config = ConfigDict(from_attributes=True)
class Token(BaseModel):
    access_token: str
    token_type: str
class TokenData(BaseModel):
    username: Optional[str] = None

# --- Option & Product ---
class OptionValueBase(BaseModel):
    name: str
    price_adjustment: float
    is_out_of_stock: Optional[bool] = False
class OptionValueCreate(OptionValueBase): pass
class OptionValue(OptionValueBase):
    id: int
    option_id: int
    model_config = ConfigDict(from_attributes=True)
class OptionValueUpdate(BaseModel):
    name: Optional[str] = None
    price_adjustment: Optional[float] = None
    is_out_of_stock: Optional[bool] = None    
class OptionBase(BaseModel):
    name: str
    type: models.OptionType
    display_order: int = 0
class OptionCreate(OptionBase): pass 
class OptionUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[models.OptionType] = None
    display_order: Optional[int] = None
class Option(OptionBase):
    id: int
    values: List[OptionValue] = []
    model_config = ConfigDict(from_attributes=True)
class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    base_price: float
    image_url: Optional[str] = None
    display_order: Optional[int] = 0
    is_best_seller: Optional[bool] = False
    is_out_of_stock: Optional[bool] = False 
class ProductCreate(ProductBase):
    category_id: int
class Product(ProductBase):
    id: int
    category_id: int
    options: List[Option] = []
    model_config = ConfigDict(from_attributes=True)
class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    base_price: Optional[float] = None
    image_url: Optional[str] = None
    display_order: Optional[int] = None
    is_best_seller: Optional[bool] = None
    category_id: Optional[int] = None
    is_out_of_stock: Optional[bool] = None
class ProductLinkOptionsRequest(BaseModel):
    option_ids: List[int]
class CategoryBase(BaseModel):
    name: str
    display_order: Optional[int] = 0
class CategoryCreate(CategoryBase): pass
class Category(CategoryBase):
    id: int
    model_config = ConfigDict(from_attributes=True)
class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    display_order: Optional[int] = None
class VoucherBase(BaseModel):
    code: str
    description: Optional[str] = None
    type: str 
    value: float
    min_order_value: float = 0
    max_discount: Optional[float] = None
    is_active: bool = True
class VoucherCreate(VoucherBase): pass
class Voucher(VoucherBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# --- Public Menu ---
class PublicOptionValue(BaseModel):
    id: int
    name: str
    price_adjustment: float
    is_out_of_stock: bool
    model_config = ConfigDict(from_attributes=True)
class PublicOption(BaseModel):
    id: int
    name: str
    type: models.OptionType
    display_order: int
    values: List[PublicOptionValue] = []
    model_config = ConfigDict(from_attributes=True)
class PublicProduct(BaseModel):
    id: int
    name: str
    description: Optional[str]
    base_price: float
    image_url: Optional[str]
    display_order: int
    is_best_seller: bool
    is_out_of_stock: bool
    options: List[PublicOption] = []
    model_config = ConfigDict(from_attributes=True)
class PublicCategory(BaseModel):
    id: int
    name: str
    display_order: int
    products: List[PublicProduct] = []
    model_config = ConfigDict(from_attributes=True)

# ==========================================
# [CẬP NHẬT QUAN TRỌNG] TÍNH TIỀN & ĐƠN HÀNG
# ==========================================
class OrderItemOptionCreate(BaseModel):
    option_value_id: int

class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int
    note: Optional[str] = None
    ordered_by: Optional[str] = None
    options: List[int]

class OrderCalculateRequest(BaseModel):
    items: List[OrderItemCreate]
    voucher_code: Optional[str] = None
    delivery_method: models.DeliveryMethod
    # [MỚI] Gửi thêm SĐT để tìm điểm & tùy chọn dùng điểm
    customer_phone: Optional[str] = None 
    use_points: bool = False 

class OrderCalculateResponse(BaseModel):
    sub_total: float
    delivery_fee: float
    discount_amount: float
    points_discount: float = 0 # [MỚI] Tiền giảm từ điểm
    total_amount: float
    # [MỚI] Trả về thông tin điểm để hiển thị
    user_points_available: int = 0
    can_use_points: bool = False

class OrderCreate(OrderCalculateRequest):
    customer_name: str
    customer_phone: str
    customer_address: str
    customer_note: Optional[str] = None
    payment_method: models.PaymentMethod
    table_id: Optional[int] = None
    user_id: Optional[int] = None 

class PublicOrderResponse(BaseModel):
    id: int
    status: models.OrderStatus
    total_amount: float
    model_config = ConfigDict(from_attributes=True)

# --- Admin Order Details ---
class OrderItemOptionDetail(BaseModel):
    option_name: str
    value_name: str
    added_price: float
    model_config = ConfigDict(from_attributes=True)

class OrderItemDetail(BaseModel):
    id: int
    product_name: str
    quantity: int
    item_price: float
    item_note: Optional[str] = None
    ordered_by: Optional[str] = None
    options_selected: List[OrderItemOptionDetail] = []
    model_config = ConfigDict(from_attributes=True)

class OrderDetail(BaseModel):
    id: int
    customer_name: str
    customer_phone: str
    customer_address: str
    customer_note: Optional[str] = None
    sub_total: float
    delivery_fee: float
    discount_amount: float
    
    points_discount: Optional[float] = 0 
    
    total_amount: float
    status: models.OrderStatus
    payment_method: models.PaymentMethod
    delivery_method_selected: models.DeliveryMethod
    voucher_code: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    items: List[OrderItemDetail] = []
    table_id: Optional[int] = None
    user_id: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)

class AdminOrderListResponse(BaseModel):
    id: int
    customer_name: str
    total_amount: float
    
    status: models.OrderStatus
    created_at: datetime
    table_id: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)

# --- Table & Customer ---
class TableBase(BaseModel):
    name: str
    capacity: int = 4
class TableCreate(TableBase): pass
class TableUpdate(BaseModel):
    name: Optional[str] = None
    capacity: Optional[int] = None
    status: Optional[models.TableStatus] = None
class Table(TableBase):
    id: int
    status: models.TableStatus
    store_id: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)
class CustomerUpdateCRM(BaseModel):
    full_name: Optional[str] = None
    birthday: Optional[date] = None
    gender: Optional[str] = None
    preferences: Optional[dict] = None
    internal_note: Optional[str] = None
class CustomerResponse(BaseModel):
    id: int
    full_name: Optional[str] = None
    phone: Optional[str] = None
    points: int
    role: str
    total_spent: Optional[Decimal] = None
    last_order_date: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)