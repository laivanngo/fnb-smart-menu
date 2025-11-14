#!/bin/bash

# Script: deploy.sh
# Mục đích: Deploy tự động lên VPS, bao gồm tạo template Nginx và lấy SSL.
# PHIÊN BẢN NÂNG CẤP: Sử dụng Docker Compose V2 (lệnh: docker compose)

echo "🚀 BẮT ĐẦU DEPLOY FNB SMART MENU (Bản nâng cao V2)"
echo "================================================="

# Màu sắc
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Hàm kiểm tra lệnh cuối
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Thành công${NC}"
    else
        echo -e "${RED}❌ Thất bại! Dừng deploy.${NC}"
        exit 1
    fi
}

# --- BƯỚC 1: KIỂM TRA FILE CẤU HÌNH ---
echo ""
echo "📋 Bước 1: Kiểm tra file cấu hình..."
if [ ! -f ".env.production" ]; then
    echo -e "${RED}❌ Không tìm thấy .env.production${NC}"
    exit 1
fi
if [ ! -f "docker-compose.production.yml" ]; then
    echo -e "${RED}❌ Không tìm thấy docker-compose.production.yml${NC}"
    exit 1
fi
if [ ! -f "nginx.conf.template" ]; then
    echo -e "${RED}❌ Không tìm thấy nginx.conf.template${NC}"
    echo "Lưu ý: File nginx.conf đã được đổi tên thành nginx.conf.template"
    exit 1
fi
echo -e "${GREEN}✅ Đã tìm thấy các tệp cấu hình cần thiết.${NC}"

# --- BƯỚC 2: KIỂM TRA DOCKER & ENV SUBST ---
echo ""
echo "🐳 Bước 2: Kiểm tra Docker và Tools..."
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker chưa được cài đặt!${NC}"
    exit 1
fi

# **ĐÃ SỬA**: Kiểm tra Docker Compose V2 (docker compose)
if ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose (V2 plugin) chưa được cài đặt!${NC}"
    echo "Vui lòng cài đặt: sudo apt-get update && sudo apt-get install docker-compose-plugin"
    exit 1
fi

if ! command -v envsubst &> /dev/null; then
    echo -e "${RED}❌ 'envsubst' (từ gettext) chưa được cài đặt.${NC}"
    echo "Vui lòng cài đặt: sudo apt-get update && sudo apt-get install -y gettext"
    exit 1
fi
echo -e "${GREEN}✅ Docker, Docker Compose (V2), và Envsubst đã sẵn sàng.${NC}"

# --- BƯỚC 3: NẠP BIẾN MÔI TRƯỜNG VÀ TẠO FILE NGINX.CONF ---
echo ""
echo "📝 Bước 3: Tạo file 'nginx.conf' từ template..."
export $(grep -v '^#' .env.production | xargs)
envsubst < nginx.conf.template > nginx.conf
check_status

# --- BƯỚC 4: TẠO THƯ MỤC CHO CERTBOT ---
echo ""
echo "🔒 Bước 4: Chuẩn bị thư mục cho Certbot..."
mkdir -p ./certbot/www
mkdir -p /etc/letsencrypt # Tạo sẵn nếu chưa có
echo -e "${GREEN}✅ Đã tạo thư mục Certbot.${NC}"

# --- BƯỚC 5: BACKUP DATABASE ---
echo ""
echo "💾 Bước 5: Backup database (nếu đang chạy)..."
# **ĐÃ SỬA**: Kiểm tra container bằng "docker ps" thay vì "docker compose"
if docker ps | grep -q fnb_postgres_db_prod; then
    echo "Đang backup database..."
    docker exec fnb_postgres_db_prod pg_dump -U $POSTGRES_USER -d $POSTGRES_DB > "db_backup_$(date +%Y%m%d_%H%M%S).sql"
    echo -e "${GREEN}✅ Backup hoàn tất.${NC}"
else
    echo -e "${YELLOW}⚠️  Database chưa chạy, bỏ qua backup.${NC}"
fi

# --- BƯỚC 6: DỪNG CONTAINERS CŨ ---
echo ""
echo "🛑 Bước 6: Dừng containers cũ..."
# **ĐÃ SỬA**: Sử dụng "docker compose"
docker compose -f docker-compose.production.yml down
echo -e "${GREEN}✅ Đã dừng containers.${NC}"

# --- BƯỚC 7: KHỞI TẠO SSL (NẾU CHƯA CÓ) ---
echo ""
echo "🔐 Bước 7: Kiểm tra và khởi tạo SSL..."

if [ ! -f "/etc/letsencrypt/live/${DOMAIN_FRONTEND}/fullchain.pem" ]; then
    echo -e "${YELLOW}⚠️  Không tìm thấy chứng chỉ SSL. Đang tiến hành lấy mới...${NC}"
    
    echo "Khởi động Nginx (tạm thời) cho việc xác thực..."
    # **ĐÃ SỬA**: Sử dụng "docker compose"
    docker compose -f docker-compose.production.yml up -d nginx
    check_status
    sleep 5

    echo "Yêu cầu cấp chứng chỉ SSL từ Let's Encrypt..."
    # **ĐÃ SỬA**: Sử dụng "docker compose"
    docker compose -f docker-compose.production.yml run --rm certbot certonly \
        --webroot -w /var/www/certbot \
        -d ${DOMAIN_FRONTEND} \
        -d ${DOMAIN_ADMIN} \
        -d ${DOMAIN_API} \
        --email ${LETSENCRYPT_EMAIL} \
        --agree-tos \
        --no-eff-email \
        --force-renewal
    check_status

    echo "Tắt Nginx tạm thời..."
    # **ĐÃ SỬA**: Sử dụng "docker compose"
    docker compose -f docker-compose.production.yml down
else
    echo -e "${GREEN}✅ Đã tìm thấy chứng chỉ SSL. Bỏ qua bước cấp mới.${NC}"
fi

# --- BƯỚC 8: BUILD VÀ KHỞI ĐỘNG HỆ THỐNG ---
echo ""
echo "🔨 Bước 8: Build Docker images mới..."
# **ĐÃ SỬA**: Sử dụng "docker compose"
docker compose -f docker-compose.production.yml build --no-cache
check_status

echo ""
echo "▶️  Bước 9: Khởi động toàn bộ hệ thống..."
# **ĐÃ SỬA**: Sử dụng "docker compose"
docker compose -f docker-compose.production.yml up -d
check_status

# --- BƯỚC 10: KIỂM TRA HEALTH ---
echo ""
echo "🏥 Bước 10: Kiểm tra health (đợi 15s)..."
sleep 15

docker ps

# --- BƯỚC 11: HOÀN THÀNH ---
echo ""
echo "================================"
echo -e "${GREEN}🎉 DEPLOY HOÀN TẤT!${NC}"
echo ""
echo "📝 Thông tin truy cập:"
echo "   Admin:   https://${DOMAIN_ADMIN}"
echo "   API:     https://${DOMAIN_API}/docs"
echo "   Web:     https://${DOMAIN_FRONTEND}"
echo ""
echo "📊 Lệnh hữu ích (dùng V2):"
echo "   Xem logs:        docker compose -f docker-compose.production.yml logs -f"
echo "   Dừng services:   docker compose -f docker-compose.production.yml down"
echo "   Khởi động lại:   docker compose -f docker-compose.production.yml restart"
echo "   Kiểm tra status: docker ps"
echo ""