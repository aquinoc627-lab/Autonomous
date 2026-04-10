import asyncio
from app.core.database import AsyncSessionLocal
from app.models.tool import Tool
from sqlalchemy import delete

async def seed():
    async with AsyncSessionLocal() as session:
        await session.execute(delete(Tool))
        
        # Add as many as you need here
        full_toolkit = [
            Tool(id="nmap", name="Nmap", category="RECON", description="Network Mapper"),
            Tool(id="dirb", name="DIRB", category="RECON", description="Web Content Scanner"),
            Tool(id="nikto", name="Nikto", category="RECON", description="Web Server Scanner"),
            Tool(id="gobuster", name="GoBuster", category="RECON", description="Directory/DNS Busting"),
            Tool(id="sqlmap", name="SQLMap", category="EXPLOIT", description="Automatic SQL Injection"),
            Tool(id="msfconsole", name="Metasploit", category="EXPLOIT", description="MSF Framework"),
            Tool(id="hydra", name="Hydra", category="AUTH", description="Network Login Cracker"),
            Tool(id="john", name="JohnTheRipper", category="AUTH", description="Password Cracker"),
            Tool(id="hashcat", name="Hashcat", category="AUTH", description="Advanced Hash Cracker"),
            Tool(id="wireshark", name="Wireshark", category="NETWORK", description="Packet Analyzer"),
            Tool(id="aircrack-ng", name="Aircrack", category="WIFI", description="Wireless Audit Tool"),
            Tool(id="autopsy", name="Autopsy", category="FORENSIC", description="Digital Forensics")
        ]
        
        session.add_all(full_toolkit)
        await session.commit()
        print(f"✓ ARSENAL FULLY POPULATED: {len(full_toolkit)} TOOLS ONLINE")

if __name__ == "__main__":
    asyncio.run(seed())
