import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from app.models.base import Base
# Import all models to ensure they are registered with Base
from app.models.agent import Agent
from app.models.mission import Mission
from app.models.banter import Banter
from app.models.user import User

ASYNC_DB_URL = "sqlite+aiosqlite:///./autonomous.db"

async def init_models():
    engine = create_async_engine(ASYNC_DB_URL, echo=True)
    async with engine.begin() as conn:
        print("Creating Autonomous Database Tables...")
        await conn.run_sync(Base.metadata.create_all)
    print("✓ SUCCESS: TABLES CREATED")

if __name__ == "__main__":
    asyncio.run(init_models())
