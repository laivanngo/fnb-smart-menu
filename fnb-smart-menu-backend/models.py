# Tệp: models.py (FINAL FIX - Đã thêm DeliveryAssignment)

import os
import enum
from sqlalchemy import (
    create_engine, Column, Integer, String, Boolean, ForeignKey, 
    Enum as SAEnum, DateTime, func, Text, Numeric, Float # <--- Đã có Float
)
from sqlalchemy.orm import relationship, sessionmaker, DeclarativeBase

# --- Cấu hình CSDL ---
DB_USER = os.getenv("POSTGRES_USER", "postgres")
DB_PASS = os.getenv("POSTGRES_PASSWORD", "postgres")
DB_HOST = os.getenv("DB_HOST", "db")
DB_NAME = os.getenv("POSTGRES_DB", "fnb_db")
DB_PORT = os.getenv("DB_PORT", "5432")
DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

class Base(DeclarativeBase):
    pass

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# --- ENUM (DANH SÁCH ĐỊNH NGHĨA) ---
class OptionType(enum.Enum):
    CHON_1 = "CHON_1"
    CHON_NHIEU = "CHON_NHIEU"

class OrderStatus(enum.Enum):
    MOI = "MOI"
    DA_XAC_NHAN = "DA_XAC_NHAN"
    DANG_CHUAN_BI = "DANG_CHUAN_BI"
    DA_XONG = "DA_XONG"
    DANG_GIAO = "DANG_GIAO"
    HOAN_TAT = "HOAN_TAT"
    DA_HUY = "DA_HUY"
    TU_CHOI = "TU_CHOI"

class PaymentMethod(enum.Enum):
    TIEN_MAT = "TIEN_MAT"
    CHUYEN_KHOAN = "CHUYEN_KHOAN"
    MOMO = "MOMO"

class DeliveryMethod(enum.Enum):
    TAI_CHO = "TAI_CHO"
    MANG_DI = "MANG_DI"
    TIEU_CHUAN = "TIEU_CHUAN"
    NHANH = "NHANH"

# === BỔ SUNG CÁI NÀY ĐỂ SỬA LỖI ===
class DeliveryAssignment(enum.Enum):
    CHUA_PHAN_CONG = "CHUA_PHAN_CONG"
    TU_GIAO = "TU_GIAO"
    THUE_SHIP = "THUE_SHIP"
# ==================================

class UserRole(enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    STORE_OWNER = "STORE_OWNER"
    STAFF = "STAFF"
    CUSTOMER = "CUSTOMER"

# ==========================================
# PHẦN 1: CORE SAAS
# ==========================================

class Store(Base):
    __tablename__ = "stores"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, index=True)
    address = Column(String)
    phone = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    users = relationship("User", back_populates="store", cascade="all, delete-orphan")
    categories = relationship("Category", back_populates="store", cascade="all, delete-orphan")
    products = relationship("Product", back_populates="store", cascade="all, delete-orphan")
    options = relationship("Option", back_populates="store", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="store", cascade="all, delete-orphan")
    ingredients = relationship("Ingredient", back_populates="store", cascade="all, delete-orphan")
    tables = relationship("Table", back_populates="store", cascade="all, delete-orphan")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String, nullable=True)
    full_name = Column(String)
    phone = Column(String, index=True)
    email = Column(String, nullable=True)
    role = Column(SAEnum(UserRole), default=UserRole.CUSTOMER)
    points = Column(Integer, default=0)
    
    store_id = Column(Integer, ForeignKey("stores.id", ondelete="SET NULL"), nullable=True)
    store = relationship("Store", back_populates="users")
    
    orders = relationship("Order", back_populates="user")

# ==========================================
# PHẦN 2: MENU & SẢN PHẨM
# ==========================================

class ProductOptionAssociation(Base):
    __tablename__ = "product_option_association"
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), primary_key=True)
    option_id = Column(Integer, ForeignKey("options.id", ondelete="CASCADE"), primary_key=True)

class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    display_order = Column(Integer, default=0)
    image_url = Column(String, nullable=True)
    
    store_id = Column(Integer, ForeignKey("stores.id", ondelete="CASCADE"), nullable=True)
    store = relationship("Store", back_populates="categories")
    
    products = relationship("Product", back_populates="category", cascade="all, delete-orphan", order_by="Product.display_order")

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    description = Column(String)
    base_price = Column(Numeric(10, 0), nullable=False)
    image_url = Column(String)
    is_best_seller = Column(Boolean, default=False)
    display_order = Column(Integer, default=0)
    is_out_of_stock = Column(Boolean, default=False)
    
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="CASCADE"))
    category = relationship("Category", back_populates="products")
    
    store_id = Column(Integer, ForeignKey("stores.id", ondelete="CASCADE"), nullable=True)
    store = relationship("Store", back_populates="products")
    
    options = relationship("Option", secondary="product_option_association", back_populates="products")
    recipes = relationship("Recipe", back_populates="product", cascade="all, delete-orphan")

class Option(Base):
    __tablename__ = "options"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(SAEnum(OptionType), default=OptionType.CHON_NHIEU)
    display_order = Column(Integer, default=0)
    
    store_id = Column(Integer, ForeignKey("stores.id", ondelete="CASCADE"), nullable=True)
    store = relationship("Store", back_populates="options")
    
    values = relationship("OptionValue", back_populates="option", cascade="all, delete-orphan")
    products = relationship("Product", secondary="product_option_association", back_populates="options")

