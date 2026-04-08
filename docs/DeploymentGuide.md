# Autonomous Platform Deployment Guide (Kali Linux / WSL)

This guide covers deploying Autonomous on **Kali Linux** — either as a native installation or via **Windows Subsystem for Linux (WSL 2)** on Windows 11. For Docker-based production deployment, see [DEPLOYMENT.md](../DEPLOYMENT.md). For Windows 11 local development, see [windows_installation_guide.md](windows_installation_guide.md).

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Option A — Kali Linux WSL 2 (Windows 11)](#2-option-a--kali-linux-wsl-2-windows-11)
3. [Option B — Native Kali Linux Installation](#3-option-b--native-kali-linux-installation)
4. [Clone and Configure Autonomous](#4-clone-and-configure-autonomous)
5. [Backend Setup](#5-backend-setup)
6. [Frontend Setup](#6-frontend-setup)
7. [Docker Compose (Alternative)](#7-docker-compose-alternative)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Prerequisites

### Software
| Dependency | Minimum Version | Install Command |
|-----------|----------------|-----------------|
| Python | 3.11+ | `sudo apt install python3 python3-pip python3-venv` |
| Node.js | 18 LTS+ | `sudo apt install nodejs npm` |
| Git | 2.x+ | `sudo apt install git` |
| Docker (optional) | 24.x | See [Docker Kali Install](https://docs.docker.com/engine/install/debian/) |

### Penetration Testing Tools (for Tool Arsenal)
The following tools unlock the full Tool Arsenal catalog:
```bash
sudo apt install -y nmap masscan sqlmap hydra john aircrack-ng wireshark tcpdump netcat-openbsd
```

### API Keys
- **Google Gemini API key** — Required for the Agent Brain and Memory Palace. Obtain at [aistudio.google.com](https://aistudio.google.com/app/apikey).
- **GitHub Personal Access Token** — Optional, for DevOps agent features. Create at [github.com/settings/tokens](https://github.com/settings/tokens).

---

## 2. Option A — Kali Linux WSL 2 (Windows 11)

### 2.1 Enable Hardware Virtualization in BIOS

1. Restart your machine and enter BIOS setup (commonly **F2**, **F10**, or **Del** during POST).
2. Navigate to **Advanced → System Options** (HP) or equivalent on your hardware.
3. Enable **Virtualization Technology (VTx/AMD-V)**.
4. Save and exit (**F10** on HP, or follow your BIOS prompts).

### 2.2 Install WSL 2 and Kali Linux

Open **PowerShell as Administrator** and run:

```powershell
wsl --install --distribution kali-linux
```

Restart your computer when prompted. After rebooting, the Kali Linux setup will complete automatically — create a UNIX username and password when prompted.

> **Note**: When typing your password, no characters appear on screen. This is normal Linux security behavior.

### 2.3 Update Kali and Install Dependencies

Open the **Kali Linux** app and run:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3 python3-pip python3-venv nodejs npm git curl build-essential
```

> **Important**: Always work inside the Kali filesystem (e.g., `~/autonomous`), **not** on the mounted Windows drive (`/mnt/c/...`). The NTFS mount is significantly slower and can cause `node_modules` permission errors.

### 2.4 Access the Dashboard from Windows

After starting both servers (see Sections 5 and 6), open your Windows browser and navigate to:
```
http://localhost:3000
```

WSL 2 automatically forwards `localhost` ports from Kali to Windows.

---

## 3. Option B — Native Kali Linux Installation

On a native Kali Linux system, install dependencies directly:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3 python3-pip python3-venv nodejs npm git curl build-essential
```

Then proceed to [Section 4](#4-clone-and-configure-autonomous).

---

## 4. Clone and Configure Autonomous

```bash
# Clone the repository
git clone https://github.com/aquinoc627-lab/autonomous.git
cd autonomous

# Copy the environment template
cp .env.example .env
```

Edit `.env` with your values:

```bash
nano .env
```

At minimum, set:
- `SECRET_KEY` — generate with `python3 -c "import secrets; print(secrets.token_hex(32))"`
- `GEMINI_API_KEY` — your Google Gemini API key
- `GITHUB_TOKEN` — (optional) your GitHub Personal Access Token

Save and exit (`Ctrl+O`, Enter, `Ctrl+X` in nano).

---

## 5. Backend Setup

```bash
cd ~/autonomous/backend

# Create and activate a virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Seed initial data (requires SEED_OWNER_EMAIL and SEED_OWNER_PASSWORD)
export SEED_OWNER_EMAIL="your-email@example.com"
export SEED_OWNER_PASSWORD="YourStrongPassword1"
python3 app/seed.py

# Start the backend server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

> Without `--reload`, omit that flag for a production-like run. The backend is accessible at `http://localhost:8000`.

**Verify the backend is running:**
```bash
curl http://localhost:8000/api/health
# Expected: {"status":"ok"}
```

---

## 6. Frontend Setup

Open a new terminal tab (or split terminal):

```bash
cd ~/autonomous/autonomous-frontend

# Install Node.js dependencies
npm install

# Create the frontend environment file
echo "REACT_APP_API_URL=http://localhost:8000" > .env

# Start the development server
npm start
```

The React app will open automatically at `http://localhost:3000`.

Users authenticate with their own email and password. Create user accounts via the registration flow or `/api/auth/register`.

---

## 7. Docker Compose (Alternative)

If Docker is installed on your Kali system, you can use Docker Compose for a fully containerized deployment:

```bash
# Install Docker on Kali Linux
sudo apt install -y docker.io docker-compose
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
# Log out and back in for group changes to take effect

# From the repository root
docker-compose up -d --build
```

Access the platform at `http://localhost:3000`. For production Docker deployment details, see [DEPLOYMENT.md](../DEPLOYMENT.md).

---

## 8. Troubleshooting

| Problem | Solution |
|---------|----------|
| `wsl --install` fails with "Virtual Machine Platform not enabled" | Enable Virtualization Technology in BIOS (Section 2.1). Also check **Turn Windows features on or off** → enable **Virtual Machine Platform** and **Windows Subsystem for Linux**. |
| `npm install` fails with permission errors | Ensure you are working inside the Kali filesystem, not on `/mnt/c/...`. Run `npm cache clean --force` and retry. |
| `pip install` fails with "externally managed environment" | Use `pip install -r requirements.txt --break-system-packages` **or** use a virtual environment (recommended). |
| `alembic upgrade head` fails | Ensure `DATABASE_URL` is set in `backend/.env`. For SQLite, the `data/` directory must be writable: `mkdir -p backend/data`. |
| Port 3000 or 8000 already in use | Find and kill the conflicting process: `lsof -i :3000` then `kill <PID>`. Alternatively, change the port in `package.json` or the `uvicorn` command. |
| Cannot reach `localhost:3000` from Windows browser (WSL 2) | Run `ip addr show eth0` in Kali to get the WSL IP if localhost forwarding isn't working, and navigate to that IP instead. Alternatively, run `wsl --shutdown` and restart WSL. |
| Gemini API errors in backend logs | Verify `GEMINI_API_KEY` is set and valid. Check your API quota at [aistudio.google.com](https://aistudio.google.com). |
| Database not seeded / no agents visible | Ensure `SEED_OWNER_EMAIL` and `SEED_OWNER_PASSWORD` are set, then re-run `python3 app/seed.py` from the `backend/` directory with the virtual environment activated. |

---

*For a detailed guide tailored to HP EliteBook hardware and WSL 2, see [kali_wsl_installation_guide.md](kali_wsl_installation_guide.md).*
