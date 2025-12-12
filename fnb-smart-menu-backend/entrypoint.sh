#!/bin/sh
# Tệp: entrypoint.sh

echo "--- Chạy Entrypoint ---"

# 1. Chờ Database
echo "Đang chờ CSDL sẵn sàng..."
python app/db/wait_for_db.py

# 2. Migration (Tạo bảng)
echo "Đang cập nhật cấu trúc Database (Alembic)..."
alembic upgrade head

# 3. Tạo Admin (Đã sửa sang Async)
echo "Đang tạo tài khoản Admin..."
python app/scripts/create_admin.py

# 4. Nhập dữ liệu mẫu (Đã sửa sang Async)
echo "Đang nhập hàng mẫu (nếu cần)..."
python app/scripts/seed.py

# 5. Khởi động Server
echo "Khởi động Uvicorn server tại 0.0.0.0:8000..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000