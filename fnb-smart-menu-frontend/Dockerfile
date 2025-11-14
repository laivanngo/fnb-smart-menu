# Tệp: fnb-smart-menu-frontend/Dockerfile
# Mục đích: Bản thiết kế "hộp" Frontend Khách hàng (Next.js)

# --- Giai đoạn 1: Build ứng dụng ---
# Dùng image node 18-alpine và đặt tên giai đoạn này là "builder"
FROM node:20-alpine AS builder

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
# Dùng một image node 18-alpine MỚI và đặt tên là "runner"
FROM node:20-alpine AS runner

WORKDIR /app

# Chỉ sao chép các file cần thiết (đã build) từ giai đoạn "builder"
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Mở cổng 3000 (cổng mặc định của Next.js production)
EXPOSE 3000

# Lệnh để chạy ứng dụng Next.js production server
CMD ["node", "server.js"]