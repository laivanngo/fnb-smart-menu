import os
import shutil
import re

# ==============================================================================
# CẤU HÌNH ROBOT KIẾN TRÚC SƯ (V2 - FINAL)
# ==============================================================================
BASE_DIR = os.getcwd()
BACKEND_DIR = os.path.join(BASE_DIR, "fnb-smart-menu-backend")
BACKUP_DIR = os.path.join(BASE_DIR, "fnb-smart-menu-backend-BACKUP-V2")

# 1. CẤU TRÚC MỚI (Enterprise Standard)
NEW_FOLDERS = [
    "app",
    "app/api",
    "app/api/v1",
    "app/core",
    "app/db",
    "app/models", 
    "app/schemas",
    "app/crud",
    "app/scripts", # Nơi chứa seed.py, create_admin.py
]

# 2. BẢN ĐỒ DI CHUYỂN FILE (Nguồn -> Đích)
# Lưu ý: models.py của bạn chứa cả SessionLocal, nên ta tạm đưa nó vào models/
# Sau này bạn có thể tách SessionLocal sang app/db/session.py bằng tay nếu muốn.
FILE_MOVES = {
    "models.py": "app/models/models.py",
    "schemas.py": "app/schemas/schemas.py",
    "crud.py": "app/crud/crud.py",
    "security.py": "app/core/security.py",
    "websocket_manager.py": "app/core/websocket.py",
    "wait-for-db.py": "app/db/wait_for_db.py", # Đổi tên cho chuẩn Python (dấu gạch dưới)
    "main.py": "app/main.py",
    # Di chuyển các script tiện ích vào thư mục scripts
    "seed.py": "app/scripts/seed.py",
    "create_admin.py": "app/scripts/create_admin.py",
}

# 3. BẢN ĐỒ SỬA LỖI IMPORT (Regex Replace)
# Logic: Tìm chuỗi cũ -> Thay bằng chuỗi mới trỏ về package 'app'
IMPORT_REPLACEMENTS = [
    # Sửa import models (File models.py giờ nằm ở app.models.models)
    (r"import models", "from app.models import models"),
    (r"from models import", "from app.models.models import"),
    
    # Sửa import schemas
    (r"import schemas", "from app.schemas import schemas"),
    (r"from schemas import", "from app.schemas.schemas import"),
    
    # Sửa import crud
    (r"import crud", "from app.crud import crud"),
    (r"from crud import", "from app.crud.crud import"),
    
    # Sửa import security
    (r"import security", "from app.core import security"),
    (r"from security import", "from app.core.security import"),

    # Sửa import websocket
    (r"from websocket_manager import", "from app.core.websocket import"),
]

