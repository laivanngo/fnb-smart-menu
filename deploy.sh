#!/bin/bash

# ===================================================================
# == SCRIPT DEPLOY FNB SMART MENU - PRODUCTION                    ==
# == Hỗ trợ Docker, Nginx, SSL                                    ==
# == PHIÊN BẢN NÀY DÙNG DOCKER COMPOSE V2 (docker compose)         ==
# ===================================================================

# Màu sắc
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "========================================="
echo "🚀 FNB SMART MENU - DEPLOY TO PRODUCTION"
echo "========================================="

# ===================================================================
# BƯỚC 1: KIỂM TRA FILE CẤU HÌNH
# ===================================================================
echo ""
echo "📋 Bước 1: Kiểm tra file cấu hình..."

# Kiểm tra .env.production
if [ ! -f ".env.production" ]; then
    echo -e "${RED}❌ Không tìm thấy .env.production${NC}"
    echo "Vui lòng tạo file .env.production trước!"
    exit 1
fi
echo -e "${GREEN}✅ File .env.production tồn tại${NC}"

# Kiểm tra docker-compose.production.yml
if [ ! -f "docker-compose.production.yml" ]; then
    echo -e "${RED}❌ Không tìm thấy docker-compose.production.yml${NC}"
    exit 1
fi
echo -e "${GREEN}✅ File docker-compose.production.yml tồn tại${NC}"

# Kiểm tra nginx.conf
if [ ! -f "nginx.conf" ]; then
    echo -e "${RED}❌ Không tìm thấy nginx.conf${NC}"
    echo "Vui lòng tạo file nginx.conf trước!"
    exit 1
fi
echo -e "${GREEN}✅ File nginx.conf tồn tại${NC}"

# ===================================================================
# BƯỚC 2: KIỂM TRA DOCKER
# ===================================================================
echo ""
echo "🐳 Bước 2: Kiểm tra Docker..."

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker chưa được cài đặt!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker đã cài đặt${NC}"

# === THAY ĐỔI: Kiểm tra 'docker compose' (V2) thay vì 'docker-compose' (V1) ===
if ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose (V2) chưa được cài đặt!${NC}"
    echo "Vui lòng chạy: sudo apt-get install docker-compose-plugin"
    exit 1
fi
echo -e "${GREEN}✅ Docker Compose (V2) đã cài đặt${NC}"

# ===================================================================
# BƯỚC 3: KIỂM TRA SSL (TÙY CHỌN)
# ===================================================================
echo ""
echo "🔒 Bước 3: Kiểm tra SSL..."

SSL_EXISTS=false

# Đọc domain từ .env.production
if grep -q "api.fnbsmartmenu.com" .env.production; then
    if [ -d "/etc/letsencrypt/live/api.fnbsmartmenu.com" ]; then
        echo -e "${GREEN}✅ SSL certificate đã tồn tại${NC}"
        SSL_EXISTS=true
    else
        echo -e "${YELLOW}⚠️  Chưa có SSL certificate${NC}"
        echo "Sau khi deploy, chạy: bash setup-ssl.sh"
    fi
fi

# ===================================================================
# BƯỚC 4: BACKUP DATABASE
# ===================================================================
echo ""
echo "💾 Bước 4: Backup database..."

BACKUP_DIR="./backups"
mkdir -p $BACKUP_DIR
BACKUP_FILE="$BACKUP_DIR/db_backup_$(date +%Y%m%d_%H%M%S).sql"

if docker ps | grep -q fnb_postgres_db_prod; then
    echo "Đang backup database..."
    docker exec fnb_postgres_db_prod pg_dump -U myadmin fnb_smart_menu_db > $BACKUP_FILE 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Backup thành công: $BACKUP_FILE${NC}"
    else
        echo -e "${YELLOW}⚠️  Không thể backup (database có thể chưa chạy)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Database chưa chạy, bỏ qua backup${NC}"
fi

# ===================================================================
# BƯỚC 5: DỪNG CONTAINERS CŨ
# ===================================================================
echo ""
echo "🛑 Bước 5: Dừng containers cũ..."

# === THAY ĐỔI: Dùng 'docker compose' ===
docker compose -f docker-compose.production.yml down

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Đã dừng containers${NC}"
else
    echo -e "${YELLOW}⚠️  Không có containers nào đang chạy${NC}"
fi

# ===================================================================
# BƯỚC 6: BUILD IMAGES MỚI
# ===================================================================
echo ""
echo "🔨 Bước 6: Build Docker images..."
echo -e "${YELLOW}⏳ Quá trình này có thể mất 5-10 phút...${NC}"

# === THAY ĐỔI: Dùng 'docker compose' ===
docker compose -f docker-compose.production.yml build --no-cache

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build thành công${NC}"
else
    echo -e "${RED}❌ Build thất bại!${NC}"
    exit 1
fi

# ===================================================================
# BƯỚC 7: KHỞI ĐỘNG CONTAINERS
# ===================================================================
echo ""
echo "▶️  Bước 7: Khởi động containers..."

