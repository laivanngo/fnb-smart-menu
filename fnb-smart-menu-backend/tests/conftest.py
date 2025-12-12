# Tệp: tests/conftest.py
import pytest
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

# Import App và Dependency
from app.main import app
from app.dependencies import get_db
from app.models.models import DATABASE_URL

# 1. Cấu hình Database Test
TEST_DATABASE_URL = DATABASE_URL 

engine_test = create_async_engine(TEST_DATABASE_URL, poolclass=NullPool)
TestingSessionLocal = sessionmaker(
    bind=engine_test, class_=AsyncSession, expire_on_commit=False
)

# --- [ĐÃ XÓA]: Hàm @pytest.fixture def event_loop... (Không cần nữa) ---

# 2. Fixture Database Session
@pytest.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    connection = await engine_test.connect()
    transaction = await connection.begin()
    
    session = TestingSessionLocal(bind=connection)
    yield session
    
    await session.close()
    await transaction.rollback()
    await connection.close()

# 3. Fixture Client
@pytest.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    
    # [Lưu ý] base_url phải là http://test hoặc domain giả lập
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    
    app.dependency_overrides.clear()