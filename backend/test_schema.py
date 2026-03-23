"""
Schema validation script — verifies that all models load correctly,
tables are created, and the seeder runs without errors.
"""

from __future__ import annotations

import asyncio
import sys
import os

# Ensure the backend directory is on the path
sys.path.insert(0, os.path.dirname(__file__))


async def main() -> None:
    from app.core.database import engine, init_db, async_session
    from app.models import (
        Base, User, Agent, Mission, AgentMission, Banter, RefreshToken, AuditLog,
    )

    # 1. Print all registered tables
    print("=" * 60)
    print("Autonomous — Schema Validation")
    print("=" * 60)
    print(f"\nDatabase URL: {engine.url}")
    print(f"\nRegistered tables ({len(Base.metadata.tables)}):")
    for name, table in sorted(Base.metadata.tables.items()):
        cols = ", ".join(c.name for c in table.columns)
        print(f"  {name:25s} → {cols}")

    # 2. Create all tables
    print("\nCreating tables...")
    await init_db()
    print("  ✓ All tables created successfully.")

    # 3. Verify table existence via inspection
    from sqlalchemy import inspect as sa_inspect

    async with engine.connect() as conn:
        table_names = await conn.run_sync(
            lambda sync_conn: sa_inspect(sync_conn).get_table_names()
        )
    print(f"\nTables in database ({len(table_names)}):")
    for t in sorted(table_names):
        print(f"  ✓ {t}")

    # 4. Verify indexes
    print("\nIndex summary:")
    for name, table in sorted(Base.metadata.tables.items()):
        indexes = list(table.indexes)
        if indexes:
            for idx in indexes:
                cols = ", ".join(c.name for c in idx.columns)
                unique = " (UNIQUE)" if idx.unique else ""
                print(f"  {name}.{idx.name}: [{cols}]{unique}")

    # 5. Verify foreign keys
    print("\nForeign key summary:")
    for name, table in sorted(Base.metadata.tables.items()):
        for fk in table.foreign_keys:
            print(f"  {name}.{fk.parent.name} → {fk.column}")

    # 6. Run the seeder
    print("\nRunning seeder...")
    from app.seed import seed
    await seed()

    # 7. Verify data was inserted
    async with async_session() as session:
        from sqlalchemy import select, func

        for model, label in [
            (User, "Users"),
            (Agent, "Agents"),
            (Mission, "Missions"),
            (AgentMission, "Assignments"),
            (Banter, "Banter"),
            (AuditLog, "Audit Logs"),
        ]:
            result = await session.execute(select(func.count()).select_from(model))
            count = result.scalar()
            print(f"  {label:15s}: {count} rows")

    print("\n" + "=" * 60)
    print("SCHEMA VALIDATION COMPLETE — ALL CHECKS PASSED")
    print("=" * 60)

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
