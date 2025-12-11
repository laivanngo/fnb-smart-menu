#!/bin/sh
# Tệp: fnb-smart-menu-backend/entrypoint.sh
# Mục đích: Script chạy đầu tiên khi container backend khởi động

echo "--- Chạy Entrypoint ---"

# 1. Chạy "Người gác cổng" để chờ CSDL
# Giữ nguyên bước này để đảm bảo Database đã bật trước khi code chạy
echo "Đang chờ CSDL sẵn sàng..."
python app/db/wait_for_db.py

# 2. QUAN TRỌNG: Chạy Migration (Thay thế cho việc chạy models.py cũ)
# Lệnh này giúp Database tự động cập nhật các bảng mới hoặc cột mới
echo "Đang cập nhật cấu trúc Database (Alembic)..."
alembic upgrade head

# Lưu ý: Mình đã tắt dòng cũ bên dưới vì Alembic đã lo việc tạo bảng rồi.
# echo "Đang tạo bảng (nếu chưa có)..."
# python app/models/models.py

# 3. Chạy kịch bản nhập hàng mẫu (seed)
echo "Đang nhập hàng mẫu (nếu cần)..."
python app/scripts/seed.py

# 4. Khởi động "Bộ não" (Uvicorn)
echo "Khởi động Uvicorn server tại 0.0.0.0:8000..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000