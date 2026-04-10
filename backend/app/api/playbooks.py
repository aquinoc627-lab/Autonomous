"""
Autonomous — Playbooks API
========================
Pre-built autonomous attack-chain workflows (playbooks) that orchestrate
multiple tools in sequence with intelligent confirmation gates.

Each playbook is a multi-step pipeline of tool invocations, where each step
references a tool from the Tool Arsenal and defines default parameters,
expected outputs, and gate conditions.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.security import get_current_user

router = APIRouter(prefix="/api/playbooks", tags=["playbooks"])

# ── Playbook Step Schema ──────────────────────────────────────────


class PlaybookStep(BaseModel):
    step_number: int
    tool_id: str
    tool_name: str
    description: str
    default_params: dict = {}
    gate: str = "auto"  # "auto" | "manual" | "conditional"
    gate_description: str = ""
    estimated_duration: int = 30  # seconds
    severity: str = "info"


class Playbook(BaseModel):
    id: str
    name: str
    description: str
    category: str
    difficulty: str  # "beginner" | "intermediate" | "advanced" | "expert"
    estimated_total_time: int  # seconds
    tags: list[str] = []
    steps: list[PlaybookStep] = []
    requires_admin: bool = False
    target_os: list[str] = ["linux"]


# ── Playbook Execution State ─────────────────────────────────────

class PlaybookExecution(BaseModel):
    execution_id: str
    playbook_id: str
    playbook_name: str
    status: str = "pending"  # pending | running | paused | completed | failed | cancelled
    current_step: int = 0
    total_steps: int = 0
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    step_results: list[dict] = []
    target: str = ""
    agent_id: Optional[int] = None


# ── In-Memory Execution Store ────────────────────────────────────

_executions: dict[str, PlaybookExecution] = {}


# ── Pre-Built Playbooks ─────────────────────────────────────────

PLAYBOOKS: list[Playbook] = [
    Playbook(
        id="pb-full-recon",
        name="AI-Driven Full Reconnaissance",
        description="Comprehensive target reconnaissance pipeline: subdomain enumeration, port scanning, service detection, vulnerability scanning, and OSINT gathering. Ideal for initial engagement setup.",
        category="Reconnaissance",
        difficulty="beginner",
        estimated_total_time=600,
        tags=["recon", "subdomain", "portscan", "osint", "automated"],
        target_os=["linux", "windows"],
        steps=[
            PlaybookStep(
                step_number=1,
                tool_id="subfinder",
                tool_name="Subfinder",
                description="Enumerate subdomains for the target domain using passive sources",
                default_params={"domain": "{{target}}"},
                gate="auto",
                gate_description="Proceeds automatically after subdomain list is collected",
                estimated_duration=60,
                severity="info",
            ),
            PlaybookStep(
                step_number=2,
                tool_id="amass",
                tool_name="Amass",
                description="Deep subdomain enumeration with DNS resolution and ASN mapping",
                default_params={"domain": "{{target}}", "mode": "passive"},
                gate="auto",
                gate_description="Merges results with Subfinder output",
                estimated_duration=120,
                severity="info",
            ),
            PlaybookStep(
                step_number=3,
                tool_id="nmap",
                tool_name="Nmap",
                description="Full port scan with service version detection on discovered hosts",
                default_params={"target": "{{target}}", "scan_type": "-sV", "ports": "1-10000"},
                gate="manual",
                gate_description="Review discovered subdomains before scanning ports. Confirm targets are in scope.",
                estimated_duration=180,
                severity="warning",
            ),
            PlaybookStep(
                step_number=4,
                tool_id="nuclei",
                tool_name="Nuclei",
                description="Run vulnerability templates against discovered services",
                default_params={"target": "{{target}}", "severity": "medium,high,critical"},
                gate="manual",
                gate_description="Review open ports and services. Confirm vulnerability scanning is authorized.",
                estimated_duration=120,
                severity="warning",
            ),
            PlaybookStep(
                step_number=5,
                tool_id="theharvester",
                tool_name="theHarvester",
                description="Gather emails, names, and metadata from public sources",
                default_params={"domain": "{{target}}", "source": "all"},
                gate="auto",
                gate_description="Collects OSINT data in parallel with vulnerability scan results",
                estimated_duration=60,
                severity="info",
            ),
        ],
    ),
    Playbook(
        id="pb-web-audit",
        name="Web Application Full Audit",
        description="Complete web application security audit: directory brute-forcing, vulnerability scanning, SQL injection testing, and XSS detection. Covers OWASP Top 10.",
        category="Web Application",
        difficulty="intermediate",
        estimated_total_time=900,
        tags=["web", "owasp", "sqli", "xss", "audit"],
        target_os=["linux", "windows"],
        steps=[
            PlaybookStep(
                step_number=1,
                tool_id="gobuster",
                tool_name="Gobuster",
                description="Directory and file brute-forcing to discover hidden endpoints",
                default_params={"url": "{{target}}", "wordlist": "/usr/share/wordlists/dirb/common.txt"},
                gate="auto",
                gate_description="Automatically proceeds after directory scan completes",
                estimated_duration=120,
                severity="info",
            ),
            PlaybookStep(
                step_number=2,
                tool_id="nikto",
                tool_name="Nikto",
                description="Web server vulnerability scanner for misconfigurations and known issues",
                default_params={"target": "{{target}}"},
                gate="auto",
                gate_description="Runs alongside Gobuster results",
                estimated_duration=180,
                severity="warning",
            ),
            PlaybookStep(
                step_number=3,
                tool_id="nuclei",
                tool_name="Nuclei",
                description="Targeted web vulnerability templates (OWASP Top 10, CVEs)",
                default_params={"target": "{{target}}", "tags": "owasp,cve"},
                gate="manual",
                gate_description="Review Nikto and Gobuster findings before running active exploitation templates",
                estimated_duration=120,
                severity="warning",
            ),
            PlaybookStep(
                step_number=4,
                tool_id="sqlmap",
                tool_name="SQLMap",
                description="Automated SQL injection detection and exploitation on discovered endpoints",
                default_params={"url": "{{target}}"},
                gate="manual",
                gate_description="CRITICAL: SQL injection testing can modify data. Confirm authorization and target URL.",
                estimated_duration=300,
                severity="danger",
            ),
            PlaybookStep(
                step_number=5,
                tool_id="wpscan",
                tool_name="WPScan",
                description="WordPress-specific vulnerability scanning (if applicable)",
                default_params={"url": "{{target}}"},
                gate="conditional",
                gate_description="Only runs if target is detected as WordPress",
                estimated_duration=120,
                severity="warning",
            ),
        ],
    ),
    Playbook(
        id="pb-network-pentest",
        name="Internal Network Penetration Test",
        description="Full internal network assessment: host discovery, service enumeration, credential harvesting, and lateral movement detection.",
        category="Network",
        difficulty="advanced",
        estimated_total_time=1200,
        tags=["network", "internal", "lateral", "credentials"],
        target_os=["linux"],
        requires_admin=True,
        steps=[
            PlaybookStep(
                step_number=1,
                tool_id="nmap",
                tool_name="Nmap",
                description="Network host discovery and service enumeration on target subnet",
                default_params={"target": "{{target}}", "scan_type": "-sn", "ports": ""},
                gate="auto",
                gate_description="Discovers live hosts on the network",
                estimated_duration=60,
                severity="info",
            ),
            PlaybookStep(
                step_number=2,
                tool_id="masscan",
                tool_name="Masscan",
                description="High-speed port scanning across all discovered hosts",
                default_params={"target": "{{target}}", "ports": "1-65535", "rate": "10000"},
                gate="manual",
                gate_description="Review live hosts before full port scan. Confirm network scope.",
                estimated_duration=120,
                severity="warning",
            ),
            PlaybookStep(
                step_number=3,
                tool_id="responder",
                tool_name="Responder",
                description="LLMNR/NBT-NS/mDNS poisoning for credential harvesting",
                default_params={"interface": "eth0"},
                gate="manual",
                gate_description="CRITICAL: Active credential harvesting. Ensure you have authorization for this network.",
                estimated_duration=300,
                severity="danger",
            ),
            PlaybookStep(
                step_number=4,
                tool_id="bloodhound",
                tool_name="BloodHound",
                description="Active Directory attack path mapping and privilege escalation analysis",
                default_params={},
                gate="manual",
                gate_description="Requires domain credentials. Review harvested credentials before proceeding.",
                estimated_duration=180,
                severity="danger",
            ),
            PlaybookStep(
                step_number=5,
                tool_id="linpeas",
                tool_name="LinPEAS",
                description="Local privilege escalation enumeration on compromised hosts",
                default_params={},
                gate="manual",
                gate_description="Only run after gaining initial access to a target host",
                estimated_duration=120,
                severity="warning",
            ),
        ],
    ),
    Playbook(
        id="pb-osint-deep",
        name="Deep OSINT Investigation",
        description="Comprehensive open-source intelligence gathering: social media profiling, email harvesting, domain intelligence, and dark web monitoring.",
        category="OSINT",
        difficulty="beginner",
        estimated_total_time=480,
        tags=["osint", "social", "email", "darkweb", "passive"],
        target_os=["linux", "windows", "android"],
        steps=[
            PlaybookStep(
                step_number=1,
                tool_id="theharvester",
                tool_name="theHarvester",
                description="Harvest emails, subdomains, hosts, and employee names from public sources",
                default_params={"domain": "{{target}}", "source": "all"},
                gate="auto",
                gate_description="Passive data collection from search engines and public databases",
                estimated_duration=60,
                severity="info",
            ),
            PlaybookStep(
                step_number=2,
                tool_id="sherlock",
                tool_name="Sherlock",
                description="Username enumeration across 300+ social media platforms",
                default_params={"username": "{{target}}"},
                gate="auto",
                gate_description="Searches for target username across social platforms",
                estimated_duration=90,
                severity="info",
            ),
            PlaybookStep(
                step_number=3,
                tool_id="spiderfoot",
                tool_name="SpiderFoot",
                description="Automated OSINT collection with 200+ data source modules",
                default_params={"target": "{{target}}"},
                gate="auto",
                gate_description="Deep automated OSINT scan across all available modules",
                estimated_duration=180,
                severity="info",
            ),
            PlaybookStep(
                step_number=4,
                tool_id="shodan_cli",
                tool_name="Shodan CLI",
                description="Search Shodan for internet-facing assets and exposed services",
                default_params={"query": "{{target}}"},
                gate="auto",
                gate_description="Queries Shodan database for target infrastructure",
                estimated_duration=30,
                severity="info",
            ),
            PlaybookStep(
                step_number=5,
                tool_id="recon_ng",
                tool_name="Recon-ng",
                description="Framework-based reconnaissance with modular data aggregation",
                default_params={"domain": "{{target}}"},
                gate="auto",
                gate_description="Aggregates and correlates all OSINT findings",
                estimated_duration=120,
                severity="info",
            ),
        ],
    ),
    Playbook(
        id="pb-wireless-audit",
        name="Wireless Network Security Audit",
        description="Complete wireless security assessment: network discovery, handshake capture, WPA/WPA2 cracking, and rogue AP detection.",
        category="Wireless",
        difficulty="intermediate",
        estimated_total_time=900,
        tags=["wireless", "wifi", "wpa", "handshake", "cracking"],
        target_os=["linux", "android"],
        requires_admin=True,
        steps=[
            PlaybookStep(
                step_number=1,
                tool_id="aircrack_ng",
                tool_name="Aircrack-ng",
                description="Put wireless interface into monitor mode and scan for networks",
                default_params={"interface": "wlan0"},
                gate="auto",
                gate_description="Discovers nearby wireless networks and clients",
                estimated_duration=60,
                severity="warning",
            ),
            PlaybookStep(
                step_number=2,
                tool_id="wifite",
                tool_name="Wifite",
                description="Automated wireless attack tool for WEP/WPA/WPS networks",
                default_params={"interface": "wlan0"},
                gate="manual",
                gate_description="CRITICAL: Select target network. Ensure you have authorization to test this network.",
                estimated_duration=300,
                severity="danger",
            ),
            PlaybookStep(
                step_number=3,
                tool_id="bettercap",
                tool_name="Bettercap",
                description="Network reconnaissance and MITM framework for wireless analysis",
                default_params={"interface": "wlan0"},
                gate="manual",
                gate_description="Active network interception. Confirm scope and authorization.",
                estimated_duration=180,
                severity="danger",
            ),
            PlaybookStep(
                step_number=4,
                tool_id="john",
                tool_name="John the Ripper",
                description="Crack captured WPA handshakes using wordlists",
                default_params={"hash_file": "capture.hccapx", "wordlist": "/usr/share/wordlists/rockyou.txt"},
                gate="auto",
                gate_description="Attempts to crack captured handshake offline",
                estimated_duration=300,
                severity="warning",
            ),
        ],
    ),
    Playbook(
        id="pb-password-audit",
        name="Password & Credential Audit",
        description="Comprehensive password security assessment: brute-force testing, hash cracking, and credential validation across multiple protocols.",
        category="Passwords",
        difficulty="intermediate",
        estimated_total_time=600,
        tags=["passwords", "brute-force", "hash", "credentials"],
        target_os=["linux", "windows"],
        steps=[
            PlaybookStep(
                step_number=1,
                tool_id="cewl",
                tool_name="CeWL",
                description="Generate custom wordlist by crawling the target website",
                default_params={"url": "{{target}}", "depth": "3"},
                gate="auto",
                gate_description="Builds a target-specific wordlist from website content",
                estimated_duration=60,
                severity="info",
            ),
            PlaybookStep(
                step_number=2,
                tool_id="hydra",
                tool_name="Hydra",
                description="Brute-force login credentials against target services (SSH, FTP, HTTP, etc.)",
                default_params={"target": "{{target}}", "service": "ssh", "username": "admin"},
                gate="manual",
                gate_description="CRITICAL: Active brute-force attack. Confirm target service and authorization.",
                estimated_duration=180,
                severity="danger",
            ),
            PlaybookStep(
                step_number=3,
                tool_id="hashcat",
                tool_name="Hashcat",
                description="GPU-accelerated hash cracking for captured password hashes",
                default_params={"hash_file": "hashes.txt", "attack_mode": "0"},
                gate="manual",
                gate_description="Provide hash file from previous steps. Select attack mode and wordlist.",
                estimated_duration=300,
                severity="warning",
            ),
            PlaybookStep(
                step_number=4,
                tool_id="john",
                tool_name="John the Ripper",
                description="CPU-based hash cracking with rule-based mutations",
                default_params={"hash_file": "hashes.txt"},
                gate="auto",
                gate_description="Runs John with default rules on remaining uncracked hashes",
                estimated_duration=120,
                severity="warning",
            ),
        ],
    ),
    Playbook(
        id="pb-red-team",
        name="Red Team Engagement Pipeline",
        description="Full red team simulation: initial access, privilege escalation, lateral movement, and data exfiltration. Expert-level playbook requiring careful execution.",
        category="Red Team",
        difficulty="expert",
        estimated_total_time=3600,
        tags=["red-team", "exploitation", "lateral", "exfiltration"],
        target_os=["linux", "windows"],
        requires_admin=True,
        steps=[
            PlaybookStep(
                step_number=1,
                tool_id="nmap",
                tool_name="Nmap",
                description="Initial reconnaissance and attack surface mapping",
                default_params={"target": "{{target}}", "scan_type": "-sV -sC", "ports": "1-65535"},
                gate="auto",
                gate_description="Maps the complete attack surface",
                estimated_duration=300,
                severity="info",
            ),
            PlaybookStep(
                step_number=2,
                tool_id="nuclei",
                tool_name="Nuclei",
                description="Identify exploitable vulnerabilities for initial access",
                default_params={"target": "{{target}}", "severity": "high,critical"},
                gate="manual",
                gate_description="Review attack surface. Select exploitation vectors.",
                estimated_duration=180,
                severity="warning",
            ),
            PlaybookStep(
                step_number=3,
                tool_id="metasploit",
                tool_name="Metasploit",
                description="Exploit identified vulnerabilities for initial foothold",
                default_params={},
                gate="manual",
                gate_description="CRITICAL: Active exploitation. Confirm target, vulnerability, and payload selection.",
                estimated_duration=300,
                severity="danger",
            ),
            PlaybookStep(
                step_number=4,
                tool_id="mimikatz",
                tool_name="Mimikatz",
                description="Extract credentials from compromised Windows hosts",
                default_params={},
                gate="manual",
                gate_description="CRITICAL: Credential extraction from memory. Requires SYSTEM privileges.",
                estimated_duration=60,
                severity="danger",
            ),
            PlaybookStep(
                step_number=5,
                tool_id="bloodhound",
                tool_name="BloodHound",
                description="Map Active Directory attack paths for privilege escalation",
                default_params={},
                gate="manual",
                gate_description="Analyze AD structure for escalation paths to Domain Admin",
                estimated_duration=180,
                severity="danger",
            ),
            PlaybookStep(
                step_number=6,
                tool_id="chisel",
                tool_name="Chisel",
                description="Establish tunnels for lateral movement and pivoting",
                default_params={},
                gate="manual",
                gate_description="Set up tunnels to reach internal network segments",
                estimated_duration=60,
                severity="warning",
            ),
            PlaybookStep(
                step_number=7,
                tool_id="empire",
                tool_name="Empire",
                description="Post-exploitation framework for persistence and C2",
                default_params={},
                gate="manual",
                gate_description="CRITICAL: Establishing persistence. Confirm scope includes persistence testing.",
                estimated_duration=300,
                severity="danger",
            ),
        ],
    ),
    Playbook(
        id="pb-quick-scan",
        name="Quick Vulnerability Scan",
        description="Fast, lightweight vulnerability assessment for a single target. Perfect for quick checks and initial triage.",
        category="Reconnaissance",
        difficulty="beginner",
        estimated_total_time=180,
        tags=["quick", "scan", "triage", "fast"],
        target_os=["linux", "windows", "android"],
        steps=[
            PlaybookStep(
                step_number=1,
                tool_id="nmap",
                tool_name="Nmap",
                description="Quick top-1000 port scan with service detection",
                default_params={"target": "{{target}}", "scan_type": "-sV --top-ports 1000"},
                gate="auto",
                gate_description="Fast port scan completes in under 60 seconds",
                estimated_duration=60,
                severity="info",
            ),
            PlaybookStep(
                step_number=2,
                tool_id="nuclei",
                tool_name="Nuclei",
                description="Run critical and high severity templates only",
                default_params={"target": "{{target}}", "severity": "critical,high"},
                gate="auto",
                gate_description="Checks for the most critical vulnerabilities only",
                estimated_duration=90,
                severity="warning",
            ),
            PlaybookStep(
                step_number=3,
                tool_id="shodan_cli",
                tool_name="Shodan CLI",
                description="Check Shodan for known exposures and historical data",
                default_params={"query": "{{target}}"},
                gate="auto",
                gate_description="Cross-references findings with Shodan database",
                estimated_duration=30,
                severity="info",
            ),
        ],
    ),
]

PLAYBOOK_MAP = {pb.id: pb for pb in PLAYBOOKS}


# ── API Endpoints ────────────────────────────────────────────────

class PlaybookListResponse(BaseModel):
    playbooks: list[Playbook]
    total: int


class StartExecutionRequest(BaseModel):
    playbook_id: str
    target: str
    agent_id: Optional[int] = None


class StepActionRequest(BaseModel):
    action: str  # "approve" | "skip" | "abort"


@router.get("", response_model=PlaybookListResponse)
async def list_playbooks(
    category: Optional[str] = None,
    difficulty: Optional[str] = None,
    user=Depends(get_current_user),
):
    """List all available playbooks with optional filtering."""
    results = PLAYBOOKS
    if category:
        results = [p for p in results if p.category.lower() == category.lower()]
    if difficulty:
        results = [p for p in results if p.difficulty == difficulty]
    # Non-admin users cannot see admin-only playbooks
    if user.role != "admin":
        results = [p for p in results if not p.requires_admin]
    return PlaybookListResponse(playbooks=results, total=len(results))


@router.get("/categories")
async def list_categories(user=Depends(get_current_user)):
    """List all playbook categories with counts."""
    cats: dict[str, int] = {}
    for pb in PLAYBOOKS:
        if pb.requires_admin and user.role != "admin":
            continue
        cats[pb.category] = cats.get(pb.category, 0) + 1
    return [{"name": k, "count": v} for k, v in sorted(cats.items())]


@router.get("/stats")
async def playbook_stats(user=Depends(get_current_user)):
    """Get playbook statistics."""
    available = PLAYBOOKS if user.role == "admin" else [p for p in PLAYBOOKS if not p.requires_admin]
    difficulties = {}
    categories = {}
    for pb in available:
        difficulties[pb.difficulty] = difficulties.get(pb.difficulty, 0) + 1
        categories[pb.category] = categories.get(pb.category, 0) + 1
    return {
        "total_playbooks": len(available),
        "total_steps": sum(len(pb.steps) for pb in available),
        "difficulties": difficulties,
        "categories": categories,
        "active_executions": sum(1 for e in _executions.values() if e.status in ("running", "paused")),
    }


@router.get("/{playbook_id}", response_model=Playbook)
async def get_playbook(playbook_id: str, user=Depends(get_current_user)):
    """Get a specific playbook by ID."""
    pb = PLAYBOOK_MAP.get(playbook_id)
    if not pb:
        raise HTTPException(status_code=404, detail="Playbook not found")
    if pb.requires_admin and user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required for this playbook")
    return pb


@router.post("/execute")
async def start_execution(req: StartExecutionRequest, user=Depends(get_current_user)):
    """Start a playbook execution."""
    pb = PLAYBOOK_MAP.get(req.playbook_id)
    if not pb:
        raise HTTPException(status_code=404, detail="Playbook not found")
    if pb.requires_admin and user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    exec_id = f"exec-{uuid.uuid4().hex[:12]}"
    execution = PlaybookExecution(
        execution_id=exec_id,
        playbook_id=pb.id,
        playbook_name=pb.name,
        status="running",
        current_step=1,
        total_steps=len(pb.steps),
        started_at=datetime.now(timezone.utc).isoformat(),
        target=req.target,
        agent_id=req.agent_id,
        step_results=[],
    )

    # Check if first step needs a gate
    first_step = pb.steps[0]
    if first_step.gate == "manual":
        execution.status = "paused"

    _executions[exec_id] = execution
    return execution


@router.get("/executions/list")
async def list_executions(user=Depends(get_current_user)):
    """List all playbook executions."""
    return list(_executions.values())


@router.get("/executions/{execution_id}")
async def get_execution(execution_id: str, user=Depends(get_current_user)):
    """Get a specific execution status."""
    execution = _executions.get(execution_id)
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    return execution


@router.post("/executions/{execution_id}/step")
async def step_action(
    execution_id: str,
    req: StepActionRequest,
    user=Depends(get_current_user),
):
    """Approve, skip, or abort a step in a running execution."""
    execution = _executions.get(execution_id)
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")

    pb = PLAYBOOK_MAP.get(execution.playbook_id)
    if not pb:
        raise HTTPException(status_code=404, detail="Playbook not found")

    if req.action == "abort":
        execution.status = "cancelled"
        execution.completed_at = datetime.now(timezone.utc).isoformat()
        return execution

    if req.action == "skip":
        execution.step_results.append({
            "step": execution.current_step,
            "status": "skipped",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
    elif req.action == "approve":
        current_step_def = pb.steps[execution.current_step - 1]
        execution.step_results.append({
            "step": execution.current_step,
            "tool_id": current_step_def.tool_id,
            "tool_name": current_step_def.tool_name,
            "status": "completed",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    # Advance to next step
    if execution.current_step < execution.total_steps:
        execution.current_step += 1
        next_step = pb.steps[execution.current_step - 1]
        if next_step.gate == "manual":
            execution.status = "paused"
        else:
            execution.status = "running"
    else:
        execution.status = "completed"
        execution.completed_at = datetime.now(timezone.utc).isoformat()

    return execution
