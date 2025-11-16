#!/bin/bash

# ===================================================================
# SCRIPT KIỂM TRA CẤU TRÚC THỦ MỤC DỰ ÁN
# ===================================================================

echo "========================================="
echo "🔍 KIỂM TRA CẤU TRÚC DỰ ÁN"
echo "========================================="
echo ""

# Kiểm tra thư mục hiện tại
echo "📍 Thư mục hiện tại:"
pwd
echo ""

# Liệt kê các file/folder trong thư mục hiện tại
echo "📁 Nội dung thư mục hiện tại:"
ls -la
echo ""

# Kiểm tra có file docker-compose.production.yml không
echo "📋 File docker-compose.production.yml:"
if [ -f "docker-compose.production.yml" ]; then
    echo "✅ Tìm thấy docker-compose.production.yml"
else
    echo "❌ KHÔNG tìm thấy docker-compose.production.yml"
fi
echo ""

# Kiểm tra cấu trúc backend
echo "🔍 Kiểm tra cấu trúc Backend:"
if [ -d "fnb-smart-menu-backend" ]; then
    echo "✅ Tìm thấy thư mục: fnb-smart-menu-backend/"
    ls -la fnb-smart-menu-backend/ | head -10
elif [ -f "main.py" ]; then
    echo "ℹ️  Các file backend đang ở thư mục gốc (main.py, crud.py...)"
    ls -la *.py 2>/dev/null | head -10
else
    echo "❌ Không tìm thấy backend files"
fi
echo ""

# Kiểm tra cấu trúc frontend
echo "🔍 Kiểm tra cấu trúc Frontend:"
if [ -d "fnb-smart-menu-frontend" ]; then
    echo "✅ Tìm thấy thư mục: fnb-smart-menu-frontend/"
elif [ -f "package.json" ]; then
    echo "ℹ️  Frontend đang ở thư mục gốc (có package.json)"
else
    echo "❌ Không tìm thấy frontend files"
fi
echo ""

# Kiểm tra cấu trúc admin
echo "🔍 Kiểm tra cấu trúc Admin:"
if [ -d "fnb-smart-menu-admin" ]; then
    echo "✅ Tìm thấy thư mục: fnb-smart-menu-admin/"
else
    echo "ℹ️  Có thể admin cùng folder với frontend hoặc chưa tạo"
fi
echo ""

echo "========================================="
echo "✅ HOÀN TẤT KIỂM TRA"
echo "========================================="
echo ""
echo "📝 Gửi kết quả này cho developer để được hỗ trợ!"