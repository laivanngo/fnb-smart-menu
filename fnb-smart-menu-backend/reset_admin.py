# Tệp: fnb-smart-menu-backend/reset_admin.py
# Mục đích: Ép lại mật khẩu Admin thành "admin"

import crud, schemas, security, models
from models import SessionLocal

def reset_password():
    db = SessionLocal()
    try:
        print("--- BẮT ĐẦU RESET ADMIN ---")
        username = "admin"
        new_password = "admin"
        
        # 1. Tìm user admin
        user = crud.get_admin_by_username(db, username)
        
        if user:
            # 2. Nếu ĐÃ CÓ -> Đổi mật khẩu
            print(f"✅ Tìm thấy tài khoản '{username}'. Đang đổi mật khẩu...")
            user.hashed_password = security.get_password_hash(new_password)
            db.commit()
            print(f"🎉 THÀNH CÔNG! Mật khẩu mới là: {new_password}")
        else:
            # 3. Nếu CHƯA CÓ -> Tạo mới
            print(f"⚠️ Chưa có tài khoản '{username}'. Đang tạo mới...")
            admin_in = schemas.AdminCreate(username=username, password=new_password)
            crud.create_admin(db, admin_in)
            print(f"🎉 THÀNH CÔNG! Đã tạo tài khoản: {username} / {new_password}")
            
    except Exception as e:
        print(f"❌ LỖI: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    reset_password()