import asyncio
from app.core.database import AsyncSessionLocal
from app.models.tool import Tool
from sqlalchemy import delete

async def seed():
    async with AsyncSessionLocal() as session:
        # Clear the old 4 tools first
        await session.execute(delete(Tool))
        
        full_toolkit = [
            # RECON & ENUMERATION
            Tool(id="nmap", name="Nmap", category="RECON", description="Network Mapper"),
            Tool(id="dirb", name="DIRB", category="RECON", description="Web Content Scanner"),
            Tool(id="enum4linux", name="Enum4Linux", category="RECON", description="SMB Enumeration"),
            Tool(id="dnsrecon", name="DNSRecon", category="RECON", description="DNS Enumeration Script"),
            
            # EXPLOITATION
            Tool(id="sqlmap", name="SQLMap", category="EXPLOIT", description="SQL Injection Engine"),
            Tool(id="metasploit", name="Metasploit", category="EXPLOIT", description="Exploitation Framework"),
            Tool(id="beautify", name="BeEF", category="EXPLOIT", description="Browser Exploitation"),
            
            # POST-EXPLOIT & PRIVESC
            Tool(id="linpeas", name="LinPEAS", category="PRIVESC", description="Linux Privilege Escalation"),
            Tool(id="mimikatz", name="Mimikatz", category="CREDENTIALS", description="Windows Password Recovery"),
            
            # OSINT & UTILS
            Tool(id="sherlock", name="Sherlock", category="OSINT", description="Social Media Hunter"),
            Tool(id="theharvester", name="theHarvester", category="OSINT", description="Email/Domain Harvester"),
            Tool(id="ffuf", name="FFUF", category="FUZZ", description="Fast Fuzzer")
        ]
        
        session.add_all(full_toolkit)
        await session.commit()
        print(f"✓ ARSENAL EXPANDED: {len(full_toolkit)} TOOLS ONLINE")

if __name__ == "__main__":
    asyncio.run(seed())
