import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import delete
from app.models.mission import Mission
from app.models.banter import Banter
from app.models.agent import Agent

ASYNC_DB_URL = "sqlite+aiosqlite:///./autonomous.db"
engine = create_async_engine(ASYNC_DB_URL)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def purge():
    async with async_session() as session:
        await session.execute(delete(Mission))
        await session.execute(delete(Banter))
        await session.execute(delete(Agent))
        await session.commit()
        print("✓ SUCCESS: ALL LOCAL TEST NODES PURGED.")

if __name__ == "__main__":
    asyncio.run(purge())
