import sys
import os
sys.path.append(os.getcwd())
# File: create_admin.py
# Mục đích: Tạo tài khoản Admin đầu tiên

import os
from dotenv import load_dotenv
load_dotenv() # Nạp cấu hình .env

from sqlalchemy.orm import Session
from app.models.models import SessionLocal, Admin, create_tables
from app.core.security import get_password_hash

def create_super_admin():
    db: Session = SessionLocal()
    try:
        username = "admin"
        password = "123" # Mật khẩu mặc định

        # Kiểm tra xem đã có chưa
        existing_admin = db.query(Admin).filter(Admin.username == username).first()
        if existing_admin:
            print(f"⚠️ Tài khoản '{username}' đã tồn tại! Không cần tạo lại.")
            return

        print(f"👤 Đang tạo tài khoản Admin: {username}...")
        
        # Mã hóa mật khẩu và lưu
        hashed_pw = get_password_hash(password)
        new_admin = Admin(username=username, hashed_password=hashed_pw)
        
        db.add(new_admin)
        db.commit()
        print(f"✅ Tạo thành công! Đăng nhập bằng: {username} / {password}")

    except Exception as e:
        print(f"❌ Lỗi: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_tables()
    create_super_admin()