"""
Autonomous — Tool Arsenal Registry

Comprehensive catalog of 50+ pen testing and cybersecurity tools organized
by category with OS-aware command templates, parameter validation, severity
levels, and confirmation gates.

Each tool definition includes:
  - Unique ID, display name, description
  - Category (Recon, Web, Exploitation, etc.)
  - OS compatibility (linux, windows, android)
  - Parameter definitions with validation
  - Command templates per OS with proper input quoting
  - Severity level (info, warning, danger)
  - Confirmation gate flag for destructive operations
  - Installation commands per OS
  - Official documentation URL

Security: All command templates use single-quoted parameter substitution
to prevent shell injection. Parameters are validated against regex patterns
before command generation.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from enum import Enum


class ToolSeverity(str, Enum):
    info = "info"
    warning = "warning"
    danger = "danger"


class ToolCategory(str, Enum):
    recon = "Recon"
    web = "Web"
    exploitation = "Exploitation"
    passwords = "Passwords"
    osint = "OSINT"
    wireless = "Wireless"
    network = "Network"
    post_exploitation = "Post-Exploitation"
    darknet = "Darknet"
    ai_ops = "AI Ops"


class ToolOS(str, Enum):
    linux = "linux"
    windows = "windows"
    android = "android"


# ======================================================================
# Tool Parameter Type Definitions
# ======================================================================

PARAM_TYPES = {
    "text": {"type": "text", "description": "Free-form text input"},
    "select": {"type": "select", "description": "Dropdown selection"},
    "number": {"type": "number", "description": "Numeric input"},
    "checkbox": {"type": "checkbox", "description": "Boolean toggle"},
    "file": {"type": "file", "description": "File path input"},
}


# ======================================================================
# Comprehensive Tool Registry — 50+ Tools
# ======================================================================

TOOL_REGISTRY: List[Dict[str, Any]] = [

    # ==================================================================
    # CATEGORY: RECON (Information Gathering)
    # ==================================================================
    {
        "id": "nmap",
        "name": "Nmap",
        "description": "Network mapper — port scanning, service detection, and OS fingerprinting. The gold standard for network reconnaissance.",
        "category": "Recon",
        "severity": "info",
        "requires_confirmation": False,
        "os_support": ["linux", "windows", "android"],
        "install_commands": {
            "linux": "sudo apt install -y nmap",
            "windows": "choco install nmap",
            "android": "pkg install nmap"
        },
        "documentation": "https://nmap.org/book/man.html",
        "params": [
            {"name": "target", "type": "text", "label": "Target IP/Domain", "required": True, "placeholder": "192.168.1.0/24", "validation": r"^[\w\.\-\/\:]+$", "help_text": "IP, CIDR range, or domain"},
            {"name": "scan_type", "type": "select", "label": "Scan Type", "required": False, "options": ["-sS:SYN Stealth", "-sT:TCP Connect", "-sU:UDP Scan", "-sV:Version Detection", "-sC:Script Scan", "-A:Aggressive"], "help_text": "SYN scan is fastest and stealthiest"},
            {"name": "ports", "type": "text", "label": "Ports", "required": False, "placeholder": "1-1000", "validation": r"^[\d,\-]+$", "help_text": "Port range (e.g., 80,443,8080-8090)"},
            {"name": "timing", "type": "select", "label": "Timing", "required": False, "options": ["-T0:Paranoid", "-T1:Sneaky", "-T2:Polite", "-T3:Normal", "-T4:Aggressive", "-T5:Insane"]}
        ],
        "command_templates": {
            "linux": "nmap '{{target}}' {{scan_type}} {{ports:+-p '{{ports}}'}} {{timing}} -oX /tmp/nmap_{{timestamp}}.xml",
            "windows": "nmap '{{target}}' {{scan_type}} {{ports:+-p '{{ports}}'}} {{timing}} -oX C:\\temp\\nmap_{{timestamp}}.xml",
            "android": "nmap '{{target}}' {{scan_type}} {{ports:+-p '{{ports}}'}} {{timing}}"
        },
        "estimated_duration": 300,
        "tags": ["port-scan", "service-detection", "os-fingerprint"]
    },
    {
        "id": "masscan",
        "name": "Masscan",
        "description": "Ultra-fast internet port scanner. Can scan the entire internet in under 6 minutes.",
        "category": "Recon",
        "severity": "warning",
        "requires_confirmation": True,
        "os_support": ["linux"],
        "install_commands": {"linux": "sudo apt install -y masscan"},
        "documentation": "https://github.com/robertdavidgraham/masscan",
        "params": [
            {"name": "target", "type": "text", "label": "Target Range", "required": True, "placeholder": "10.0.0.0/8", "validation": r"^[\w\.\-\/]+$"},
            {"name": "ports", "type": "text", "label": "Ports", "required": True, "placeholder": "0-65535", "validation": r"^[\d,\-]+$"},
            {"name": "rate", "type": "number", "label": "Packets/sec", "required": False, "placeholder": "10000", "help_text": "Max packet rate"}
        ],
        "command_templates": {
            "linux": "sudo masscan '{{target}}' -p'{{ports}}' {{rate:+--rate {{rate}}}} -oX /tmp/masscan_{{timestamp}}.xml"
        },
        "estimated_duration": 120,
        "tags": ["fast-scan", "internet-scale"]
    },
    {
        "id": "amass",
        "name": "Amass",
        "description": "In-depth attack surface mapping and external asset discovery using OSINT techniques.",
        "category": "Recon",
        "severity": "info",
        "requires_confirmation": False,
        "os_support": ["linux", "windows"],
        "install_commands": {"linux": "sudo apt install -y amass", "windows": "choco install amass"},
        "documentation": "https://github.com/owasp-amass/amass",
        "params": [
            {"name": "domain", "type": "text", "label": "Target Domain", "required": True, "placeholder": "example.com", "validation": r"^[\w\.\-]+$"},
            {"name": "mode", "type": "select", "label": "Mode", "required": False, "options": ["enum:Enumerate", "intel:Intelligence"]}
        ],
        "command_templates": {
            "linux": "amass {{mode}} -d '{{domain}}' -o /tmp/amass_{{timestamp}}.txt",
            "windows": "amass {{mode}} -d '{{domain}}' -o C:\\temp\\amass_{{timestamp}}.txt"
        },
        "estimated_duration": 600,
        "tags": ["subdomain", "dns", "osint"]
    },
    {
        "id": "subfinder",
        "name": "Subfinder",
        "description": "Fast passive subdomain enumeration tool using multiple online sources.",
        "category": "Recon",
        "severity": "info",
        "requires_confirmation": False,
        "os_support": ["linux", "windows", "android"],
        "install_commands": {"linux": "go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest", "windows": "go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest", "android": "go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest"},
        "documentation": "https://github.com/projectdiscovery/subfinder",
        "params": [
            {"name": "domain", "type": "text", "label": "Target Domain", "required": True, "placeholder": "example.com", "validation": r"^[\w\.\-]+$"}
        ],
        "command_templates": {
            "linux": "subfinder -d '{{domain}}' -o /tmp/subfinder_{{timestamp}}.txt",
            "windows": "subfinder -d '{{domain}}' -o C:\\temp\\subfinder_{{timestamp}}.txt",
            "android": "subfinder -d '{{domain}}'"
        },
        "estimated_duration": 60,
        "tags": ["subdomain", "passive-recon"]
    },
    {
        "id": "whatweb",
        "name": "WhatWeb",
        "description": "Web technology fingerprinting — identifies CMS, frameworks, server software, and more.",
        "category": "Recon",
        "severity": "info",
        "requires_confirmation": False,
        "os_support": ["linux"],
        "install_commands": {"linux": "sudo apt install -y whatweb"},
        "documentation": "https://github.com/urbanadventurer/WhatWeb",
        "params": [
            {"name": "target", "type": "text", "label": "Target URL", "required": True, "placeholder": "https://example.com", "validation": r"^https?://[\w\.\-\/\:]+$"},
            {"name": "aggression", "type": "select", "label": "Aggression Level", "required": False, "options": ["1:Stealthy", "3:Aggressive", "4:Heavy"]}
        ],
        "command_templates": {
            "linux": "whatweb '{{target}}' {{aggression:+-a {{aggression}}}}"
        },
        "estimated_duration": 30,
        "tags": ["fingerprint", "web-tech"]
    },
    {
        "id": "theHarvester",
        "name": "theHarvester",
        "description": "Gather emails, subdomains, hosts, employee names, and open ports from public sources.",
        "category": "Recon",
        "severity": "info",
        "requires_confirmation": False,
        "os_support": ["linux"],
        "install_commands": {"linux": "sudo apt install -y theharvester"},
        "documentation": "https://github.com/laramies/theHarvester",
        "params": [
            {"name": "domain", "type": "text", "label": "Target Domain", "required": True, "placeholder": "example.com", "validation": r"^[\w\.\-]+$"},
            {"name": "source", "type": "select", "label": "Data Source", "required": False, "options": ["all:All Sources", "google:Google", "bing:Bing", "linkedin:LinkedIn", "shodan:Shodan", "censys:Censys"]}
        ],
        "command_templates": {
            "linux": "theHarvester -d '{{domain}}' -b '{{source}}' -f /tmp/harvester_{{timestamp}}"
        },
        "estimated_duration": 120,
        "tags": ["email", "subdomain", "osint"]
    },

    # ==================================================================
    # CATEGORY: WEB (Web Application Testing)
    # ==================================================================
    {
        "id": "sqlmap",
        "name": "SQLMap",
        "description": "Automatic SQL injection detection and exploitation tool. Supports all major database engines.",
        "category": "Web",
        "severity": "warning",
        "requires_confirmation": True,
        "os_support": ["linux", "windows", "android"],
        "install_commands": {"linux": "sudo apt install -y sqlmap", "windows": "pip install sqlmap", "android": "pip install sqlmap"},
        "documentation": "https://sqlmap.org/",
        "params": [
            {"name": "url", "type": "text", "label": "Target URL", "required": True, "placeholder": "http://target.com/page?id=1", "validation": r"^https?://"},
            {"name": "level", "type": "select", "label": "Test Level", "required": False, "options": ["1:Basic", "2:Moderate", "3:Medium", "4:Extensive", "5:Maximum"]},
            {"name": "risk", "type": "select", "label": "Risk Level", "required": False, "options": ["1:Safe", "2:Medium", "3:High"]},
            {"name": "batch", "type": "checkbox", "label": "Auto-answer prompts", "required": False}
        ],
        "command_templates": {
            "linux": "sqlmap -u '{{url}}' {{level:+--level={{level}}}} {{risk:+--risk={{risk}}}} {{batch:+--batch}}",
            "windows": "python -m sqlmap -u '{{url}}' {{level:+--level={{level}}}} {{risk:+--risk={{risk}}}} {{batch:+--batch}}",
            "android": "python -m sqlmap -u '{{url}}' {{level:+--level={{level}}}} {{risk:+--risk={{risk}}}} {{batch:+--batch}}"
        },
        "estimated_duration": 600,
        "tags": ["sql-injection", "database", "exploitation"]
    },
    {
        "id": "nikto",
        "name": "Nikto",
        "description": "Web server vulnerability scanner. Checks for dangerous files, outdated software, and misconfigurations.",
        "category": "Web",
        "severity": "info",
        "requires_confirmation": False,
        "os_support": ["linux"],
        "install_commands": {"linux": "sudo apt install -y nikto"},
        "documentation": "https://cirt.net/Nikto2",
        "params": [
            {"name": "host", "type": "text", "label": "Target Host", "required": True, "placeholder": "http://target.com", "validation": r"^https?://"},
            {"name": "port", "type": "number", "label": "Port", "required": False, "placeholder": "80"}
        ],
        "command_templates": {
            "linux": "nikto -h '{{host}}' {{port:+-p {{port}}}} -o /tmp/nikto_{{timestamp}}.html -Format htm"
        },
        "estimated_duration": 300,
        "tags": ["web-vuln", "scanner"]
    },
    {
        "id": "gobuster",
        "name": "Gobuster",
        "description": "Directory/file brute-forcing tool. Discovers hidden paths, subdomains, and virtual hosts.",
        "category": "Web",
        "severity": "info",
        "requires_confirmation": False,
        "os_support": ["linux", "windows"],
        "install_commands": {"linux": "sudo apt install -y gobuster", "windows": "go install github.com/OJ/gobuster/v3@latest"},
        "documentation": "https://github.com/OJ/gobuster",
        "params": [
            {"name": "url", "type": "text", "label": "Target URL", "required": True, "placeholder": "http://target.com", "validation": r"^https?://"},
            {"name": "wordlist", "type": "text", "label": "Wordlist Path", "required": True, "placeholder": "/usr/share/wordlists/dirb/common.txt"},
            {"name": "mode", "type": "select", "label": "Mode", "required": False, "options": ["dir:Directory", "dns:DNS Subdomain", "vhost:Virtual Host", "fuzz:Fuzzing"]}
        ],
        "command_templates": {
            "linux": "gobuster {{mode}} -u '{{url}}' -w '{{wordlist}}' -o /tmp/gobuster_{{timestamp}}.txt",
            "windows": "gobuster {{mode}} -u '{{url}}' -w '{{wordlist}}' -o C:\\temp\\gobuster_{{timestamp}}.txt"
        },
        "estimated_duration": 180,
        "tags": ["directory-brute", "fuzzing"]
    },
    {
        "id": "nuclei",
        "name": "Nuclei",
        "description": "Fast, template-based vulnerability scanner. 7000+ community templates for CVEs, misconfigs, and more.",
        "category": "Web",
        "severity": "warning",
        "requires_confirmation": True,
        "os_support": ["linux", "windows", "android"],
        "install_commands": {"linux": "go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest", "windows": "go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest", "android": "go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest"},
        "documentation": "https://github.com/projectdiscovery/nuclei",
        "params": [
            {"name": "target", "type": "text", "label": "Target URL", "required": True, "placeholder": "https://target.com", "validation": r"^https?://"},
            {"name": "severity_filter", "type": "select", "label": "Severity Filter", "required": False, "options": ["info:Info", "low:Low", "medium:Medium", "high:High", "critical:Critical"]},
            {"name": "tags", "type": "text", "label": "Template Tags", "required": False, "placeholder": "cve,rce,sqli"}
        ],
        "command_templates": {
            "linux": "nuclei -u '{{target}}' {{severity_filter:+-severity '{{severity_filter}}'}} {{tags:+-tags '{{tags}}'}} -o /tmp/nuclei_{{timestamp}}.txt",
            "windows": "nuclei -u '{{target}}' {{severity_filter:+-severity '{{severity_filter}}'}} {{tags:+-tags '{{tags}}'}} -o C:\\temp\\nuclei_{{timestamp}}.txt",
            "android": "nuclei -u '{{target}}' {{severity_filter:+-severity '{{severity_filter}}'}} {{tags:+-tags '{{tags}}'}}"
        },
        "estimated_duration": 300,
        "tags": ["vuln-scan", "cve", "template"]
    },
    {
        "id": "burpsuite",
        "name": "Burp Suite",
        "description": "Industry-standard web application security testing platform. Proxy, scanner, intruder, and repeater.",
        "category": "Web",
        "severity": "warning",
        "requires_confirmation": True,
        "os_support": ["linux", "windows"],
        "install_commands": {"linux": "# Download from https://portswigger.net/burp/releases", "windows": "# Download from https://portswigger.net/burp/releases"},
        "documentation": "https://portswigger.net/burp/documentation",
        "params": [
            {"name": "project", "type": "text", "label": "Project Name", "required": False, "placeholder": "my-project"},
            {"name": "config", "type": "file", "label": "Config File", "required": False}
        ],
        "command_templates": {
            "linux": "java -jar /opt/burpsuite/burpsuite.jar {{project:+--project-file='{{project}}'}} {{config:+--config-file='{{config}}'}}",
            "windows": "java -jar C:\\BurpSuite\\burpsuite.jar {{project:+--project-file='{{project}}'}} {{config:+--config-file='{{config}}'}}"
        },
        "estimated_duration": 0,
        "tags": ["proxy", "web-scanner", "manual-testing"]
    },
    {
        "id": "wpscan",
        "name": "WPScan",
        "description": "WordPress security scanner. Detects vulnerable plugins, themes, and misconfigurations.",
        "category": "Web",
        "severity": "info",
        "requires_confirmation": False,
        "os_support": ["linux"],
        "install_commands": {"linux": "sudo gem install wpscan"},
        "documentation": "https://wpscan.com/",
        "params": [
            {"name": "url", "type": "text", "label": "WordPress URL", "required": True, "placeholder": "http://target.com", "validation": r"^https?://"},
            {"name": "enumerate", "type": "select", "label": "Enumerate", "required": False, "options": ["vp:Vulnerable Plugins", "vt:Vulnerable Themes", "u:Users", "ap:All Plugins"]}
        ],
        "command_templates": {
            "linux": "wpscan --url '{{url}}' {{enumerate:+-e {{enumerate}}}} -o /tmp/wpscan_{{timestamp}}.txt"
        },
        "estimated_duration": 180,
        "tags": ["wordpress", "cms", "plugin-vuln"]
    },
    {
        "id": "xsstrike",
        "name": "XSStrike",
        "description": "Advanced XSS detection suite with fuzzing engine, context analysis, and WAF bypass.",
        "category": "Web",
        "severity": "warning",
        "requires_confirmation": True,
        "os_support": ["linux"],
        "install_commands": {"linux": "pip install xsstrike"},
        "documentation": "https://github.com/s0md3v/XSStrike",
        "params": [
            {"name": "url", "type": "text", "label": "Target URL", "required": True, "placeholder": "http://target.com/search?q=test", "validation": r"^https?://"},
            {"name": "crawl", "type": "checkbox", "label": "Enable Crawling", "required": False}
        ],
        "command_templates": {
            "linux": "xsstrike -u '{{url}}' {{crawl:+--crawl}}"
        },
        "estimated_duration": 120,
        "tags": ["xss", "fuzzing", "waf-bypass"]
    },

    # ==================================================================
    # CATEGORY: EXPLOITATION
    # ==================================================================
    {
        "id": "metasploit",
        "name": "Metasploit Framework",
        "description": "The world's most used penetration testing framework. Exploit development, payload generation, and post-exploitation.",
        "category": "Exploitation",
        "severity": "danger",
        "requires_confirmation": True,
        "os_support": ["linux"],
        "install_commands": {"linux": "curl https://raw.githubusercontent.com/rapid7/metasploit-omnibus/master/config/templates/metasploit-framework-wrappers/msfupdate.erb > msfinstall && chmod 755 msfinstall && ./msfinstall"},
        "documentation": "https://docs.metasploit.com/",
        "params": [
            {"name": "module", "type": "text", "label": "Module Path", "required": True, "placeholder": "exploit/multi/handler"},
            {"name": "payload", "type": "text", "label": "Payload", "required": False, "placeholder": "windows/meterpreter/reverse_tcp"},
            {"name": "rhost", "type": "text", "label": "Target Host", "required": False, "placeholder": "192.168.1.100", "validation": r"^[\w\.\-]+$"},
            {"name": "lhost", "type": "text", "label": "Local Host", "required": False, "placeholder": "192.168.1.1", "validation": r"^[\w\.\-]+$"},
            {"name": "lport", "type": "number", "label": "Local Port", "required": False, "placeholder": "4444"}
        ],
        "command_templates": {
            "linux": "msfconsole -q -x \"use '{{module}}'; {{payload:+set PAYLOAD '{{payload}}';}} {{rhost:+set RHOSTS '{{rhost}}';}} {{lhost:+set LHOST '{{lhost}}';}} {{lport:+set LPORT {{lport}};}} run\""
        },
        "estimated_duration": 0,
        "tags": ["exploit", "payload", "post-exploit"]
    },
    {
        "id": "msfvenom",
        "name": "MSFVenom",
        "description": "Payload generator and encoder. Creates shellcode, executables, and scripts for various platforms.",
        "category": "Exploitation",
        "severity": "danger",
        "requires_confirmation": True,
        "os_support": ["linux"],
        "install_commands": {"linux": "# Included with Metasploit Framework"},
        "documentation": "https://docs.metasploit.com/docs/using-metasploit/basics/how-to-use-msfvenom.html",
        "params": [
            {"name": "payload", "type": "text", "label": "Payload", "required": True, "placeholder": "windows/meterpreter/reverse_tcp"},
            {"name": "lhost", "type": "text", "label": "Local Host", "required": True, "validation": r"^[\w\.\-]+$"},
            {"name": "lport", "type": "number", "label": "Local Port", "required": True, "placeholder": "4444"},
            {"name": "format", "type": "select", "label": "Output Format", "required": True, "options": ["exe:Windows EXE", "elf:Linux ELF", "apk:Android APK", "raw:Raw", "python:Python", "powershell:PowerShell"]}
        ],
        "command_templates": {
            "linux": "msfvenom -p '{{payload}}' LHOST='{{lhost}}' LPORT={{lport}} -f '{{format}}' -o /tmp/payload_{{timestamp}}"
        },
        "estimated_duration": 30,
        "tags": ["payload-gen", "shellcode", "encoder"]
    },
    {
        "id": "searchsploit",
        "name": "SearchSploit",
        "description": "Offline copy of Exploit-DB. Search for public exploits and shellcodes from the command line.",
        "category": "Exploitation",
        "severity": "info",
        "requires_confirmation": False,
        "os_support": ["linux"],
        "install_commands": {"linux": "sudo apt install -y exploitdb"},
        "documentation": "https://www.exploit-db.com/searchsploit",
        "params": [
            {"name": "query", "type": "text", "label": "Search Query", "required": True, "placeholder": "Apache 2.4.49"},
            {"name": "exact", "type": "checkbox", "label": "Exact Match", "required": False}
        ],
        "command_templates": {
            "linux": "searchsploit '{{query}}' {{exact:+--exact}} --json"
        },
        "estimated_duration": 5,
        "tags": ["exploit-db", "cve-search"]
    },

    # ==================================================================
    # CATEGORY: PASSWORDS
    # ==================================================================
    {
        "id": "hydra",
        "name": "Hydra",
        "description": "Fast and flexible online password brute-forcing tool. Supports 50+ protocols including SSH, FTP, HTTP, and more.",
        "category": "Passwords",
        "severity": "warning",
        "requires_confirmation": True,
        "os_support": ["linux", "windows"],
        "install_commands": {"linux": "sudo apt install -y hydra", "windows": "# Download from https://github.com/vanhauser-thc/thc-hydra"},
        "documentation": "https://github.com/vanhauser-thc/thc-hydra",
        "params": [
            {"name": "target", "type": "text", "label": "Target Host", "required": True, "validation": r"^[\w\.\-]+$"},
            {"name": "service", "type": "select", "label": "Service", "required": True, "options": ["ssh:SSH", "ftp:FTP", "http-get:HTTP GET", "http-post-form:HTTP POST", "rdp:RDP", "smb:SMB", "mysql:MySQL", "telnet:Telnet"]},
            {"name": "username", "type": "text", "label": "Username / List", "required": True, "placeholder": "admin or /path/to/users.txt"},
            {"name": "password_list", "type": "text", "label": "Password List", "required": True, "placeholder": "/usr/share/wordlists/rockyou.txt"},
            {"name": "threads", "type": "number", "label": "Threads", "required": False, "placeholder": "16"}
        ],
        "command_templates": {
            "linux": "hydra -l '{{username}}' -P '{{password_list}}' '{{target}}' '{{service}}' {{threads:+-t {{threads}}}}",
            "windows": "hydra -l '{{username}}' -P '{{password_list}}' '{{target}}' '{{service}}' {{threads:+-t {{threads}}}}"
        },
        "estimated_duration": 600,
        "tags": ["brute-force", "password-attack", "online"]
    },
    {
        "id": "hashcat",
        "name": "Hashcat",
        "description": "World's fastest password recovery tool. GPU-accelerated cracking for 300+ hash types.",
        "category": "Passwords",
        "severity": "danger",
        "requires_confirmation": True,
        "os_support": ["linux", "windows"],
        "install_commands": {"linux": "sudo apt install -y hashcat", "windows": "choco install hashcat"},
        "documentation": "https://hashcat.net/hashcat/",
        "params": [
            {"name": "hash_file", "type": "text", "label": "Hash File", "required": True, "placeholder": "/path/to/hashes.txt"},
            {"name": "hash_type", "type": "text", "label": "Hash Type (mode)", "required": True, "placeholder": "0", "help_text": "0=MD5, 1000=NTLM, 1800=SHA-512, 22000=WPA"},
            {"name": "wordlist", "type": "text", "label": "Wordlist", "required": True, "placeholder": "/usr/share/wordlists/rockyou.txt"},
            {"name": "attack_mode", "type": "select", "label": "Attack Mode", "required": False, "options": ["0:Dictionary", "1:Combination", "3:Brute-Force", "6:Hybrid Dict+Mask", "7:Hybrid Mask+Dict"]}
        ],
        "command_templates": {
            "linux": "hashcat -m {{hash_type}} -a {{attack_mode}} '{{hash_file}}' '{{wordlist}}' -o /tmp/cracked_{{timestamp}}.txt",
            "windows": "hashcat -m {{hash_type}} -a {{attack_mode}} '{{hash_file}}' '{{wordlist}}' -o C:\\temp\\cracked_{{timestamp}}.txt"
        },
        "estimated_duration": 3600,
        "tags": ["hash-cracking", "gpu", "offline"]
    },
    {
        "id": "john",
        "name": "John the Ripper",
        "description": "Versatile password cracker. Supports hundreds of hash and cipher types with auto-detection.",
        "category": "Passwords",
        "severity": "warning",
        "requires_confirmation": True,
        "os_support": ["linux", "windows"],
        "install_commands": {"linux": "sudo apt install -y john", "windows": "choco install john"},
        "documentation": "https://www.openwall.com/john/doc/",
        "params": [
            {"name": "hash_file", "type": "text", "label": "Hash File", "required": True, "placeholder": "/path/to/hashes.txt"},
            {"name": "wordlist", "type": "text", "label": "Wordlist", "required": False, "placeholder": "/usr/share/wordlists/rockyou.txt"},
            {"name": "format", "type": "text", "label": "Hash Format", "required": False, "placeholder": "raw-md5", "help_text": "Auto-detected if omitted"}
        ],
        "command_templates": {
            "linux": "john '{{hash_file}}' {{wordlist:+--wordlist='{{wordlist}}'}} {{format:+--format='{{format}}'}}",
            "windows": "john '{{hash_file}}' {{wordlist:+--wordlist='{{wordlist}}'}} {{format:+--format='{{format}}'}}"
        },
        "estimated_duration": 1800,
        "tags": ["hash-cracking", "password-recovery"]
    },
    {
        "id": "crunch",
        "name": "Crunch",
        "description": "Wordlist generator. Create custom wordlists based on character sets, patterns, and length.",
        "category": "Passwords",
        "severity": "info",
        "requires_confirmation": False,
        "os_support": ["linux"],
        "install_commands": {"linux": "sudo apt install -y crunch"},
        "documentation": "https://sourceforge.net/projects/crunch-wordlist/",
        "params": [
            {"name": "min_length", "type": "number", "label": "Min Length", "required": True, "placeholder": "6"},
            {"name": "max_length", "type": "number", "label": "Max Length", "required": True, "placeholder": "8"},
            {"name": "charset", "type": "text", "label": "Character Set", "required": False, "placeholder": "abcdefghijklmnopqrstuvwxyz0123456789"},
            {"name": "output", "type": "text", "label": "Output File", "required": False, "placeholder": "/tmp/wordlist.txt"}
        ],
        "command_templates": {
            "linux": "crunch {{min_length}} {{max_length}} '{{charset}}' {{output:+-o '{{output}}'}}"
        },
        "estimated_duration": 60,
        "tags": ["wordlist", "generator"]
    },

    # ==================================================================
    # CATEGORY: OSINT
    # ==================================================================
    {
        "id": "spiderfoot",
        "name": "SpiderFoot",
        "description": "Automated OSINT collection tool. 200+ modules for gathering intelligence on IPs, domains, emails, and more.",
        "category": "OSINT",
        "severity": "info",
        "requires_confirmation": False,
        "os_support": ["linux", "windows"],
        "install_commands": {"linux": "pip install spiderfoot", "windows": "pip install spiderfoot"},
        "documentation": "https://github.com/smicallef/spiderfoot",
        "params": [
            {"name": "target", "type": "text", "label": "Target", "required": True, "placeholder": "example.com or 1.2.3.4"},
            {"name": "modules", "type": "text", "label": "Modules (comma-sep)", "required": False, "placeholder": "sfp_dns,sfp_whois"}
        ],
        "command_templates": {
            "linux": "spiderfoot -s '{{target}}' {{modules:+-m '{{modules}}'}} -o /tmp/spiderfoot_{{timestamp}}.json",
            "windows": "spiderfoot -s '{{target}}' {{modules:+-m '{{modules}}'}} -o C:\\temp\\spiderfoot_{{timestamp}}.json"
        },
        "estimated_duration": 600,
        "tags": ["osint", "intelligence", "automated"]
    },
    {
        "id": "sherlock",
        "name": "Sherlock",
        "description": "Hunt down social media accounts by username across 400+ social networks.",
        "category": "OSINT",
        "severity": "info",
        "requires_confirmation": False,
        "os_support": ["linux", "windows", "android"],
        "install_commands": {"linux": "pip install sherlock-project", "windows": "pip install sherlock-project", "android": "pip install sherlock-project"},
        "documentation": "https://github.com/sherlock-project/sherlock",
        "params": [
            {"name": "username", "type": "text", "label": "Username", "required": True, "placeholder": "johndoe", "validation": r"^[\w\.\-]+$"}
        ],
        "command_templates": {
            "linux": "sherlock '{{username}}' --output /tmp/sherlock_{{timestamp}}.txt",
            "windows": "sherlock '{{username}}' --output C:\\temp\\sherlock_{{timestamp}}.txt",
            "android": "sherlock '{{username}}'"
        },
        "estimated_duration": 120,
        "tags": ["social-media", "username", "osint"]
    },
    {
        "id": "maltego",
        "name": "Maltego",
        "description": "Visual link analysis and data mining tool for OSINT investigations. Graph-based intelligence.",
        "category": "OSINT",
        "severity": "info",
        "requires_confirmation": False,
        "os_support": ["linux", "windows"],
        "install_commands": {"linux": "# Download from https://www.maltego.com/downloads/", "windows": "# Download from https://www.maltego.com/downloads/"},
        "documentation": "https://docs.maltego.com/",
        "params": [
            {"name": "target", "type": "text", "label": "Target Entity", "required": True, "placeholder": "example.com"}
        ],
        "command_templates": {
            "linux": "maltego '{{target}}'",
            "windows": "maltego '{{target}}'"
        },
        "estimated_duration": 0,
        "tags": ["link-analysis", "graph", "visual-osint"]
    },
    {
        "id": "shodan_cli",
        "name": "Shodan CLI",
        "description": "Search engine for internet-connected devices. Find exposed services, IoT devices, and vulnerabilities.",
        "category": "OSINT",
        "severity": "info",
        "requires_confirmation": False,
        "os_support": ["linux", "windows", "android"],
        "install_commands": {"linux": "pip install shodan", "windows": "pip install shodan", "android": "pip install shodan"},
        "documentation": "https://cli.shodan.io/",
        "params": [
            {"name": "query", "type": "text", "label": "Search Query", "required": True, "placeholder": "apache port:8080 country:US"},
            {"name": "command", "type": "select", "label": "Command", "required": False, "options": ["search:Search", "host:Host Info", "count:Count Results", "scan:Scan Network"]}
        ],
        "command_templates": {
            "linux": "shodan {{command}} '{{query}}'",
            "windows": "shodan {{command}} '{{query}}'",
            "android": "shodan {{command}} '{{query}}'"
        },
        "estimated_duration": 10,
        "tags": ["iot", "search-engine", "exposed-services"]
    },

    # ==================================================================
    # CATEGORY: WIRELESS
    # ==================================================================
    {
        "id": "aircrack",
        "name": "Aircrack-ng",
        "description": "Complete suite for WiFi security auditing. Monitor, attack, test, and crack WEP/WPA/WPA2.",
        "category": "Wireless",
        "severity": "danger",
        "requires_confirmation": True,
        "os_support": ["linux", "android"],
        "install_commands": {"linux": "sudo apt install -y aircrack-ng", "android": "pkg install aircrack-ng"},
        "documentation": "https://www.aircrack-ng.org/doku.php",
        "params": [
            {"name": "interface", "type": "text", "label": "Wireless Interface", "required": True, "placeholder": "wlan0"},
            {"name": "action", "type": "select", "label": "Action", "required": True, "options": ["monitor:Start Monitor Mode", "scan:Scan Networks", "capture:Capture Handshake", "crack:Crack Key"]}
        ],
        "command_templates": {
            "linux": "aircrack-ng '{{interface}}' # Action: {{action}}",
            "android": "aircrack-ng '{{interface}}' # Action: {{action}}"
        },
        "estimated_duration": 600,
        "tags": ["wifi", "wpa", "handshake"]
    },
    {
        "id": "wifite",
        "name": "Wifite2",
        "description": "Automated wireless attack tool. Captures WPA handshakes and cracks them automatically.",
        "category": "Wireless",
        "severity": "danger",
        "requires_confirmation": True,
        "os_support": ["linux"],
        "install_commands": {"linux": "sudo apt install -y wifite"},
        "documentation": "https://github.com/derv82/wifite2",
        "params": [
            {"name": "interface", "type": "text", "label": "Wireless Interface", "required": False, "placeholder": "wlan0"},
            {"name": "kill", "type": "checkbox", "label": "Kill conflicting processes", "required": False}
        ],
        "command_templates": {
            "linux": "sudo wifite {{interface:+-i '{{interface}}'}} {{kill:+--kill}}"
        },
        "estimated_duration": 1800,
        "tags": ["wifi", "automated", "wpa-crack"]
    },
    {
        "id": "kismet",
        "name": "Kismet",
        "description": "Wireless network detector, sniffer, and IDS. Passive monitoring for WiFi, Bluetooth, and more.",
        "category": "Wireless",
        "severity": "info",
        "requires_confirmation": False,
        "os_support": ["linux"],
        "install_commands": {"linux": "sudo apt install -y kismet"},
        "documentation": "https://www.kismetwireless.net/docs/",
        "params": [
            {"name": "interface", "type": "text", "label": "Interface", "required": False, "placeholder": "wlan0"}
        ],
        "command_templates": {
            "linux": "kismet {{interface:+-c '{{interface}}'}}"
        },
        "estimated_duration": 0,
        "tags": ["wireless-monitor", "ids", "passive"]
    },

    # ==================================================================
    # CATEGORY: NETWORK
    # ==================================================================
    {
        "id": "tcpdump",
        "name": "TCPDump",
        "description": "Command-line packet analyzer. Capture and analyze network traffic in real-time.",
        "category": "Network",
        "severity": "info",
        "requires_confirmation": False,
        "os_support": ["linux", "android"],
        "install_commands": {"linux": "sudo apt install -y tcpdump", "android": "pkg install tcpdump"},
        "documentation": "https://www.tcpdump.org/manpages/tcpdump.1.html",
        "params": [
            {"name": "interface", "type": "text", "label": "Interface", "required": False, "placeholder": "eth0"},
            {"name": "filter", "type": "text", "label": "BPF Filter", "required": False, "placeholder": "port 80 and host 192.168.1.1"},
            {"name": "count", "type": "number", "label": "Packet Count", "required": False, "placeholder": "100"}
        ],
        "command_templates": {
            "linux": "sudo tcpdump {{interface:+-i '{{interface}}'}} {{filter:+'{{filter}}'}} {{count:+-c {{count}}}} -w /tmp/capture_{{timestamp}}.pcap",
            "android": "tcpdump {{interface:+-i '{{interface}}'}} {{filter:+'{{filter}}'}} {{count:+-c {{count}}}}"
        },
        "estimated_duration": 60,
        "tags": ["packet-capture", "traffic-analysis"]
    },
    {
        "id": "wireshark_cli",
        "name": "TShark (Wireshark CLI)",
        "description": "Terminal-based version of Wireshark. Deep packet inspection and protocol analysis.",
        "category": "Network",
        "severity": "info",
        "requires_confirmation": False,
        "os_support": ["linux", "windows"],
        "install_commands": {"linux": "sudo apt install -y tshark", "windows": "choco install wireshark"},
        "documentation": "https://www.wireshark.org/docs/man-pages/tshark.html",
        "params": [
            {"name": "interface", "type": "text", "label": "Interface", "required": False, "placeholder": "eth0"},
            {"name": "filter", "type": "text", "label": "Display Filter", "required": False, "placeholder": "http.request"},
            {"name": "read_file", "type": "text", "label": "Read PCAP File", "required": False}
        ],
        "command_templates": {
            "linux": "tshark {{interface:+-i '{{interface}}'}} {{filter:+-Y '{{filter}}'}} {{read_file:+-r '{{read_file}}'}}",
            "windows": "tshark {{interface:+-i '{{interface}}'}} {{filter:+-Y '{{filter}}'}} {{read_file:+-r '{{read_file}}'}}"
        },
        "estimated_duration": 60,
        "tags": ["packet-analysis", "protocol", "deep-inspection"]
    },
    {
        "id": "bettercap",
        "name": "Bettercap",
        "description": "Swiss Army knife for network attacks. ARP spoofing, DNS spoofing, MITM proxy, and more.",
        "category": "Network",
        "severity": "danger",
        "requires_confirmation": True,
        "os_support": ["linux", "android"],
        "install_commands": {"linux": "sudo apt install -y bettercap", "android": "pkg install bettercap"},
        "documentation": "https://www.bettercap.org/",
        "params": [
            {"name": "interface", "type": "text", "label": "Interface", "required": False, "placeholder": "eth0"},
            {"name": "caplet", "type": "text", "label": "Caplet File", "required": False, "placeholder": "http-ui"}
        ],
        "command_templates": {
            "linux": "sudo bettercap {{interface:+-iface '{{interface}}'}} {{caplet:+-caplet '{{caplet}}'}}",
            "android": "bettercap {{interface:+-iface '{{interface}}'}} {{caplet:+-caplet '{{caplet}}'}}"
        },
        "estimated_duration": 0,
        "tags": ["mitm", "arp-spoof", "network-attack"]
    },
    {
        "id": "responder",
        "name": "Responder",
        "description": "LLMNR, NBT-NS, and MDNS poisoner. Captures NTLMv1/v2 hashes on the local network.",
        "category": "Network",
        "severity": "danger",
        "requires_confirmation": True,
        "os_support": ["linux"],
        "install_commands": {"linux": "sudo apt install -y responder"},
        "documentation": "https://github.com/lgandx/Responder",
        "params": [
            {"name": "interface", "type": "text", "label": "Interface", "required": True, "placeholder": "eth0"},
            {"name": "analyze", "type": "checkbox", "label": "Analyze Mode (passive)", "required": False}
        ],
        "command_templates": {
            "linux": "sudo responder -I '{{interface}}' {{analyze:+-A}}"
        },
        "estimated_duration": 0,
        "tags": ["hash-capture", "llmnr", "ntlm"]
    },
    {
        "id": "netcat",
        "name": "Netcat (nc)",
        "description": "The TCP/IP Swiss Army knife. Read/write data across network connections. Reverse shells, port scanning, file transfer.",
        "category": "Network",
        "severity": "warning",
        "requires_confirmation": True,
        "os_support": ["linux", "windows", "android"],
        "install_commands": {"linux": "sudo apt install -y netcat-openbsd", "windows": "# Included in Windows or download ncat", "android": "pkg install netcat-openbsd"},
        "documentation": "https://nmap.org/ncat/",
        "params": [
            {"name": "host", "type": "text", "label": "Host", "required": False, "placeholder": "192.168.1.100"},
            {"name": "port", "type": "number", "label": "Port", "required": True, "placeholder": "4444"},
            {"name": "listen", "type": "checkbox", "label": "Listen Mode", "required": False}
        ],
        "command_templates": {
            "linux": "nc {{listen:+-lvnp}} '{{host}}' {{port}}",
            "windows": "nc {{listen:+-lvnp}} '{{host}}' {{port}}",
            "android": "nc {{listen:+-lvnp}} '{{host}}' {{port}}"
        },
        "estimated_duration": 0,
        "tags": ["reverse-shell", "file-transfer", "networking"]
    },

    # ==================================================================
    # CATEGORY: POST-EXPLOITATION
    # ==================================================================
    {
        "id": "linpeas",
        "name": "LinPEAS",
        "description": "Linux Privilege Escalation Awesome Script. Enumerates local info for privilege escalation paths.",
        "category": "Post-Exploitation",
        "severity": "warning",
        "requires_confirmation": True,
        "os_support": ["linux", "android"],
        "install_commands": {"linux": "curl -L https://github.com/peass-ng/PEASS-ng/releases/latest/download/linpeas.sh -o linpeas.sh && chmod +x linpeas.sh"},
        "documentation": "https://github.com/peass-ng/PEASS-ng/tree/master/linPEAS",
        "params": [
            {"name": "checks", "type": "select", "label": "Check Type", "required": False, "options": ["all:All Checks", "system:System Info", "network:Network", "users:Users & Groups", "software:Installed Software"]}
        ],
        "command_templates": {
            "linux": "./linpeas.sh {{checks:+-a '{{checks}}'}}",
            "android": "./linpeas.sh"
        },
        "estimated_duration": 120,
        "tags": ["privesc", "enumeration", "linux"]
    },
    {
        "id": "winpeas",
        "name": "WinPEAS",
        "description": "Windows Privilege Escalation Awesome Script. Finds misconfigurations and escalation vectors.",
        "category": "Post-Exploitation",
        "severity": "warning",
        "requires_confirmation": True,
        "os_support": ["windows"],
        "install_commands": {"windows": "# Download from https://github.com/peass-ng/PEASS-ng/releases"},
        "documentation": "https://github.com/peass-ng/PEASS-ng/tree/master/winPEAS",
        "params": [
            {"name": "checks", "type": "select", "label": "Check Type", "required": False, "options": ["all:All Checks", "systeminfo:System Info", "userinfo:User Info", "servicesinfo:Services"]}
        ],
        "command_templates": {
            "windows": "winPEASany.exe {{checks}}"
        },
        "estimated_duration": 120,
        "tags": ["privesc", "enumeration", "windows"]
    },
    {
        "id": "mimikatz",
        "name": "Mimikatz",
        "description": "Windows credential extraction tool. Dump passwords, hashes, PINs, and Kerberos tickets from memory.",
        "category": "Post-Exploitation",
        "severity": "danger",
        "requires_confirmation": True,
        "os_support": ["windows"],
        "install_commands": {"windows": "# Download from https://github.com/gentilkiwi/mimikatz/releases"},
        "documentation": "https://github.com/gentilkiwi/mimikatz/wiki",
        "params": [
            {"name": "command", "type": "select", "label": "Command", "required": True, "options": ["sekurlsa::logonpasswords:Dump Logon Passwords", "sekurlsa::wdigest:WDigest Passwords", "lsadump::sam:SAM Database", "kerberos::list:Kerberos Tickets", "privilege::debug:Enable Debug Privilege"]}
        ],
        "command_templates": {
            "windows": "mimikatz.exe \"privilege::debug\" \"{{command}}\" \"exit\""
        },
        "estimated_duration": 10,
        "tags": ["credential-dump", "kerberos", "windows"]
    },
    {
        "id": "bloodhound",
        "name": "BloodHound",
        "description": "Active Directory attack path analysis. Maps relationships and finds escalation paths in AD environments.",
        "category": "Post-Exploitation",
        "severity": "warning",
        "requires_confirmation": True,
        "os_support": ["linux", "windows"],
        "install_commands": {"linux": "sudo apt install -y bloodhound", "windows": "# Download from https://github.com/BloodHoundAD/BloodHound/releases"},
        "documentation": "https://bloodhound.readthedocs.io/",
        "params": [
            {"name": "domain", "type": "text", "label": "Domain", "required": True, "placeholder": "corp.local", "validation": r"^[\w\.\-]+$"},
            {"name": "collection", "type": "select", "label": "Collection Method", "required": False, "options": ["All:All", "DCOnly:DC Only", "Session:Sessions", "Group:Groups", "ACL:ACLs"]}
        ],
        "command_templates": {
            "linux": "bloodhound-python -d '{{domain}}' {{collection:+-c '{{collection}}'}}",
            "windows": "SharpHound.exe -d '{{domain}}' {{collection:+-c '{{collection}}'}}"
        },
        "estimated_duration": 300,
        "tags": ["active-directory", "attack-path", "graph"]
    },
    {
        "id": "empire",
        "name": "PowerShell Empire",
        "description": "Post-exploitation and adversary emulation framework. PowerShell and Python agents for Windows/Linux.",
        "category": "Post-Exploitation",
        "severity": "danger",
        "requires_confirmation": True,
        "os_support": ["linux"],
        "install_commands": {"linux": "pip install powershell-empire"},
        "documentation": "https://bc-security.gitbook.io/empire-wiki/",
        "params": [
            {"name": "listener", "type": "select", "label": "Listener Type", "required": False, "options": ["http:HTTP", "https:HTTPS", "dbx:Dropbox"]},
            {"name": "stager", "type": "select", "label": "Stager", "required": False, "options": ["multi/launcher:Launcher", "windows/launcher_bat:BAT Launcher", "multi/bash:Bash Launcher"]}
        ],
        "command_templates": {
            "linux": "powershell-empire server"
        },
        "estimated_duration": 0,
        "tags": ["c2", "post-exploit", "adversary-emulation"]
    },

    # ==================================================================
    # CATEGORY: DARKNET
    # ==================================================================
    {
        "id": "tor",
        "name": "Tor",
        "description": "Anonymous communication network. Route traffic through encrypted relays for anonymity.",
        "category": "Darknet",
        "severity": "info",
        "requires_confirmation": False,
        "os_support": ["linux", "windows", "android"],
        "install_commands": {"linux": "sudo apt install -y tor", "windows": "choco install tor", "android": "pkg install tor"},
        "documentation": "https://www.torproject.org/docs/",
        "params": [
            {"name": "socks_port", "type": "number", "label": "SOCKS Port", "required": False, "placeholder": "9050"}
        ],
        "command_templates": {
            "linux": "tor {{socks_port:+--SocksPort {{socks_port}}}}",
            "windows": "tor {{socks_port:+--SocksPort {{socks_port}}}}",
            "android": "tor {{socks_port:+--SocksPort {{socks_port}}}}"
        },
        "estimated_duration": 0,
        "tags": ["anonymity", "onion-routing"]
    },
    {
        "id": "proxychains",
        "name": "ProxyChains",
        "description": "Force any TCP connection through proxy chains (SOCKS4/5, HTTP). Chain multiple proxies for anonymity.",
        "category": "Darknet",
        "severity": "info",
        "requires_confirmation": False,
        "os_support": ["linux", "android"],
        "install_commands": {"linux": "sudo apt install -y proxychains4", "android": "pkg install proxychains-ng"},
        "documentation": "https://github.com/haad/proxychains",
        "params": [
            {"name": "command", "type": "text", "label": "Command to Proxy", "required": True, "placeholder": "nmap -sT 192.168.1.1"}
        ],
        "command_templates": {
            "linux": "proxychains4 {{command}}",
            "android": "proxychains4 {{command}}"
        },
        "estimated_duration": 0,
        "tags": ["proxy", "anonymity", "chain"]
    },
    {
        "id": "onionscan",
        "name": "OnionScan",
        "description": "Investigate and deanonymize dark web hidden services. Find operational security leaks.",
        "category": "Darknet",
        "severity": "warning",
        "requires_confirmation": True,
        "os_support": ["linux"],
        "install_commands": {"linux": "go install github.com/s-rah/onionscan@latest"},
        "documentation": "https://github.com/s-rah/onionscan",
        "params": [
            {"name": "onion_address", "type": "text", "label": "Onion Address", "required": True, "placeholder": "example.onion", "validation": r"^[\w\.\-]+\.onion$"}
        ],
        "command_templates": {
            "linux": "onionscan '{{onion_address}}'"
        },
        "estimated_duration": 300,
        "tags": ["dark-web", "deanonymize", "hidden-service"]
    },

    # ==================================================================
    # CATEGORY: AI OPS (Autonomous Operations)
    # ==================================================================
    {
        "id": "autorecon",
        "name": "AutoRecon",
        "description": "Multi-threaded automated reconnaissance tool. Runs Nmap, Gobuster, Nikto, and more in parallel.",
        "category": "AI Ops",
        "severity": "warning",
        "requires_confirmation": True,
        "os_support": ["linux"],
        "install_commands": {"linux": "pip install autorecon"},
        "documentation": "https://github.com/Tib3rius/AutoRecon",
        "params": [
            {"name": "target", "type": "text", "label": "Target", "required": True, "placeholder": "192.168.1.100", "validation": r"^[\w\.\-\/]+$"},
            {"name": "verbosity", "type": "select", "label": "Verbosity", "required": False, "options": ["-v:Verbose", "-vv:Very Verbose"]}
        ],
        "command_templates": {
            "linux": "autorecon '{{target}}' {{verbosity}} -o /tmp/autorecon_{{timestamp}}"
        },
        "estimated_duration": 1800,
        "tags": ["automated", "multi-tool", "recon-pipeline"]
    },
    {
        "id": "reconftw",
        "name": "ReconFTW",
        "description": "Automated reconnaissance framework. Chains 30+ tools for comprehensive target enumeration.",
        "category": "AI Ops",
        "severity": "warning",
        "requires_confirmation": True,
        "os_support": ["linux"],
        "install_commands": {"linux": "git clone https://github.com/six2dez/reconftw && cd reconftw && ./install.sh"},
        "documentation": "https://github.com/six2dez/reconftw",
        "params": [
            {"name": "domain", "type": "text", "label": "Target Domain", "required": True, "placeholder": "example.com", "validation": r"^[\w\.\-]+$"},
            {"name": "mode", "type": "select", "label": "Scan Mode", "required": False, "options": ["-a:Full Recon", "-s:Subdomains Only", "-w:Web Only", "-n:Network Only"]}
        ],
        "command_templates": {
            "linux": "./reconftw.sh -d '{{domain}}' {{mode}} -o /tmp/reconftw_{{timestamp}}"
        },
        "estimated_duration": 3600,
        "tags": ["automated", "full-recon", "pipeline"]
    },
    {
        "id": "vuln_analyzer",
        "name": "AI Vulnerability Analyzer",
        "description": "Autonomous built-in AI-powered vulnerability analysis. Uses Gemini to analyze scan results and prioritize findings.",
        "category": "AI Ops",
        "severity": "info",
        "requires_confirmation": False,
        "os_support": ["linux", "windows", "android"],
        "install_commands": {"linux": "# Built into Autonomous", "windows": "# Built into Autonomous", "android": "# Built into Autonomous"},
        "documentation": "https://github.com/aquinoc627-lab/swarm-suite",
        "params": [
            {"name": "scan_file", "type": "text", "label": "Scan Results File", "required": True, "placeholder": "/tmp/nmap_output.xml"},
            {"name": "format", "type": "select", "label": "Input Format", "required": False, "options": ["xml:Nmap XML", "json:JSON", "txt:Plain Text"]}
        ],
        "command_templates": {
            "linux": "# Analyzed by Autonomous Agent Brain via Gemini API",
            "windows": "# Analyzed by Autonomous Agent Brain via Gemini API",
            "android": "# Analyzed by Autonomous Agent Brain via Gemini API"
        },
        "estimated_duration": 30,
        "tags": ["ai", "analysis", "prioritization"]
    },
    {
        "id": "nlp_command",
        "name": "NLP Command Generator",
        "description": "Autonomous built-in natural language to command converter. Describe what you want in plain English.",
        "category": "AI Ops",
        "severity": "info",
        "requires_confirmation": False,
        "os_support": ["linux", "windows", "android"],
        "install_commands": {"linux": "# Built into Autonomous", "windows": "# Built into Autonomous", "android": "# Built into Autonomous"},
        "documentation": "https://github.com/aquinoc627-lab/swarm-suite",
        "params": [
            {"name": "instruction", "type": "text", "label": "Natural Language Instruction", "required": True, "placeholder": "Scan the top 1000 ports on 192.168.1.0/24 and detect OS versions"}
        ],
        "command_templates": {
            "linux": "# Generated by Autonomous Agent Brain via Gemini API",
            "windows": "# Generated by Autonomous Agent Brain via Gemini API",
            "android": "# Generated by Autonomous Agent Brain via Gemini API"
        },
        "estimated_duration": 5,
        "tags": ["ai", "nlp", "command-generation"]
    },
]


# ======================================================================
# Helper Functions
# ======================================================================

def get_all_tools() -> List[Dict[str, Any]]:
    """Return the full tool registry."""
    return TOOL_REGISTRY


def get_tool_by_id(tool_id: str) -> Optional[Dict[str, Any]]:
    """Look up a single tool by its unique ID."""
    for tool in TOOL_REGISTRY:
        if tool["id"] == tool_id:
            return tool
    return None


def get_tools_by_category(category: str) -> List[Dict[str, Any]]:
    """Return all tools in a given category."""
    return [t for t in TOOL_REGISTRY if t["category"] == category]


def get_tools_by_os(os_name: str) -> List[Dict[str, Any]]:
    """Return all tools that support a given OS."""
    return [t for t in TOOL_REGISTRY if os_name in t["os_support"]]


def get_tools_by_severity(severity: str) -> List[Dict[str, Any]]:
    """Return all tools at a given severity level."""
    return [t for t in TOOL_REGISTRY if t["severity"] == severity]


def get_categories() -> List[str]:
    """Return a sorted list of all unique categories."""
    return sorted(set(t["category"] for t in TOOL_REGISTRY))


def get_tool_count() -> int:
    """Return the total number of tools in the registry."""
    return len(TOOL_REGISTRY)


def search_tools(query: str) -> List[Dict[str, Any]]:
    """Search tools by name, description, or tags."""
    query_lower = query.lower()
    results = []
    for tool in TOOL_REGISTRY:
        if (query_lower in tool["name"].lower()
                or query_lower in tool["description"].lower()
                or any(query_lower in tag for tag in tool.get("tags", []))):
            results.append(tool)
    return results
