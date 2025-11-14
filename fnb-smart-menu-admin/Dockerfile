# Tệp: fnb-smart-menu-admin/Dockerfile
# Mục đích: Bản thiết kế "hộp" Frontend Admin (Next.js)
# ĐÃ SỬA LỖI: Đổi tên stage để tránh trùng lặp

# --- Giai đoạn 1: Build ứng dụng ---
# === SỬA TÊN GIAI ĐOẠN ===
FROM node:20-alpine AS admin-builder

# Đặt thư mục làm việc
WORKDIR /app

# Sao chép file quản lý dependencies
COPY package.json package-lock.json* ./
# (Nếu dùng yarn, 2 dòng trên sẽ là: COPY package.json yarn.lock ./)

# Cài đặt dependencies
RUN npm install
# (Nếu dùng yarn: RUN yarn install)

# Sao chép toàn bộ code
COPY . .

# Build ứng dụng Next.js cho production
# Biến môi trường API_URL sẽ được truyền vào lúc build (từ docker-compose)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN npm run build
# (Nếu dùng yarn: RUN yarn build)

# --- Giai đoạn 2: Chạy ứng dụng đã build ---
# === SỬA TÊN GIAI ĐOẠN ===
FROM node:20-alpine AS admin-runner

WORKDIR /app

# === SỬA TÊN NGUỒN (COPY TỪ admin-builder) ===
COPY --from=admin-builder /app/public ./public
COPY --from=admin-builder /app/.next/standalone ./
COPY --from=admin-builder /app/.next/static ./.next/static

# Mở cổng 3000 (cổng mặc định của Next.js production)
EXPOSE 3000

# Lệnh để chạy ứng dụng Next.js production server
CMD ["node", "server.js"]