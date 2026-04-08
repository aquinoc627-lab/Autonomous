# Autonomous

**Autonomous Orchestration Command Center** — A full-stack platform for managing and coordinating intelligent agents, executing complex missions, and fostering real-time collaboration with a neon-themed, responsive dashboard.

---

## Overview

Autonomous is an advanced, AI-powered platform designed to empower autonomous agents with capabilities ranging from real-world tool use and collaborative intelligence to long-term memory and secure code execution. It features a dynamic 3D Agent Lab for creating custom agent personas, a voice-controlled interface for seamless interaction, integrated OSINT and cybersecurity tooling, operational playbooks, a live terminal, and a knowledge graph for visualizing agent intelligence.

## Key Features

### Core Functionality
*   **Neon-Themed Dashboard**: A visually stunning, responsive UI with dark mode and glowing accents, optimized for both desktop and mobile.
*   **Agent & Mission Management**: Full CRUD operations for agents and missions, including hierarchical tasking and agent-to-mission assignments.
*   **Real-time Banter**: A live communication feed for users and agents, with filtering and persona-driven speech synthesis.
*   **Analytics & Monitoring**: Comprehensive dashboards for tracking Autonomous activity, system health, and agent performance.
*   **Playbooks**: Create, manage, and execute repeatable operational playbooks that orchestrate sequences of agent actions.
*   **OSINT Module**: Integrated open-source intelligence gathering tools for reconnaissance and target profiling.
*   **API Key Management**: Generate and manage API keys for programmatic access to the platform.
*   **Billing & Subscription Management**: Track usage and manage subscription tiers from the dashboard.

### Advanced AI & Autonomy
*   **Agent Brain (Gemini-Powered)**: Autonomous reasoning, decision-making, and persona-driven actions for all agents, with a configurable background loop that can be toggled on or off.
*   **Tool Arsenal & Execution Engine**: A curated catalog of 44+ cybersecurity tools (Nmap, Metasploit, etc.) with OS-aware command generation and security confirmation gates. Agents can be assigned these tools to execute complex missions.
*   **Voice Interaction**: Control the dashboard with voice commands and hear agents respond in their unique, persona-matched voices.
*   **Autonomous Intelligence**: Agents collaborate on complex missions, delegate sub-tasks, and communicate with each other to achieve collective goals.
*   **Memory Palace (Long-Term Vector Memory)**: Agents possess persistent, semantic recall of past experiences via ChromaDB, enabling cross-mission learning and smarter decision-making.
*   **Autonomous Coding (DevOps Agent)**: Agents can execute code in a secure sandbox, interact with GitHub repositories, and propose code changes.
*   **Knowledge Graph**: Visual graph of agent knowledge, relationships, and mission context for situational awareness.
*   **Live Terminal**: Real-time terminal interface for executing and monitoring agent commands directly within the dashboard.

### Visual & Interactive
*   **3D Agent Lab**: A dedicated interface for creating and customizing agents with real-time 3D animated human-like holograms, dynamic animations, and unique visual attributes.
*   **Global Command Palette (Omnibar)**: Press `Ctrl+K` (or `Cmd+K` on Mac) anywhere in the dashboard to open the command palette for instant navigation and actions.

### Security & Deployment
*   **Production Hardening**: Dockerized deployment, security middleware (rate limiting, security headers, CORS), and automated security scanning for a robust and secure platform.
*   **Authentication**: JWT-based authentication with refresh token rotation and role-based access control (RBAC), easily swappable to OAuth providers like Auth0 or Okta.
*   **Audit Logging**: Immutable audit trail of all security-relevant actions and data mutations.
*   **Ghost Protocol**: Isolated lab environments managed via Docker for advanced agent operations.

---

## Quick Start

For detailed installation and deployment instructions, please refer to the dedicated guides:

*   **[Windows 11 Installation & Deployment Guide](docs/windows_installation_guide.md)**
*   **[Kali Linux / WSL Deployment Guide](docs/DeploymentGuide.md)**
*   **[General Production Deployment Guide](DEPLOYMENT.md)**

### Docker Compose (Recommended)

Ensure you have Docker Desktop installed and running. Copy the example environment file, fill in your values, then start the stack:

```bash
cp .env.example .env
# Edit .env and set SECRET_KEY, GEMINI_API_KEY, and optionally GITHUB_TOKEN
docker-compose up -d --build
```

This will build and start the entire Autonomous stack (PostgreSQL, FastAPI backend, and React frontend via Nginx). Access the frontend at `http://localhost:3000`.

### Local Development (Without Docker)

1.  **Backend (FastAPI)**:
    ```bash
    cd backend
    python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
    pip install -r requirements.txt
    # Create backend/.env with DATABASE_URL, SECRET_KEY, GEMINI_API_KEY, etc.
    alembic upgrade head
    export SEED_OWNER_EMAIL="your-email@example.com"
    export SEED_OWNER_PASSWORD="YourStrongPassword1"
    python app/seed.py
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    ```

2.  **Frontend (React)**:
    ```bash
    cd autonomous-frontend
    npm install
    # Create autonomous-frontend/.env with REACT_APP_API_URL=http://localhost:8000
    npm start
    ```

### Account Access

Users authenticate with their own email address and password. Create user accounts through the registration flow or the `/api/auth/register` endpoint.

---

## Documentation

