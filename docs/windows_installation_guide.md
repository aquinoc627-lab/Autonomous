# Autonomous: Windows 11 Installation & Deployment Guide

This guide provides detailed instructions for setting up and deploying Autonomous on a Windows 11 environment. It covers both local development setup and Docker-based deployment, ensuring a smooth experience for users on Microsoft's latest operating system.

## 1. Prerequisites

Before proceeding with the installation, ensure your Windows 11 system meets the following requirements:

*   **Windows 11 (21H2 or later)**: Ensure your operating system is up to date.
*   **WSL 2 (Windows Subsystem for Linux 2)**: Essential for running Linux environments natively on Windows, which is required by Docker Desktop and recommended for a consistent development experience [1].
*   **Docker Desktop**: Provides the Docker Engine and Docker Compose for containerized deployment [2].
*   **Node.js (LTS version)**: Required for the React frontend development and build process [3].
*   **Python 3.11+**: Necessary for the FastAPI backend [4].
*   **Git**: For cloning Autonomous repository [5].

### 1.1. Installing WSL 2

1.  Open PowerShell or Windows Command Prompt as an administrator.
2.  Run the command: `wsl --install`
3.  Restart your computer when prompted.
4.  Open PowerShell again and set WSL 2 as your default version: `wsl --set-default-version 2`
5.  Install a Linux distribution (e.g., Ubuntu) from the Microsoft Store.

### 1.2. Installing Docker Desktop

1.  Download the Docker Desktop installer from the official Docker website [2].
2.  Run the installer and follow the on-screen instructions. Ensure that the option to enable WSL 2 integration is checked during installation.
3.  After installation, start Docker Desktop. It will automatically integrate with your WSL 2 distribution.

### 1.3. Installing Node.js

1.  Download the Node.js LTS installer from the official Node.js website [3].
2.  Run the installer and follow the default installation steps.
3.  Verify the installation by opening a new Command Prompt or PowerShell window and running: `node -v` and `npm -v`.

### 1.4. Installing Python

1.  Download the Python 3.11+ installer from the official Python website [4].
2.  Run the installer. **Crucially, ensure you check the box that says "Add Python to PATH" during installation.**
3.  Verify the installation: `python --version` and `pip --version`.

### 1.5. Installing Git

1.  Download the Git installer from the official Git website [5].
2.  Run the installer and accept the default options.
3.  Verify the installation: `git --version`.

## 2. Repository Setup

1.  Open a Command Prompt or PowerShell window.
2.  Navigate to your desired development directory.
3.  Clone Autonomous repository:
    ```bash
    git clone https://github.com/aquinoc627-lab/autonomous.git
    cd autonomous
    ```

## 3. Local Development Setup (Without Docker)

This method allows you to run the backend and frontend services independently for development purposes.

### 3.1. Backend (FastAPI)

1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Create a Python virtual environment and activate it:
    ```bash
    python -m venv venv
    .\venv\Scripts\activate
    ```
3.  Install backend dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4.  Set environment variables. Create a `.env` file in the `backend` directory with the following (replace with your actual keys):
    ```ini
    DATABASE_URL="sqlite+aiosqlite:///./data/Autonomous.db"
    SECRET_KEY="your_super_secret_key_for_jwt"
    ALGORITHM="HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES=30
    REFRESH_TOKEN_EXPIRE_DAYS=7
    CORS_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"
    AUTH_MODE="jwt" # or "oauth"
    GEMINI_API_KEY="your_gemini_api_key"
    GITHUB_TOKEN="your_github_personal_access_token"
    ```
5.  Run database migrations and seed initial data:
    ```bash
    alembic upgrade head
    python app/seed.py
    ```
6.  Start the FastAPI backend server:
    ```bash
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    ```
    The backend will be accessible at `http://localhost:8000`.

### 3.2. Frontend (React)

1.  Open a **new** Command Prompt or PowerShell window.
2.  Navigate to the frontend directory:
    ```bash
    cd autonomous\hive-frontend
    ```
3.  Install frontend dependencies:
    ```bash
    npm install
    ```
4.  Set environment variables. Create a `.env` file in the `hive-frontend` directory with the following:
    ```ini
    REACT_APP_API_URL=http://localhost:8000
    ```
5.  Start the React development server:
    ```bash
    npm start
    ```
    The frontend will open in your browser at `http://localhost:3000`.

## 4. Docker-based Deployment (Recommended)

This method uses Docker Compose to run the entire Autonomous stack (FastAPI backend, React frontend via Nginx, and PostgreSQL database) in isolated containers.

1.  Ensure Docker Desktop is running.
2.  Navigate to the root of the `autonomous` repository:
    ```bash
    cd autonomous
    ```
3.  Create a `.env` file in the root directory (or copy `.env.example`) with the following (replace placeholders):
    ```ini
    POSTGRES_USER=Autonomoususer
    POSTGRES_PASSWORD=Autonomouspassword
    POSTGRES_DB=Autonomousdb
    DATABASE_URL=postgresql+asyncpg://Autonomoususer:Autonomouspassword@db:5432/Autonomousdb
    SECRET_KEY="your_super_secret_key_for_jwt"
    ALGORITHM="HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES=30
    REFRESH_TOKEN_EXPIRE_DAYS=7
    CORS_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"
    AUTH_MODE="jwt"
    GEMINI_API_KEY="your_gemini_api_key"
    GITHUB_TOKEN="your_github_personal_access_token"
    ```
4.  Build and start the Docker containers:
    ```bash
    docker-compose up -d --build
    ```
    This command will:
    *   Build the backend and frontend Docker images.
    *   Create and start a PostgreSQL database container.
    *   Run database migrations and seed data in the backend container.
    *   Start the FastAPI backend and Nginx-served React frontend.

5.  Access Autonomous:
    *   Frontend: `http://localhost:3000`
    *   Backend API: `http://localhost:8000`

6.  To stop the services:
    ```bash
    docker-compose down
    ```

## 5. Troubleshooting

*   **Port Conflicts**: If you encounter `Address already in use` errors, ensure no other applications are using ports 3000 or 8000. You can change the ports in `docker-compose.yml` or the local run commands.
*   **WSL 2 Issues**: If Docker Desktop or WSL 2 isn't working correctly, try restarting your computer or running `wsl --shutdown` in PowerShell and then restarting Docker Desktop.
*   **Python/Node.js PATH**: If commands like `python` or `npm` are not recognized, double-check your system's PATH environment variables.
*   **Docker Build Failures**: Ensure you have enough system resources (RAM, CPU) allocated to Docker Desktop, especially during the build process.

---

## References

[1] Microsoft Docs: Install WSL | [https://learn.microsoft.com/en-us/windows/wsl/install](https://learn.microsoft.com/en-us/windows/wsl/install)
[2] Docker: Docker Desktop | [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/)
[3] Node.js: Download Node.js | [https://nodejs.org/en/download](https://nodejs.org/en/download)
[4] Python: Download Python | [https://www.python.org/downloads/](https://www.python.org/downloads/)
[5] Git: Download Git | [https://git-scm.com/downloads](https://git-scm.com/downloads)