class OptionValue(Base):
    __tablename__ = "option_values"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    price_adjustment = Column(Numeric(10, 0), default=0)
    is_out_of_stock = Column(Boolean, default=False)
    option_id = Column(Integer, ForeignKey("options.id", ondelete="CASCADE"))
    option = relationship("Option", back_populates="values")
    
    recipes = relationship("Recipe", back_populates="option_value", cascade="all, delete-orphan")

# ==========================================
# PHẦN 3: KHO & CÔNG THỨC
# ==========================================

class Ingredient(Base):
    __tablename__ = "ingredients"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    unit = Column(String)
    current_stock = Column(Float, default=0) # Float ok cho số lượng
    min_stock_alert = Column(Float, default=10)
    
    store_id = Column(Integer, ForeignKey("stores.id", ondelete="CASCADE"), nullable=True)
    store = relationship("Store", back_populates="ingredients")

class Recipe(Base):
    __tablename__ = "recipes"
    id = Column(Integer, primary_key=True, index=True)
    
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=True)
    product = relationship("Product", back_populates="recipes")
    
    option_value_id = Column(Integer, ForeignKey("option_values.id", ondelete="CASCADE"), nullable=True)
    option_value = relationship("OptionValue", back_populates="recipes")
    
    ingredient_id = Column(Integer, ForeignKey("ingredients.id", ondelete="CASCADE"))
    ingredient = relationship("Ingredient")
    
    amount_needed = Column(Float, nullable=False)

# ==========================================
# PHẦN 4: ĐƠN HÀNG
# ==========================================

class Table(Base):
    __tablename__ = "tables"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False) # Tên bàn (VD: Bàn 1, Bàn VIP)
    capacity = Column(Integer, default=4) # Số ghế
    status = Column(String, default="TRONG") # Trạng thái: TRONG, CO_KHACH
    
    # Liên kết với Cửa hàng
    store_id = Column(Integer, ForeignKey("stores.id", ondelete="CASCADE"), nullable=True)
    store = relationship("Store", back_populates="tables")
    
    # Liên kết với Đơn hàng (để biết bàn này đang có đơn nào)
    orders = relationship("Order", back_populates="table")

class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    
    customer_name = Column(String, nullable=False)
    customer_phone = Column(String, nullable=False)
    customer_address = Column(String, nullable=False)
    customer_note = Column(String)
    
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    user = relationship("User", back_populates="orders")
    
    store_id = Column(Integer, ForeignKey("stores.id", ondelete="CASCADE"), nullable=True)
    store = relationship("Store", back_populates="orders")

    sub_total = Column(Numeric(12, 0), nullable=False)
    delivery_fee = Column(Numeric(12, 0), default=0)
    discount_amount = Column(Numeric(12, 0), default=0)
    total_amount = Column(Numeric(12, 0), nullable=False)
    
    status = Column(SAEnum(OrderStatus), default=OrderStatus.MOI)
    payment_method = Column(SAEnum(PaymentMethod), default=PaymentMethod.TIEN_MAT)
    delivery_method_selected = Column(SAEnum(DeliveryMethod), nullable=False)
    
    # Giờ đây DeliveryAssignment đã được định nghĩa ở trên, dòng này sẽ chạy OK
    delivery_assignment = Column(SAEnum(DeliveryAssignment), default=DeliveryAssignment.CHUA_PHAN_CONG)
    
    voucher_code = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

    table_id = Column(Integer, ForeignKey("tables.id", ondelete="SET NULL"), nullable=True)
    table = relationship("Table", back_populates="orders")

class OrderItem(Base):
    __tablename__ = "order_items"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"))
    order = relationship("Order", back_populates="items")
    
    product_id = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    product_name = Column(String, nullable=False)
    quantity = Column(Integer, default=1)
    
    item_price = Column(Numeric(12, 0), nullable=False)
    item_note = Column(String)
    ordered_by = Column(String, nullable=True)
    
    options_selected = relationship("OrderItemOption", back_populates="order_item", cascade="all, delete-orphan")

class OrderItemOption(Base):
    __tablename__ = "order_item_options"
    id = Column(Integer, primary_key=True, index=True)
    order_item_id = Column(Integer, ForeignKey("order_items.id", ondelete="CASCADE"))
    order_item = relationship("OrderItem", back_populates="options_selected")
    
    option_name = Column(String)
    value_name = Column(String)
    added_price = Column(Numeric(12, 0))

class Voucher(Base):
    __tablename__ = "vouchers"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True)
    description = Column(String)
    type = Column(String)
    value = Column(Float)
    min_order_value = Column(Numeric(12, 0), default=0)
    max_discount = Column(Numeric(12, 0), nullable=True)
    is_active = Column(Boolean, default=True)
    
    store_id = Column(Integer, ForeignKey("stores.id", ondelete="CASCADE"), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class Admin(Base):
    __tablename__ = "admins"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True)
    hashed_password = Column(String)

def create_tables():
    Base.metadata.create_all(bind=engine)