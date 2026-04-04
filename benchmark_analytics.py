import asyncio
import time
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from backend.app.models.base import Base
# Make sure to import models properly without throwing error. Or since we just want to test query performance,
# let's mock the execute and run our query against an in memory sqlite with just the agent table!

from sqlalchemy import select, func, String, Column
from sqlalchemy.orm import declarative_base

TestBase = declarative_base()

class MockAgent(TestBase):
    __tablename__ = 'agents'
    id = Column(String, primary_key=True)
    status = Column(String)

class MockMission(TestBase):
    __tablename__ = 'missions'
    id = Column(String, primary_key=True)
    status = Column(String)


engine = create_async_engine("sqlite+aiosqlite:///:memory:")
SessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)

async def unoptimized(db):
    total_agents = (await db.execute(select(func.count()).select_from(MockAgent))).scalar() or 1
    active_agents = (await db.execute(
        select(func.count()).select_from(MockAgent).where(MockAgent.status.in_(["active", "idle"]))
    )).scalar()
    error_agents = (await db.execute(
        select(func.count()).select_from(MockAgent).where(MockAgent.status == "error")
    )).scalar()
    offline_agents = (await db.execute(
        select(func.count()).select_from(MockAgent).where(MockAgent.status == "offline")
    )).scalar()

    total_missions = (await db.execute(select(func.count()).select_from(MockMission))).scalar() or 1
    completed_missions = (await db.execute(
        select(func.count()).select_from(MockMission).where(MockMission.status == "completed")
    )).scalar()
    failed_missions = (await db.execute(
        select(func.count()).select_from(MockMission).where(MockMission.status == "failed")
    )).scalar()

    in_progress = (await db.execute(
        select(func.count()).select_from(MockMission).where(MockMission.status == "in_progress")
    )).scalar()

    pending = (await db.execute(
        select(func.count()).select_from(MockMission).where(MockMission.status == "pending")
    )).scalar()

    idle = (await db.execute(
        select(func.count()).select_from(MockAgent).where(MockAgent.status == "idle")
    )).scalar()

    return {
        "active": active_agents,
        "error": error_agents,
        "offline": offline_agents,
        "total": total_agents,
        "idle": idle
    }


async def optimized(db):
    # Agent counts
    agent_status_result = await db.execute(
        select(MockAgent.status, func.count()).group_by(MockAgent.status)
    )
    agent_counts = dict(agent_status_result.all())

    # Pre-compute metrics from counts
    active_count = agent_counts.get("active", 0)
    idle_count = agent_counts.get("idle", 0)
    error_agents = agent_counts.get("error", 0)
    offline_agents = agent_counts.get("offline", 0)
    total_agents = sum(agent_counts.values()) or 1
    active_agents = active_count + idle_count

    # Mission counts
    mission_status_result = await db.execute(
        select(MockMission.status, func.count()).group_by(MockMission.status)
    )
    mission_counts = dict(mission_status_result.all())

    completed_missions = mission_counts.get("completed", 0)
    failed_missions = mission_counts.get("failed", 0)
    in_progress = mission_counts.get("in_progress", 0)
    pending = mission_counts.get("pending", 0)
    total_missions = sum(mission_counts.values()) or 1

    return {
        "active": active_agents,
        "error": error_agents,
        "offline": offline_agents,
        "total": total_agents,
        "idle": idle_count
    }


async def run_benchmark():
    async with engine.begin() as conn:
        await conn.run_sync(TestBase.metadata.create_all)

    async with SessionLocal() as db:
        for i in range(100):
            db.add(MockAgent(id=str(i), status=["active", "idle", "error", "offline"][i % 4]))
            db.add(MockMission(id=str(i), status=["completed", "failed", "in_progress", "pending"][i % 4]))
        await db.commit()

        # Warmup
        await unoptimized(db)
        await optimized(db)

        start = time.time()
        for i in range(1000):
            await unoptimized(db)
        end = time.time()
        print(f"Unoptimized Benchmark: {(end - start) / 1000:.5f} seconds per call")
        unop_time = end - start

        start = time.time()
        for i in range(1000):
            await optimized(db)
        end = time.time()
        print(f"Optimized Benchmark: {(end - start) / 1000:.5f} seconds per call")
        op_time = end - start

        print(f"Improvement: {unop_time / op_time:.2f}x faster")

if __name__ == "__main__":
    asyncio.run(run_benchmark())
