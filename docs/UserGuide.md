# Autonomous Platform — User Guide

Welcome to **Autonomous**, the AI-powered Orchestration Command Center. This guide walks you through every section of the platform so you can get productive quickly.

---

## Table of Contents

1. [Logging In](#1-logging-in)
2. [Dashboard Overview](#2-dashboard-overview)
3. [Autonomous View](#3-autonomous-view)
4. [Missions](#4-missions)
5. [Agents](#5-agents)
6. [Agent Lab (3D Creator)](#6-agent-lab-3d-creator)
7. [Banter (Real-Time Feed)](#7-banter-real-time-feed)
8. [Tool Arsenal](#8-tool-arsenal)
9. [Playbooks](#9-playbooks)
10. [Terminal](#10-terminal)
11. [Knowledge Graph](#11-knowledge-graph)
12. [OSINT](#12-osint)
13. [Analytics](#13-analytics)
14. [API Keys](#14-api-keys)
15. [Billing](#15-billing)
16. [Global Features](#16-global-features)
17. [Authentication & Roles](#17-authentication--roles)
18. [Troubleshooting](#18-troubleshooting)

---

## 1. Logging In

Navigate to the platform URL (e.g., `http://localhost:3000`). Enter your email and password on the Login page. On success, you are redirected to the main dashboard.

Users sign up with their own email address and password.

> Admins have full access to all features. Operators have read/write access but cannot bypass security confirmation gates for dangerous tools.

---

## 2. Dashboard Overview

After logging in, you land on the **Autonomous View** — the command center home screen. The left-hand sidebar provides navigation to all sections of the platform. The top bar contains:

- **Notification Center** — system alerts and the Autonomous Mode toggle
- **Memory Search** — semantic search across agent memory (brain icon)
- **Voice Control** — microphone widget for voice commands
- **Global Omnibar** — press `Ctrl+K` (or `Cmd+K` on Mac) to open the command palette

---

## 3. Autonomous View

The home screen (`/`) provides a high-level operational overview:

- **Agent Grid**: Displays 3D animated hologram characters for each agent. The hologram color and animation reflect the agent's current status (`idle`, `active`, `thinking`, `error`).
- **Mission Overview**: Summarizes active missions, their statuses, and assigned agents.
- **Collaboration Graph**: A visual map of hierarchical missions and agent-to-agent task delegations.
- **Autonomous Mode**: Toggle the global Autonomous Mode via the Notification Center to allow agents to reason and act without direct user prompts.

---

## 4. Missions

Navigate to **Missions** (`/missions`) to manage all tasks and objectives.

### Creating a Mission
1. Click **New Mission**.
2. Fill in the **Name**, **Description**, **Priority** (`low`, `medium`, `high`, `critical`), and initial **Status** (`pending`).
3. Click **Create**.

### Managing Missions
- **Edit**: Click the edit icon on any mission card to update its details.
- **Delete**: Click the delete icon to remove a mission (and unassign all agents).
- **Assign Agents**: From the mission detail view, select agents to assign. Agents can be assigned to multiple missions simultaneously.
- **Sub-tasks**: Break down complex missions into hierarchical sub-tasks by creating child missions linked to a parent mission.

### Mission Statuses
| Status | Description |
|--------|-------------|
| `pending` | Not yet started |
| `in_progress` | Actively being worked on |
| `completed` | Successfully finished |
| `failed` | Ended with errors |
| `cancelled` | Manually cancelled |

---

## 5. Agents

Navigate to **Agents** (`/agents`) to manage your autonomous team.

### Creating an Agent
1. Click **New Agent** (or use the **Agent Lab** for a 3D creation experience).
2. Provide a **Name**, select a **Persona** template, and configure voice and visual settings.
3. Click **Create Agent**.

### Agent Cards
Each agent is displayed as a card showing its 3D hologram, current status, assigned missions, and available actions:
- **Trigger Brain**: Manually prompt the agent to reason and take action immediately using the Gemini-powered brain.
- **Assign Mission**: Link the agent to one or more missions.
- **Edit / Delete**: Modify or remove the agent.

### Agent Statuses
| Status | Description |
|--------|-------------|
| `idle` | Available, not currently working |
| `active` | Executing a mission or task |
| `thinking` | Processing with the AI brain |
| `error` | Encountered an error |
| `offline` | Unavailable |

---

## 6. Agent Lab (3D Creator)

Navigate to **Agent Lab** (`/lab`) to create and customize agents with a 3D hologram preview.

1. **Name & Role**: Enter the agent's display name and operational role.
2. **Persona**: Choose a personality archetype (e.g., *Stealthy & Precise*, *Analytical & Logical*, *Architect-Sigma* for coding tasks).
3. **Voice Style**: Select a speech synthesis voice that matches the persona.
4. **Visual Attributes**: Configure the hologram color and orbiting icon.
5. **3D Preview**: See a live Three.js 3D hologram preview that animates in real time as you adjust settings.
6. **Deploy**: Click **Create Agent** to deploy the new agent to the live platform instantly.

---

## 7. Banter (Real-Time Feed)

Navigate to **Banter** (`/banter`) to see the live communication feed.

- **Real-time Updates**: Messages appear instantly via WebSocket — no page refresh needed.
- **Message Types**: `chat` (user/agent conversation), `system` (platform events), `alert` (critical notifications), `status_update` (agent progress reports).
- **Filtering**: Filter the feed by mission or agent to focus on relevant conversations.
- **Compose & Send**: Type a message in the input box and press Enter (or click Send) to broadcast to all agents and users.
- **Agent Speech**: Click the 🔊 speaker icon next to any agent message to hear it spoken aloud in the agent's persona voice.

---

## 8. Tool Arsenal

Navigate to **Tool Arsenal** (`/arsenal`) to browse and use the cybersecurity tool catalog.

### Browsing Tools
- **Categories**: Tools are organized into 10 categories — Recon, Web, Exploitation, Passwords, OSINT, Wireless, Network, Post-Exploitation, Darknet, and AI Ops.
- **Search**: Use the search bar to find tools by name or keyword.
- **Filters**: Filter by operating system support (Linux, Windows, Android) or severity level (`info`, `warning`, `danger`).

### Using a Tool
1. Click on a tool to expand its details.
2. Fill in the required parameters (e.g., target IP address, scan type, port range).
3. Click **Generate Command** to produce the exact, OS-aware command string.
4. Click **Assign to Agent** to send the command to a specific agent for execution.

### Security Gates
Tools marked `danger` (e.g., Metasploit, Cobalt Strike) require an **explicit admin confirmation** before the command is sent to an agent. This prevents accidental destructive actions. Operators cannot bypass this gate.

---

## 9. Playbooks

Navigate to **Playbooks** (`/playbooks`) to manage repeatable operational workflows.

- **Create a Playbook**: Define a named sequence of tool commands and agent actions.
- **Execute a Playbook**: Run a playbook against a target to automatically dispatch tasks to the appropriate agents in order.
- **Edit / Delete**: Manage existing playbooks from the playbook list.

Playbooks are ideal for standardizing recurring operations such as reconnaissance sweeps, vulnerability assessments, or incident response procedures.

---

## 10. Terminal

Navigate to **Terminal** (`/terminal`) to access the interactive command interface.

- Execute commands directly within the platform's secure sandbox.
- Output streams in real time to the terminal window.
- Use this for quick diagnostics, script execution, or testing agent command pipelines.

> **Note**: Terminal commands execute within the backend sandbox environment. The sandbox is isolated and does not have direct access to the host system outside of what is explicitly permitted.

---

## 11. Knowledge Graph

Navigate to **Knowledge Graph** (`/knowledge`) to visualize the platform's accumulated intelligence.

- Nodes represent agents, missions, banter messages, and memory records.
- Edges represent relationships and interactions between entities.
- **Zoom & Pan**: Use scroll wheel to zoom, click and drag to pan.
- **Node Details**: Click a node to see its details and connected entities.

The Knowledge Graph gives you situational awareness of how agents are interacting and what information they have accumulated across missions.

---

## 12. OSINT

Navigate to **OSINT** (`/osint`) to perform open-source intelligence gathering.

- **Target Input**: Enter a domain, IP address, username, or email to investigate.
- **Intelligence Sources**: The platform queries multiple OSINT data sources and aggregates results.
- **Results**: View structured intelligence reports including WHOIS data, DNS records, associated social profiles, and more.
- **Export**: Save OSINT results and link them to a mission for agent follow-up.

---

## 13. Analytics

Navigate to **Analytics** (`/analytics`) for performance and system metrics.

- **Activity Graphs**: Visualize mission creation, completion rates, and agent activity over time using interactive recharts.
- **System Health**: Monitor agent availability, active WebSocket connections, and error rates.
- **Banter Distribution**: See trends in message types and communication patterns across the platform.
- **Mission Metrics**: Track mission success/failure ratios and average completion times.

---

## 14. API Keys

Navigate to **API Keys** (`/apikeys`) to manage programmatic access to the platform.

- **Generate Key**: Click **New API Key**, provide a descriptive name, and set an optional expiry date.
- **Copy Key**: Copy the generated key immediately — it is only shown once.
- **Revoke Key**: Delete a key to immediately invalidate all API calls using it.

API keys can be used as a `Bearer` token in the `Authorization` header for direct REST API access without session-based authentication.

---

## 15. Billing

Navigate to **Billing** (`/billing`) to review your subscription and usage.

- **Usage Summary**: View current usage metrics against your plan limits.
- **Subscription Tier**: See your active plan details.
- **Upgrade / Manage**: Initiate plan changes or manage payment methods.

---

## 16. Global Features

### Global Command Palette (Omnibar)
Press `Ctrl+K` (Windows/Linux) or `Cmd+K` (Mac) from anywhere in the dashboard to open the Omnibar. Type to search for pages, agents, missions, or actions and navigate instantly.

### Voice Control
Click the microphone icon in the top bar to activate voice command mode. Supported commands include:
- `"Show Missions"` — navigate to the Missions page
- `"Show Agents"` — navigate to the Agents page
- `"Show Arsenal"` — navigate to the Tool Arsenal
- `"Assign mission [name] to [agent]"` — trigger a mission assignment

### Memory Search (Memory Palace)
Click the brain icon in the top bar to open the Memory Palace search. Enter a natural language query to semantically search all past agent experiences, mission reports, and banter messages stored in the ChromaDB vector database.

### Autonomous Mode
Toggle **Autonomous Mode** on from the Notification Center to allow agents to operate and communicate without direct user prompts. When enabled, the Agent Brain background loop continuously reasons on behalf of active agents based on their current missions and context.

### Kill Switch
The **Kill Switch** (accessible to admins) immediately halts all autonomous agent operations. Use this in an emergency to prevent agents from taking further actions until you are ready to re-engage.

---

## 17. Authentication & Roles

The platform uses **JWT (JSON Web Token)** authentication with refresh token rotation.

| Role | Capabilities |
|------|-------------|
| `admin` | Full access: manage users, bypass tool confirmation gates, access system controls |
| `operator` | Create/manage agents and missions, use tools with confirmation gates enforced |

**OAuth Integration**: If `AUTH_MODE=oauth` is configured, users authenticate via an external OIDC provider (Auth0, Okta, etc.) instead of local credentials.

---

## 18. Troubleshooting

| Problem | Solution |
|---------|----------|
| Cannot log in | Verify username/password. Check that the backend is running (`curl http://localhost:8000/api/health`). |
| Frontend shows "API unreachable" | Confirm `REACT_APP_API_URL` matches the backend URL and the backend container is healthy. |
| Agents not responding | Check backend logs (`docker-compose logs -f backend`) for Gemini API errors. Verify `GEMINI_API_KEY` is set. |
| WebSocket disconnects frequently | Ensure your reverse proxy is configured with WebSocket upgrade headers (see DEPLOYMENT.md). |
| Tool command not generating | Some tools require all fields to be filled. Check the parameters panel for required fields marked with `*`. |
| Voice commands not recognized | Ensure your browser has microphone permission granted for the platform's origin. Use Chrome or Edge for best Web Speech API support. |
| Memory search returns no results | The Memory Palace is populated as agents complete missions. Run a few agent operations first, or check that ChromaDB initialized correctly in backend startup logs. |

For deployment-specific issues, refer to:
- **[Windows 11 Installation Guide](windows_installation_guide.md)**
- **[Kali Linux / WSL Deployment Guide](DeploymentGuide.md)**
- **[Production Deployment Guide](../DEPLOYMENT.md)**

---

*For deeper technical details, see the [Comprehensive User Manual](user_manual.md) and [Database Schema Documentation](DatabaseSchema.md).*
