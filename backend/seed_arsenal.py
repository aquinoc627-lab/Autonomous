import asyncio
from app.core.database import AsyncSessionLocal
from app.models.tool import Tool

async def seed():
    async with AsyncSessionLocal() as session:
        # Adding your standard toolkit
        items = [
            Tool(id="nmap", name="Nmap", category="RECON", description="Network mapper for discovery"),
            Tool(id="ffuf", name="FFUF", category="FUZZ", description="Fast web fuzzer"),
            Tool(id="sherlock", name="Sherlock", category="OSINT", description="Hunt social media accounts"),
            Tool(id="sqlmap", name="SQLMap", category="EXPLOIT", description="Automatic SQL injection tool")
        ]
        session.add_all(items)
        await session.commit()
        print("✓ ARSENAL UPDATED: 4 TOOLS UPLINKED")

if __name__ == "__main__":
    asyncio.run(seed())