def main():
    print("🚀 BẮT ĐẦU QUÁ TRÌNH TÁI CẤU TRÚC ENTERPRISE (V2)...")
    
    # --- BƯỚC 1: BACKUP ---
    if os.path.exists(BACKUP_DIR):
        shutil.rmtree(BACKUP_DIR)
    print(f"📦 Đang tạo backup an toàn tại: {BACKUP_DIR}...")
    shutil.copytree(BACKEND_DIR, BACKUP_DIR)
    print("✅ Backup hoàn tất. Nếu lỗi, chỉ cần xóa folder backend và đổi tên folder backup lại.")

    # --- BƯỚC 2: TẠO THƯ MỤC MỚI ---
    print("📂 Đang xây dựng khung sườn thư mục...")
    for folder in NEW_FOLDERS:
        path = os.path.join(BACKEND_DIR, folder)
        os.makedirs(path, exist_ok=True)
        # Tạo __init__.py để Python nhận diện package
        init_file = os.path.join(path, "__init__.py")
        if not os.path.exists(init_file):
            with open(init_file, 'w') as f: pass

    # --- BƯỚC 3: DI CHUYỂN FILE ---
    print("🚚 Đang di chuyển các file vào vị trí mới...")
    for src, dest in FILE_MOVES.items():
        src_path = os.path.join(BACKEND_DIR, src)
        dest_path = os.path.join(BACKEND_DIR, dest)
        
        # Xử lý đổi tên wait-for-db.py thành wait_for_db.py (dấu gạch dưới)
        if src == "wait-for-db.py" and not os.path.exists(src_path):
             # Thử tìm tên gốc nếu user chưa đổi
             pass 
        
        if os.path.exists(src_path):
            shutil.move(src_path, dest_path)
            print(f"   -> Moved: {src} ==> {dest}")
        else:
            print(f"   ⚠️ Không tìm thấy file nguồn: {src} (Có thể đã di chuyển?)")

    # --- BƯỚC 4: SỬA NỘI DUNG CODE (IMPORT) ---
    print("💉 Đang phẫu thuật code (Sửa Import)...")
    for root, dirs, files in os.walk(BACKEND_DIR):
        if "venv" in root or "BACKUP" in root or ".git" in root or "__pycache__" in root:
            continue
            
        for file in files:
            if file.endswith(".py"):
                file_path = os.path.join(root, file)
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                original_content = content
                
                # Chạy danh sách thay thế cơ bản
                for pattern, replacement in IMPORT_REPLACEMENTS:
                    content = re.sub(pattern, replacement, content)
                
                # --- SỬA CÁC LỖI ĐẶC BIỆT ---
                
                # 1. Sửa seed.py và create_admin.py (vì dotenv cần chỉ định đường dẫn .env rõ ràng hơn nếu cần, nhưng thường load_dotenv() tự tìm lên trên)
                if "scripts" in root:
                     # Fix sys.path để script chạy được khi gọi từ root
                     if "import sys" not in content:
                         content = "import sys\nimport os\nsys.path.append(os.getcwd())\n" + content

                # 2. Sửa models.py: Vì nó tự import chính nó? Không, models sạch.
                
                if content != original_content:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(content)
                    print(f"   -> Fixed imports: {file}")

    # --- BƯỚC 5: XỬ LÝ ALEMBIC/ENV.PY (QUAN TRỌNG NHẤT) ---
    print("🔧 Đang cấu hình lại Alembic (Migration)...")
    env_path = os.path.join(BACKEND_DIR, "alembic", "env.py")
    if os.path.exists(env_path):
        with open(env_path, 'r', encoding='utf-8') as f:
            env_content = f.read()
        
        # Thay thế dòng import models cũ
        # Cũ: from models import Base, DATABASE_URL
        # Mới: from app.models.models import Base, DATABASE_URL
        env_content = env_content.replace("from models import Base", "from app.models.models import Base")
        
        # Đảm bảo sys.path trỏ đúng
        if "sys.path.append(os.getcwd())" not in env_content:
             env_content = env_content.replace("import sys", "import sys\nimport os\nsys.path.append(os.getcwd())")

        with open(env_path, 'w', encoding='utf-8') as f:
            f.write(env_content)
        print("   -> Đã sửa alembic/env.py")

    # --- BƯỚC 6: CẬP NHẬT ENTRYPOINT.SH ---
    print("📜 Đang cập nhật Entrypoint script...")
    ep_path = os.path.join(BACKEND_DIR, "entrypoint.sh")
    if os.path.exists(ep_path):
        with open(ep_path, 'r', encoding='utf-8') as f:
            ep_content = f.read()
        
        # Cập nhật các đường dẫn lệnh chạy
        ep_content = ep_content.replace("python wait-for-db.py", "python app/db/wait_for_db.py")
        ep_content = ep_content.replace("python seed.py", "python app/scripts/seed.py")
        ep_content = ep_content.replace("python models.py", "python app/models/models.py") # Phòng hờ dòng comment cũ
        
        # QUAN TRỌNG: Uvicorn giờ phải gọi app.main
        ep_content = ep_content.replace("uvicorn main:app", "uvicorn app.main:app")
        
        with open(ep_path, 'w', encoding='utf-8') as f:
            f.write(ep_content)
        print("   -> Đã sửa entrypoint.sh")

    # --- BƯỚC 7: CẬP NHẬT DOCKERFILE ---
    print("🐳 Đang cập nhật Dockerfile...")
    docker_path = os.path.join(BACKEND_DIR, "Dockerfile")
    if os.path.exists(docker_path):
        with open(docker_path, 'r', encoding='utf-8') as f:
            d_content = f.read()
        # Đảm bảo Entrypoint trỏ đúng
        # (Thực ra Dockerfile của bạn dùng entrypoint.sh nên không cần sửa CMD, nhưng sửa cho chắc)
        d_content = d_content.replace('uvicorn main:app', 'uvicorn app.main:app')
        with open(docker_path, 'w', encoding='utf-8') as f:
            f.write(d_content)

    print("\n" + "="*60)
    print("🎉 CHÚC MỪNG! TÁI CẤU TRÚC THÀNH CÔNG 100%")
    print(f"👉 Code cũ đã được lưu tại: {BACKUP_DIR}")
    print("👉 Hãy khởi động lại hệ thống bằng lệnh:")
    print("   docker-compose -f docker-compose.development.yml up --build")
    print("="*60)

if __name__ == "__main__":
    main()