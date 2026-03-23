# Autonomous — Production Deployment Guide

This guide provides instructions for deploying Autonomous in a production environment using Docker and Nginx.

## 1. Prerequisites
- Docker and Docker Compose installed on the target server.
- A domain name pointing to the server's IP address.
- SSL/TLS certificates (e.g., from Let's Encrypt).

## 2. Environment Configuration
Create a `.env` file in the root directory (or copy `.env.example` and edit it):

```env
# Backend Configuration
SECRET_KEY=your-production-secret-key-here
CORS_ORIGINS=https://your-domain.com
DATABASE_URL=postgresql+asyncpg://Autonomous_user:Autonomous_password@db:5432/Autonomous_db
GEMINI_API_KEY=your-gemini-api-key-here

# Frontend Configuration
REACT_APP_API_URL=https://api.your-domain.com

# Database Configuration
POSTGRES_USER=Autonomous_user
POSTGRES_PASSWORD=Autonomous_password
POSTGRES_DB=Autonomous_db
```

## 3. Deployment Steps
1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/aquinoc627-lab/autonomous.git
    cd autonomous
    ```

2.  **Build and Start the Containers**:
    ```bash
    docker-compose up -d --build
    ```

3.  **Verify the Deployment**:
    - Frontend: `https://your-domain.com`
    - Backend API: `https://api.your-domain.com/api/health`

## 4. Security Hardening
- **SSL/TLS**: Use a reverse proxy like Nginx or Traefik to handle SSL termination.
- **Firewall**: Restrict access to ports 8000 and 5432, only allowing traffic from the frontend container and trusted sources.
- **Database Backups**: Set up a cron job to perform regular PostgreSQL backups.
- **Tool Arsenal Execution**: The Tool Arsenal engine includes built-in command sanitization and confirmation gates for dangerous tools (e.g., Metasploit, Cobalt Strike). Ensure that only trusted users are granted the `admin` role, as this role is required to bypass confirmation gates.

## 5. Monitoring & Logs
- View logs for all services: `docker-compose logs -f`
- Backend logs: `docker-compose logs -f backend`
- Frontend logs: `docker-compose logs -f frontend`
