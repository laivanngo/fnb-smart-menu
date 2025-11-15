#!/bin/bash

# ===================================================================
# == SCRIPT SETUP SSL VỚI LET'S ENCRYPT - LẦN ĐẦU TIÊN          ==
# == Sử dụng Certbot để lấy SSL certificates cho tất cả domains   ==
# ===================================================================

# Màu sắc
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "🔒 SETUP SSL CHO FNB SMART MENU"
echo "========================================="

# ===================================================================
# BƯỚC 1: CẤU HÌNH DOMAIN
# ===================================================================
echo ""
echo "📝 Bước 1: Cấu hình domain"
echo ""
echo "Nhập các domain của anh (cách nhau bằng dấu cách):"
echo "Ví dụ: admin.fnbsmartmenu.com api.fnbsmartmenu.com menu.fnbsmartmenu.com"
echo ""
read -p "Domain: " DOMAINS

if [ -z "$DOMAINS" ]; then
    echo -e "${RED}❌ Anh chưa nhập domain!${NC}"
    exit 1
fi

# Chuyển domains thành array
read -ra DOMAIN_ARRAY <<< "$DOMAINS"

echo -e "${GREEN}✅ Sẽ setup SSL cho: $DOMAINS${NC}"

# ===================================================================
# BƯỚC 2: NHẬP EMAIL
# ===================================================================
echo ""
read -p "Nhập email của anh (để nhận thông báo từ Let's Encrypt): " EMAIL

if [ -z "$EMAIL" ]; then
    echo -e "${RED}❌ Anh chưa nhập email!${NC}"
    exit 1
fi

# ===================================================================
# BƯỚC 3: TẠO THƯ MỤC CERTBOT
# ===================================================================
echo ""
echo "📁 Bước 2: Tạo thư mục certbot..."
mkdir -p ./certbot/www
echo -e "${GREEN}✅ Đã tạo thư mục certbot${NC}"

# ===================================================================
# BƯỚC 4: TẠO FILE NGINX TẠM THỜI (KHÔNG SSL)
# ===================================================================
echo ""
echo "📝 Bước 3: Tạo file nginx.conf tạm thời (HTTP only)..."

cat > nginx.conf.temp << 'EOF'
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
EOF

# Tạo server block cho mỗi domain
for domain in "${DOMAIN_ARRAY[@]}"; do
    cat >> nginx.conf.temp << EOF
    server {
        listen 80;
        server_name $domain;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 200 'OK';
            add_header Content-Type text/plain;
        }
    }

EOF
done

echo "}" >> nginx.conf.temp

echo -e "${GREEN}✅ Đã tạo nginx.conf tạm thời${NC}"

# ===================================================================
# BƯỚC 5: BACKUP NGINX.CONF CŨ (NẾU CÓ)
# ===================================================================
if [ -f "nginx.conf" ]; then
    echo ""
    echo "💾 Backup nginx.conf cũ..."
    cp nginx.conf nginx.conf.backup
    echo -e "${GREEN}✅ Đã backup nginx.conf${NC}"
fi

# Sử dụng file tạm thời
cp nginx.conf.temp nginx.conf

# ===================================================================
# BƯỚC 6: KHỞI ĐỘNG NGINX (HTTP ONLY)
# ===================================================================
echo ""
echo "🚀 Bước 4: Khởi động Nginx (HTTP only)..."
docker-compose -f docker-compose.production.yml up -d nginx
sleep 5

# Kiểm tra Nginx
if ! docker ps | grep -q fnb_nginx_proxy; then
    echo -e "${RED}❌ Nginx không khởi động được!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Nginx đã khởi động${NC}"

# ===================================================================
# BƯỚC 7: LẤY SSL CERTIFICATE
# ===================================================================
echo ""
echo "🔒 Bước 5: Lấy SSL certificate từ Let's Encrypt..."
echo ""
echo -e "${YELLOW}⏳ Quá trình này có thể mất 1-2 phút...${NC}"

# Build certbot command
CERTBOT_CMD="docker run --rm \
  -v /etc/letsencrypt:/etc/letsencrypt \
  -v $(pwd)/certbot/www:/var/www/certbot \
  certbot/certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email $EMAIL \
  --agree-tos \
  --no-eff-email"

# Thêm tất cả domains
for domain in "${DOMAIN_ARRAY[@]}"; do
    CERTBOT_CMD="$CERTBOT_CMD -d $domain"
done

# Chạy certbot
eval $CERTBOT_CMD

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Đã lấy SSL certificate thành công!${NC}"
else
    echo -e "${RED}❌ Lỗi khi lấy SSL certificate!${NC}"
    echo ""
    echo "Kiểm tra lại:"
    echo "1. Domain đã trỏ về IP VPS chưa?"
    echo "2. Port 80 có bị firewall chặn không?"
    echo "3. Nginx có chạy không? (docker ps)"
    exit 1
fi

# ===================================================================
# BƯỚC 8: RESTORE NGINX.CONF CHÍNH THỨC
# ===================================================================
echo ""
echo "📝 Bước 6: Restore nginx.conf chính thức..."

if [ -f "nginx.conf.backup" ]; then
    cp nginx.conf.backup nginx.conf
    echo -e "${GREEN}✅ Đã restore nginx.conf${NC}"
else
    echo -e "${YELLOW}⚠️  Không tìm thấy nginx.conf.backup${NC}"
    echo "Vui lòng sao chép file nginx.conf từ template và cấu hình lại!"
fi

# ===================================================================
# BƯỚC 9: KHỞI ĐỘNG LẠI TẤT CẢ SERVICES
# ===================================================================
echo ""
echo "🚀 Bước 7: Khởi động lại tất cả services với SSL..."
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d

echo ""
echo "⏳ Đợi services khởi động..."
sleep 10

# ===================================================================
# BƯỚC 10: KIỂM TRA
# ===================================================================
echo ""
echo "✅ HOÀN TẤT!"
echo ""
echo "========================================="
echo "📊 THÔNG TIN SSL"
echo "========================================="

for domain in "${DOMAIN_ARRAY[@]}"; do
    echo "✓ $domain → /etc/letsencrypt/live/$domain/"
done

echo ""
echo "========================================="
echo "🔄 TỰ ĐỘNG GIA HẠN"
echo "========================================="
echo "Certbot sẽ tự động gia hạn SSL mỗi 12 giờ"
echo "Certificate sẽ được gia hạn khi còn 30 ngày"

echo ""
echo "========================================="
echo "📝 KIỂM TRA"
echo "========================================="
echo "1. Truy cập: https://admin.fnbsmartmenu.com"
echo "2. Truy cập: https://api.fnbsmartmenu.com/docs"
echo "3. Kiểm tra SSL: https://www.ssllabs.com/ssltest/"

echo ""
echo "========================================="
echo "🎉 SETUP SSL HOÀN TẤT!"
echo "========================================="