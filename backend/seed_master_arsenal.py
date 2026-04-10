import asyncio
from app.core.database import AsyncSessionLocal
from app.models.tool import Tool
from sqlalchemy import delete

async def seed():
    async with AsyncSessionLocal() as session:
        await session.execute(delete(Tool))
        
        tools_data = [
            ["nmap", "Nmap", "Network mapper — port scanning, service detection, and OS fingerprinting.", "Recon", "linux, windows, android"],
            ["masscan", "Masscan", "Ultra-fast internet port scanner.", "Recon", "linux"],
            ["amass", "Amass", "In-depth attack surface mapping and external asset discovery.", "Recon", "linux, windows"],
            ["subfinder", "Subfinder", "Fast passive subdomain enumeration tool.", "Recon", "linux, windows, android"],
            ["whatweb", "WhatWeb", "Web technology fingerprinting (CMS, frameworks, etc).", "Recon", "linux"],
            ["theHarvester", "theHarvester", "Gather emails, subdomains, and names from public sources.", "Recon", "linux"],
            ["sqlmap", "SQLMap", "Automatic SQL injection detection and exploitation tool.", "Web", "linux, windows, android"],
            ["nikto", "Nikto", "Web server vulnerability scanner for misconfigurations.", "Web", "linux"],
            ["gobuster", "Gobuster", "Directory/file brute-forcing tool.", "Web", "linux, windows"],
            ["nuclei", "Nuclei", "Fast, template-based vulnerability scanner.", "Web", "linux, windows, android"],
            ["burpsuite", "Burp Suite", "Industry-standard web application security testing platform.", "Web", "linux, windows"],
            ["wpscan", "WPScan", "WordPress security scanner.", "Web", "linux"],
            ["xsstrike", "XSStrike", "Advanced XSS detection suite.", "Web", "linux"],
            ["metasploit", "Metasploit", "The world's most used penetration testing framework.", "Exploitation", "linux"],
            ["msfvenom", "MSFVenom", "Payload generator and encoder.", "Exploitation", "linux"],
            ["searchsploit", "SearchSploit", "Offline copy of Exploit-DB.", "Exploitation", "linux"],
            ["hydra", "Hydra", "Fast and flexible online password brute-forcing tool.", "Passwords", "linux, windows"],
            ["hashcat", "Hashcat", "World's fastest GPU-accelerated password recovery tool.", "Passwords", "linux, windows"],
            ["john", "John the Ripper", "Versatile password cracker with auto-detection.", "Passwords", "linux, windows"],
            ["crunch", "Crunch", "Wordlist generator based on custom patterns.", "Passwords", "linux"],
            ["spiderfoot", "SpiderFoot", "Automated OSINT collection tool with 200+ modules.", "OSINT", "linux, windows"],
            ["sherlock", "Sherlock", "Hunt down social media accounts by username.", "OSINT", "linux, windows, android"],
            ["maltego", "Maltego", "Visual link analysis and data mining for OSINT.", "OSINT", "linux, windows"],
            ["shodan_cli", "Shodan CLI", "Search engine for internet-connected devices.", "OSINT", "linux, windows, android"],
            ["aircrack", "Aircrack-ng", "Complete suite for WiFi security auditing.", "Wireless", "linux, android"],
            ["wifite", "Wifite2", "Automated wireless attack tool.", "Wireless", "linux"],
            ["kismet", "Kismet", "Wireless network detector and sniffer.", "Wireless", "linux"],
            ["tcpdump", "TCPDump", "Command-line packet analyzer.", "Network", "linux, android"],
            ["wireshark_cli", "TShark", "Terminal-based version of Wireshark.", "Network", "linux, windows"],
            ["bettercap", "Bettercap", "Swiss Army knife for network attacks and MITM.", "Network", "linux, android"],
            ["responder", "Responder", "LLMNR, NBT-NS, and MDNS poisoner.", "Network", "linux"],
            ["netcat", "Netcat (nc)", "The TCP/IP Swiss Army knife.", "Network", "linux, windows, android"],
            ["linpeas", "LinPEAS", "Linux Privilege Escalation Awesome Script.", "Post-Exploitation", "linux, android"],
            ["winpeas", "WinPEAS", "Windows Privilege Escalation Awesome Script.", "Post-Exploitation", "windows"],
            ["mimikatz", "Mimikatz", "Windows credential extraction tool.", "Post-Exploitation", "windows"],
            ["bloodhound", "BloodHound", "Active Directory attack path analysis.", "Post-Exploitation", "linux, windows"],
            ["empire", "PowerShell Empire", "Post-exploitation and adversary emulation framework.", "Post-Exploitation", "linux"],
            ["tor", "Tor", "Anonymous communication network.", "Darknet", "linux, windows, android"],
            ["proxychains", "ProxyChains", "Force TCP connections through proxy chains.", "Darknet", "linux, android"],
            ["onionscan", "OnionScan", "Investigate and deanonymize dark web services.", "Darknet", "linux"],
            ["autorecon", "AutoRecon", "Multi-threaded automated reconnaissance tool.", "AI Ops", "linux"],
            ["reconftw", "ReconFTW", "Automated reconnaissance framework.", "AI Ops", "linux"],
            ["vuln_analyzer", "AI Vulnerability Analyzer", "Built-in Gemini-powered vuln analysis.", "AI Ops", "linux, windows, android"],
            ["nlp_command", "NLP Command Generator", "Built-in natural language to command converter.", "AI Ops", "linux, windows, android"]
        ]

        full_arsenal = [Tool(id=t[0], name=t[1], description=t[2], category=t[3], supported_os=t[4]) for t in tools_data]
        
        session.add_all(full_arsenal)
        await session.commit()
        print(f"✓ MASTER ARSENAL ONLINE: {len(full_arsenal)} TOOLS UPLINKED")

if __name__ == "__main__":
    asyncio.run(seed())
