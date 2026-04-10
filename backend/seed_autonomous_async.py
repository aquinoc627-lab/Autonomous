import asyncio
import uuid
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import delete

from app.models.agent import Agent
from app.models.mission import Mission

# Absolute path alignment
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "autonomous.db")
ASYNC_DB_URL = f"sqlite+aiosqlite:///{DB_PATH}"

engine = create_async_engine(ASYNC_DB_URL)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def seed():
    async with async_session() as session:
        print(f"Connecting to: {DB_PATH}")
        try:
            await session.execute(delete(Agent))
            await session.execute(delete(Mission))
            
            agents = [
                Agent(id=str(uuid.uuid4()), name="RECON_ALPHA", status="IDLE"),
                Agent(id=str(uuid.uuid4()), name="CIPHER_GATE", status="ACTIVE"),
                Agent(id=str(uuid.uuid4()), name="SENTINEL_BUFFALO", status="MONITORING")
            ]
            
            missions = [
                Mission(id=str(uuid.uuid4()), name="BUFFALO_PERIMETER_SCAN", status="QUEUED", priority="medium", parent_id="all"),
                Mission(id=str(uuid.uuid4()), name="ENCRYPT_CORE_LOGS", status="ACTIVE", priority="high", parent_id="all"),
            ]
            
            session.add_all(agents + missions)
            await session.commit()
            print("✓ SUCCESS: AUTONOMOUS // NODE_DATA SEEDED")
        except Exception as e:
            print(f"FAILED TO SEED: {e}")
            await session.rollback()

if __name__ == "__main__":
    asyncio.run(seed())
# Adding to existing seed script
async def seed_banter():
    from app.models.banter import Banter
    async with async_session() as session:
        logs = [
            Banter(id=str(uuid.uuid4()), agent_name="RECON_ALPHA", content="Initializing Buffalo perimeter sweep..."),
            Banter(id=str(uuid.uuid4()), agent_name="CIPHER_GATE", content="Neural link stabilized. Monitoring node traffic."),
            Banter(id=str(uuid.uuid4()), agent_name="SYSTEM", content="All Autonomous protocols standing by.")
        ]
        session.add_all(logs)
        await session.commit()
        print("✓ SUCCESS: BANTER_STREAM SEEDED")

# Modify the __main__ block to run seed_banter() too