*   **[User Guide](docs/UserGuide.md)**
*   **[Comprehensive User Manual](docs/user_manual.md)**
*   **[Deployment Guide (Kali/WSL)](docs/DeploymentGuide.md)**
*   **[Windows 11 Installation Guide](docs/windows_installation_guide.md)**
*   **[Database Schema Documentation](docs/DatabaseSchema.md)**
*   **[Entity Relationship Diagram (ERD)](docs/erd.png)**

---

## Project Structure

```
Autonomous/
├── backend/                        # FastAPI backend services
│   ├── app/                        # Core application logic
│   │   ├── api/                    # REST API endpoints
│   │   │   ├── agents.py           # Agent CRUD & brain trigger
│   │   │   ├── analytics.py        # Analytics & metrics
│   │   │   ├── api_keys.py         # API key management
│   │   │   ├── auth.py             # JWT / OAuth authentication
│   │   │   ├── banter.py           # Real-time messaging
│   │   │   ├── billing.py          # Subscription & billing
│   │   │   ├── ghost.py            # Ghost Protocol lab management
│   │   │   ├── labs.py             # Agent lab operations
│   │   │   ├── missions.py         # Mission CRUD & assignment
│   │   │   ├── osint.py            # OSINT intelligence gathering
│   │   │   ├── playbooks.py        # Operational playbooks
│   │   │   ├── system_override.py  # System-level controls
│   │   │   ├── tools.py            # Tool Arsenal catalog
│   │   │   └── ws.py               # WebSocket manager
│   │   ├── core/                   # Config, DB, security, AI, tools, memory
│   │   │   ├── brain.py            # Gemini-powered agent reasoning
│   │   │   ├── command_engine.py   # OS-aware command generation
│   │   │   ├── memory.py           # ChromaDB vector memory
│   │   │   ├── sandbox.py          # Secure code execution
│   │   │   ├── tool_registry.py    # Tool catalog registry (44+ tools)
│   │   │   └── websocket_manager.py# Real-time WebSocket hub
│   │   ├── models/                 # SQLAlchemy ORM models
│   │   ├── schemas/                # Pydantic validation schemas
│   │   ├── seed.py                 # Sample data seeder
│   │   └── main.py                 # FastAPI application entry point
│   ├── alembic/                    # Database migrations
│   ├── data/                       # SQLite database (dev) & ChromaDB (vector store)
│   └── tests/                      # Pytest unit and integration tests
├── autonomous-frontend/            # React frontend application
│   ├── public/                     # Static assets
│   └── src/                        # React components, hooks, contexts
│       ├── AgentLab.jsx            # 3D Agent Creator UI
│       ├── Agents.jsx              # Agent management page
│       ├── Analytics.jsx           # Analytics dashboard
│       ├── ApiKeys.jsx             # API key management UI
│       ├── Banter.jsx              # Real-time banter feed
│       ├── Billing.jsx             # Billing & subscription UI
│       ├── GenerativeDashboard.jsx # Generative/adaptive dashboard
│       ├── GlobalOmnibar.jsx       # Global command palette (Ctrl+K)
│       ├── Hologram3D.jsx          # Three.js 3D agent hologram
│       ├── KillSwitch.jsx          # Emergency kill switch control
│       ├── KnowledgeGraph.jsx      # Knowledge graph visualizer
│       ├── LiveTerminal.jsx        # Live terminal output
│       ├── MemorySearch.jsx        # Memory Palace search UI
│       ├── Missions.jsx            # Mission management page
│       ├── Osint.jsx               # OSINT tools UI
│       ├── Playbooks.jsx           # Playbook management
│       ├── Terminal.jsx            # Interactive terminal page
│       ├── ToolArsenal.jsx         # Cybersecurity tool catalog
│       ├── VoiceControl.jsx        # Voice command widget
│       └── neonTheme.css           # Global neon dark theme styles
├── docs/                           # Project documentation
│   ├── DatabaseSchema.md           # Database schema reference
│   ├── DeploymentGuide.md          # Kali Linux / WSL deployment guide
│   ├── UserGuide.md                # Platform user guide
│   ├── user_manual.md              # Comprehensive user manual
│   ├── windows_installation_guide.md # Windows 11 installation guide
│   └── erd.png                     # Entity Relationship Diagram
├── logos/                          # Brand logo assets
├── scripts/                        # Utility scripts (e.g., security_audit.sh)
├── .env.example                    # Environment variable template
├── docker-compose.yml              # Docker Compose configuration
├── Dockerfile                      # Root Dockerfile
├── DEPLOYMENT.md                   # Production deployment guide
└── README.md                       # This file
```

---

## Environment Variables

All configuration is done via environment variables. Copy `.env.example` to `.env` and set the following:

| Variable | Required | Description |
|----------|----------|-------------|
| `SECRET_KEY` | ✅ | JWT signing secret. Generate with `python3 -c "import secrets; print(secrets.token_hex(32))"` |
| `DATABASE_URL` | ✅ | Database connection string. SQLite for dev, PostgreSQL for production |
| `GEMINI_API_KEY` | ✅ | Google Gemini API key for Agent Brain and Memory Palace |
| `GITHUB_TOKEN` | Optional | GitHub Personal Access Token for DevOps agent features |
| `CORS_ORIGINS` | ✅ | Comma-separated list of allowed frontend origins |
| `AUTH_MODE` | ✅ | `jwt` (default) or `oauth` |
| `REACT_APP_API_URL` | ✅ | Backend API URL used by the React frontend |

---

## License

MIT
