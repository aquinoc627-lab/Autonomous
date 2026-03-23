# Autonomous — Kali Linux Tool Arsenal Installation Guide

This guide provides the exact installation commands for all 44 penetration testing tools supported by **Autonomous's Tool Arsenal**. While Kali Linux comes with many of these pre-installed, running these commands ensures you have the latest versions and all required dependencies for Autonomous's autonomous agents to execute them successfully.

---

## 1. The "One-Liner" Master Install

If you want to install the entire Tool Arsenal in one go, run this master command in your Kali terminal. It covers all tools available via the standard `apt` package manager:

```bash
sudo apt update && sudo apt install -y nmap masscan amass whatweb theharvester sqlmap nikto zaproxy gobuster wpscan hydra john hashcat crunch aircrack-ng wifite kismet tcpdump tshark bettercap responder netcat-openbsd bloodhound tor proxychains4
```

*Note: Some specialized tools (like Subfinder, Nuclei, and Empire) require `go install` or `pip install` and are covered in the category breakdowns below.*

---

## 2. Installation by Category

If you prefer to install tools a la carte based on your mission requirements, use the category-specific commands below.

### Reconnaissance (Information Gathering)
These tools are essential for the "AI-Driven Full Reconnaissance" playbook.

| Tool | Description | Install Command |
| :--- | :--- | :--- |
| **Nmap** | Network mapper & port scanner | `sudo apt install -y nmap` |
| **Masscan** | Ultra-fast internet port scanner | `sudo apt install -y masscan` |
| **Amass** | Attack surface mapping | `sudo apt install -y amass` |
| **Subfinder** | Passive subdomain enumeration | `go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest` |
| **WhatWeb** | Web technology fingerprinting | `sudo apt install -y whatweb` |
| **theHarvester** | OSINT email & subdomain gatherer | `sudo apt install -y theharvester` |

### Web Application Testing
Required for the "Web Application Penetration Test" playbook.

| Tool | Description | Install Command |
| :--- | :--- | :--- |
| **SQLMap** | Automated SQL injection | `sudo apt install -y sqlmap` |
| **Nikto** | Web server scanner | `sudo apt install -y nikto` |
| **OWASP ZAP** | Web app vulnerability scanner | `sudo apt install -y zaproxy` |
| **Gobuster** | Directory/file brute-forcing | `sudo apt install -y gobuster` |
| **WPScan** | WordPress vulnerability scanner | `sudo apt install -y wpscan` |
| **Nuclei** | Template-based vulnerability scanner | `go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest` |

### Password & Credential Testing
Required for the "Password Audit & Credential Testing" playbook.

| Tool | Description | Install Command |
| :--- | :--- | :--- |
| **Hydra** | Network logon brute-forcer | `sudo apt install -y hydra` |
| **John the Ripper** | Offline password cracker | `sudo apt install -y john` |
| **Hashcat** | Advanced password recovery | `sudo apt install -y hashcat` |
| **Crunch** | Custom wordlist generator | `sudo apt install -y crunch` |

### OSINT (Open Source Intelligence)
Required for the "OSINT & Social Engineering Recon" playbook.

| Tool | Description | Install Command |
| :--- | :--- | :--- |
| **SpiderFoot** | Automated OSINT collection | `pip3 install spiderfoot --break-system-packages` |
| **Sherlock** | Social media account hunter | `pip3 install sherlock-project --break-system-packages` |
| **Shodan CLI** | IoT search engine CLI | `pip3 install shodan --break-system-packages` |

### Wireless Assessment
Required for the "Wireless Network Assessment" playbook.

| Tool | Description | Install Command |
| :--- | :--- | :--- |
| **Aircrack-ng** | WiFi security auditing suite | `sudo apt install -y aircrack-ng` |
| **Wifite2** | Automated wireless attack tool | `sudo apt install -y wifite` |
| **Kismet** | Wireless network detector/sniffer | `sudo apt install -y kismet` |

### Network & MITM
Required for the "Internal Network Penetration Test" playbook.

| Tool | Description | Install Command |
| :--- | :--- | :--- |
| **TCPDump** | Command-line packet analyzer | `sudo apt install -y tcpdump` |
| **TShark** | Terminal-based Wireshark | `sudo apt install -y tshark` |
| **Bettercap** | Swiss Army knife for network attacks | `sudo apt install -y bettercap` |
| **Responder** | LLMNR/NBT-NS poisoner | `sudo apt install -y responder` |
| **Netcat** | TCP/IP Swiss Army knife | `sudo apt install -y netcat-openbsd` |

### Post-Exploitation & Active Directory
Advanced tools for lateral movement and privilege escalation.

| Tool | Description | Install Command |
| :--- | :--- | :--- |
| **LinPEAS** | Linux privilege escalation script | `curl -L https://github.com/peass-ng/PEASS-ng/releases/latest/download/linpeas.sh -o /usr/local/bin/linpeas.sh && chmod +x /usr/local/bin/linpeas.sh` |
| **BloodHound** | AD attack path analysis | `sudo apt install -y bloodhound` |
| **Empire** | Post-exploitation C2 framework | `pip3 install powershell-empire --break-system-packages` |

### Darknet & Anonymity
Required for the "Darknet Exposure Assessment" playbook.

| Tool | Description | Install Command |
| :--- | :--- | :--- |
| **Tor** | Anonymous communication network | `sudo apt install -y tor` |
| **ProxyChains** | Force TCP connections through proxies | `sudo apt install -y proxychains4` |
| **OnionScan** | Dark web hidden service investigator | `go install github.com/s-rah/onionscan@latest` |

### AI Ops & Automated Pipelines
Frameworks that chain multiple tools together.

| Tool | Description | Install Command |
| :--- | :--- | :--- |
| **AutoRecon** | Multi-threaded automated recon | `pip3 install autorecon --break-system-packages` |
| **ReconFTW** | Automated recon framework | `git clone https://github.com/six2dez/reconftw /opt/reconftw && cd /opt/reconftw && ./install.sh` |

---

## 3. Verifying Installation

Once you have installed the tools, you can verify they are accessible to Autonomous by opening the **Terminal** tab in the dashboard and running:

```bash
tools
```

This built-in command will query the backend registry and list all tools that are currently available and ready for execution by your agents.