# === THAY ĐỔI: Dùng 'docker compose' ===
docker compose -f docker-compose.production.yml up -d

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Containers đã khởi động${NC}"
else
    echo -e "${RED}❌ Không thể khởi động containers!${NC}"
    exit 1
fi

# ===================================================================
# BƯỚC 8: ĐỢI SERVICES KHỞI ĐỘNG
# ===================================================================
echo ""
echo "⏳ Bước 8: Đợi services khởi động..."
sleep 15

# ===================================================================
# BƯỚC 9: KIỂM TRA HEALTH
# ===================================================================
echo ""
echo "🏥 Bước 9: Kiểm tra health của services..."

ALL_OK=true

# Kiểm tra Database
if docker ps | grep -q fnb_postgres_db_prod; then
    echo -e "${GREEN}✅ Database đang chạy${NC}"
else
    echo -e "${RED}❌ Database không chạy!${NC}"
    ALL_OK=false
fi

# Kiểm tra Backend
if docker ps | grep -q fnb_backend_prod; then
    echo -e "${GREEN}✅ Backend đang chạy${NC}"
else
    echo -e "${RED}❌ Backend không chạy!${NC}"
    ALL_OK=false
fi

# Kiểm tra Admin Frontend
if docker ps | grep -q fnb_admin_prod; then
    echo -e "${GREEN}✅ Admin Frontend đang chạy${NC}"
else
    echo -e "${RED}❌ Admin Frontend không chạy!${NC}"
    ALL_OK=false
fi

# Kiểm tra Customer Frontend
if docker ps | grep -q fnb_frontend_prod; then
    echo -e "${GREEN}✅ Customer Frontend đang chạy${NC}"
else
    echo -e "${YELLOW}⚠️  Customer Frontend không chạy (có thể chưa cần)${NC}"
fi

# Kiểm tra Nginx
if docker ps | grep -q fnb_nginx_proxy; then
    echo -e "${GREEN}✅ Nginx đang chạy${NC}"
else
    echo -e "${RED}❌ Nginx không chạy!${NC}"
    ALL_OK=false
fi

# Kiểm tra Certbot
if docker ps | grep -q fnb_certbot; then
    echo -e "${GREEN}✅ Certbot đang chạy${NC}"
else
    echo -e "${YELLOW}⚠️  Certbot không chạy (có thể do chưa setup SSL)${NC}"
fi

# ===================================================================
# BƯỚC 10: HIỂN THỊ LOGS
# ===================================================================
echo ""
echo "========================================="
echo "📋 LOGS (nhấn Ctrl+C để thoát)"
echo "========================================="

# Hiển thị logs của backend để kiểm tra
echo ""
echo -e "${BLUE}--- Backend Logs (5 dòng cuối) ---${NC}"
docker logs fnb_backend_prod --tail 5

echo ""
echo -e "${BLUE}--- Nginx Logs (5 dòng cuối) ---${NC}"
docker logs fnb_nginx_proxy --tail 5

# ===================================================================
# HOÀN TẤT
# ===================================================================
echo ""
echo "========================================="
if [ "$ALL_OK" = true ]; then
    echo -e "${GREEN}🎉 DEPLOY THÀNH CÔNG!${NC}"
else
    echo -e "${YELLOW}⚠️  DEPLOY HOÀN TẤT NHƯNG CÓ LỖI${NC}"
    # === THAY ĐỔI: Dùng 'docker compose' ===
    echo "Kiểm tra logs: docker compose -f docker-compose.production.yml logs -f"
fi
echo "========================================="

echo ""
echo "📝 THÔNG TIN TRUY CẬP:"
if [ "$SSL_EXISTS" = true ]; then
    echo "   Admin:   https://admin.fnbsmartmenu.com"
    echo "   API:     https://api.fnbsmartmenu.com/docs"
    echo "   Menu:    https://menu.fnbsmartmenu.com"
else
    echo "   Admin:   http://admin.fnbsmartmenu.com"
    echo "   API:     http://api.fnbsmartmenu.com/docs"
    echo "   Menu:    http://menu.fnbsmartmenu.com"
    echo ""
    echo -e "${YELLOW}⚠️  Chưa có SSL! Chạy: bash setup-ssl.sh${NC}"
fi

echo ""
echo "📊 LỆNH HỮU ÍCH:"
# === THAY ĐỔI: Cập nhật các lệnh hữu ích sang V2 ===
echo "   Xem logs:        docker compose -f docker-compose.production.yml logs -f"
echo "   Xem logs backend: docker logs fnb_backend_prod -f"
echo "   Dừng services:   docker compose -f docker-compose.production.yml down"
echo "   Khởi động lại:   docker compose -f docker-compose.production.yml restart"
echo "   Kiểm tra status: docker ps"
echo "   Setup SSL:       bash setup-ssl.sh"

echo ""
echo "========================================="
echo "✨ Chúc anh kinh doanh thành công!"
echo "========================================="