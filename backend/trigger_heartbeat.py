import asyncio
import uuid
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models.banter import Banter

ASYNC_DB_URL = "sqlite+aiosqlite:///./autonomous.db"
engine = create_async_engine(ASYNC_DB_URL)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def heartbeat():
    async with async_session() as session:
        log = Banter(
            id=str(uuid.uuid4()),
            message="Uplink confirmed. Buffalo Node is now broadcasting.",
            message_type="chat"
        )
        session.add(log)
        try:
            await session.commit()
            print("✓ SUCCESS: HEARTBEAT_SENT")
        except Exception as e:
            print(f"FAILED: {e}")
            await session.rollback()

if __name__ == "__main__":
    asyncio.run(heartbeat())
