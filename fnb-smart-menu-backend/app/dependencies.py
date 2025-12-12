# Tệp: app/dependencies.py
from app.models.models import AsyncSessionLocal

async def get_db():
    async with AsyncSessionLocal() as db:
        try:
            yield db
        finally:
            await db.close()