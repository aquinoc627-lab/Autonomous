import asyncio
from app.core.database import engine, Base
from app.models.mission import Mission
from app.models.tool import Tool

async def init():
    async with engine.begin() as conn:
        # This will create both 'missions' and 'tools' tables
        await conn.run_sync(Base.metadata.create_all)
    print("✓ DATABASE TABLES INITIALIZED: MISSIONS & TOOLS")

if __name__ == "__main__":
    asyncio.run(init())
