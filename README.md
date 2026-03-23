# Autonomous

**Autonomous Orchestration Command Center** — A full-stack platform for managing and coordinating intelligent agents, executing complex missions, and fostering real-time collaboration with a neon-themed, responsive dashboard.

---

## Overview

The Autonomous is an advanced, AI-powered platform designed to empower autonomous agents with capabilities ranging from real-world tool use and collaborative intelligence to long-term memory and secure code execution. It features a dynamic 3D Agent Lab for creating custom agent personas and a voice-controlled interface for seamless interaction.

## Key Features

### Core Functionality
*   **Neon-Themed Dashboard**: A visually stunning, responsive UI with dark mode and glowing accents, optimized for both desktop and mobile.
*   **Agent & Mission Management**: Full CRUD operations for agents and missions, including hierarchical tasking and agent-to-mission assignments.
*   **Real-time Banter**: A live communication feed for users and agents, with filtering and persona-driven speech synthesis.
*   **Analytics & Monitoring**: Comprehensive dashboards for tracking Autonomous activity, system health, and agent performance.

### Advanced AI & Autonomy
*   **Agent Brain (Gemini-Powered)**: Autonomous reasoning, decision-making, and persona-driven actions for all agents.
*   **Tool Arsenal & Execution Engine**: A curated catalog of 44+ cybersecurity tools (Nmap, Metasploit, etc.) with OS-aware command generation and security confirmation gates. Agents can be assigned these tools to execute complex missions.
*   **Voice Interaction**: Control the dashboard with voice commands and hear agents respond in their unique, persona-matched voices.
*   **Autonomous Intelligence**: Agents collaborate on complex missions, delegate sub-tasks, and communicate with each other to achieve collective goals.
*   **Memory Palace (Long-Term Vector Memory)**: Agents possess persistent, semantic recall of past experiences, enabling cross-mission learning and smarter decision-making.
*   **Autonomous Coding (DevOps Agent)**: Agents can execute code in a secure sandbox, interact with GitHub repositories, and propose code changes.

### Visual & Interactive
*   **3D Agent Lab**: A dedicated interface for creating and customizing agents with real-time 3D animated human-like holograms, dynamic animations, and unique visual attributes.

### Security & Deployment
*   **Production Hardening**: Dockerized deployment, security middleware (rate limiting, headers), and automated security scanning for a robust and secure platform.
*   **Authentication**: JWT-based authentication with role-based access control, easily swappable to OAuth providers like Auth0 or Okta.

---

## Quick Start

For detailed installation and deployment instructions, please refer to the dedicated guides:

*   **[Windows 11 Installation & Deployment Guide](docs/windows_installation_guide.md)**
*   **[General Deployment Guide](DEPLOYMENT.md)**

### Docker Compose (Recommended)

Ensure you have Docker Desktop installed and running. Then, from the root of the repository:

```bash
docker-compose up -d --build
```

This will build and start the entire Autonomous stack (PostgreSQL, FastAPI backend, and React frontend via Nginx). Access the frontend at `http://localhost:3000`.

### Local Development (Without Docker)

1.  **Backend (FastAPI)**: Navigate to the `backend/` directory, install `requirements.txt`, set environment variables (including `GEMINI_API_KEY` and `GITHUB_TOKEN`), run migrations (`alembic upgrade head`), seed data (`python app/seed.py`), and start with `uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`.
2.  **Frontend (React)**: Navigate to the `hive-frontend/` directory, install dependencies (`npm install`), set `REACT_APP_API_URL=http://localhost:8000` in a `.env` file, and start with `npm start`.

### Demo Credentials

| Username | Password | Role |
|----------|----------|------|
| `admin` | `Admin123!` | `admin` |
| `operator1` | `Operator1!` | `operator` |

---

## Documentation

*   **[Comprehensive User Manual](docs/user_manual.md)**
*   **[Database Schema Documentation](docs/DatabaseSchema.md)**
*   **[Entity Relationship Diagram (ERD)](docs/erd.png)**

---

## Project Structure

```
Autonomous/
├── backend/                  # FastAPI backend services
│   ├── app/                  # Core application logic
│   │   ├── api/              # REST API endpoints
│   │   ├── core/             # Config, DB, security, AI Brain, Tools, Memory
│   │   ├── models/           # SQLAlchemy ORM models
│   │   ├── schemas/          # Pydantic validation schemas
│   │   ├── seed.py           # Sample data seeder
│   │   └── main.py           # FastAPI application entry point
│   ├── alembic/              # Database migrations
│   ├── data/                 # SQLite database (dev) and ChromaDB (vector store)
│   └── tests/                # Pytest unit and integration tests
├── hive-frontend/              # React frontend application
│   ├── public/               # Static assets
│   ├── src/                  # React components, hooks, contexts
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Main dashboard pages
│   │   ├── AgentLab.jsx      # 3D Agent Creator UI
│   │   ├── Hologram3D.jsx    # Three.js 3D Agent Hologram component
│   │   ├── MemorySearch.jsx  # Memory Palace search UI
│   │   ├── ToolArsenal.jsx   # Cybersecurity Tool Catalog UI
│   │   ├── VoiceControl.jsx  # Voice command widget
│   │   └── neonTheme.css     # Global neon dark theme styles
│   └── package.json
├── docs/                     # Project documentation
│   ├── DatabaseSchema.md
│   ├── erd.png
│   ├── user_manual.md
│   └── windows_installation_guide.md
├── logos/                    # Brand logo assets
├── scripts/                  # Utility scripts (e.g., security_audit.sh)
├── .env.example              # Environment variable template
├── docker-compose.yml        # Docker Compose configuration
├── DEPLOYMENT.md             # General deployment guide
└── README.md                 # This file
```

---

## License

MIT
