# Swarm Suite

**Orchestration Command Center** — A full-stack platform for managing agents, missions, and real-time banter with a neon-themed dark-mode dashboard.

---

## Architecture

Swarm Suite is composed of two main services:

| Component | Technology | Port |
|-----------|-----------|------|
| Backend API | FastAPI + SQLAlchemy (async) | 8000 |
| Frontend SPA | React 18 + Recharts | 3000 |

The backend exposes a REST API with JWT authentication, WebSocket real-time events, and an analytics engine. The frontend consumes the API via Axios with automatic token refresh and displays data through a neon-themed dashboard with five primary views.

---

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- npm or pnpm

### Backend

```bash
cd backend
pip install -r requirements.txt   # or: pip install fastapi uvicorn sqlalchemy[asyncio] aiosqlite pyjwt bcrypt python-multipart
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The backend will automatically create the SQLite database and seed it with sample data on first run.

### Frontend

```bash
cd swarm-frontend
npm install
npm start
```

The frontend runs on `http://localhost:3000` and connects to the backend at `http://localhost:8000` by default. Override with the `REACT_APP_API_URL` environment variable.

---

## Demo Credentials

| Username | Password | Role |
|----------|----------|------|
| admin | Admin123! | admin |
| operator1 | Operator1! | operator |

---

## Features

### Backend
- **JWT Authentication** with access/refresh token rotation and bcrypt password hashing
- **Role-Based Access Control** (admin, operator) enforced at the API level
- **Full CRUD** for Missions, Agents, and Banter entities
- **Many-to-Many** agent-mission assignments with a junction table
- **WebSocket** real-time broadcast of all entity changes
- **Analytics Engine** with overview stats, 7-day activity trends, and system health
- **Audit Logging** for all mutations (create, update, delete)
- **CORS** configured for local development with environment-variable overrides
- **Database-Agnostic** — SQLite for development, PostgreSQL for production (swap via `DATABASE_URL`)

### Frontend
- **Swarm View** — Real-time overview with agent/mission counts and status tables
- **Mission Timeline** — Full CRUD with status filtering, priority badges, and agent assignment modals
- **Agent Control** — Card-based agent management with status filtering and mission detail views
- **Banter Panel** — Real-time chat feed with mission/agent filtering and compose functionality
- **Analytics Dashboard** — 7-day activity area chart, agent status donut, mission status/priority charts, banter type distribution, and system health gauges
- **Neon Theme** — Dark mode with cyan/green/purple glowing accents and smooth animations

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login with username/password |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Revoke refresh token |
| GET | `/api/auth/me` | Get current user profile |

### Agents
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agents` | List agents (filterable by status) |
| POST | `/api/agents` | Create agent |
| GET | `/api/agents/{id}` | Get agent by ID |
| PATCH | `/api/agents/{id}` | Update agent |
| DELETE | `/api/agents/{id}` | Delete agent (admin only) |
| GET | `/api/agents/{id}/missions` | List missions for agent |

### Missions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/missions` | List missions (filterable by status) |
| POST | `/api/missions` | Create mission |
| GET | `/api/missions/{id}` | Get mission by ID |
| PATCH | `/api/missions/{id}` | Update mission |
| DELETE | `/api/missions/{id}` | Delete mission (admin only) |
| GET | `/api/missions/{id}/agents` | List agents for mission |
| POST | `/api/missions/{id}/assign` | Assign agent to mission |
| DELETE | `/api/missions/{id}/assign/{agent_id}` | Revoke agent from mission |

### Banter
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/banter` | List banter (filterable by mission_id, agent_id) |
| POST | `/api/banter` | Create banter message |
| DELETE | `/api/banter/{id}` | Delete banter (admin only) |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/overview` | Agent/mission/banter counts and status breakdowns |
| GET | `/api/analytics/activity` | 7-day activity trends |
| GET | `/api/analytics/health` | System health metrics |

### WebSocket
| Endpoint | Description |
|----------|-------------|
| `ws://localhost:8000/ws?token=JWT` | Real-time event stream |

---

## Environment Variables

### Backend
| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite+aiosqlite:///data/swarm_suite.db` | Database connection string |
| `SECRET_KEY` | (dev default) | JWT signing key — **must override in production** |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | Access token TTL |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | Refresh token TTL |
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated allowed origins |

### Frontend
| Variable | Default | Description |
|----------|---------|-------------|
| `REACT_APP_API_URL` | `http://localhost:8000` | Backend API base URL |

---

## Deployment

### Render / Railway (Backend)
1. Set `DATABASE_URL` to a PostgreSQL connection string
2. Set `SECRET_KEY` to a strong random value (`openssl rand -hex 32`)
3. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Vercel (Frontend)
1. Set `REACT_APP_API_URL` to the deployed backend URL
2. Build command: `npm run build`
3. Output directory: `build`

### Monitoring
- **Sentry**: Add `sentry-sdk[fastapi]` to backend and `@sentry/react` to frontend
- **Datadog/NewRelic**: Standard APM agent integration with FastAPI middleware

---

## Project Structure

```
swarm-suite/
├── backend/
│   ├── app/
│   │   ├── api/          # Route handlers (auth, agents, missions, banter, analytics, ws)
│   │   ├── core/         # Config, database, security, WebSocket manager
│   │   ├── models/       # SQLAlchemy ORM models
│   │   ├── schemas/      # Pydantic validation schemas
│   │   ├── seed.py       # Sample data seeder
│   │   └── main.py       # FastAPI application entry point
│   ├── alembic/          # Database migrations
│   └── data/             # SQLite database (auto-created)
├── swarm-frontend/
│   ├── src/
│   │   ├── App.js        # Router and providers
│   │   ├── AuthContext.js # Authentication state management
│   │   ├── api.js        # Axios API client with interceptors
│   │   ├── useWebSocket.js # WebSocket hook
│   │   ├── Layout.jsx    # Dashboard layout with sidebar
│   │   ├── Login.jsx     # Login page
│   │   ├── SwarmView.jsx # Swarm overview dashboard
│   │   ├── Missions.jsx  # Mission timeline with CRUD
│   │   ├── Agents.jsx    # Agent control with CRUD
│   │   ├── Banter.jsx    # Real-time banter panel
│   │   ├── Analytics.jsx # Analytics dashboard with charts
│   │   └── neonTheme.css # Neon dark theme styles
│   └── package.json
├── docs/
│   ├── DatabaseSchema.md # Schema documentation
│   └── erd.png           # Entity relationship diagram
└── README.md
```

---

## License

MIT
