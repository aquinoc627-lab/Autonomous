# Autonomous — Kali Linux WSL 2 Installation Guide
**Tailored for HP EliteBook 840 G10 (Windows 11)**

This guide provides step-by-step instructions for deploying **Autonomous** on an HP EliteBook 840 G10 using Kali Linux via Windows Subsystem for Linux (WSL 2). This is the **recommended deployment method** as it provides native execution for all 44 penetration testing tools in the Tool Arsenal while maintaining the convenience of your Windows 11 host environment.

---

## Phase 1: Enable Hardware Virtualization (BIOS)

Before installing WSL 2, you must ensure hardware virtualization is enabled in your HP EliteBook's BIOS.

1. Turn on or restart your HP EliteBook.
2. Immediately and repeatedly press the **F10** key to enter the BIOS Setup Utility.
3. Use the arrow keys to navigate to the **Advanced** tab.
4. Select **System Options** and press Enter.
5. Locate the **Virtualization Technology (VTx)** checkbox and ensure it is **checked** (Enabled).
6. Press **F10** to save your changes and exit the BIOS. The laptop will reboot into Windows 11.

---

## Phase 2: Install WSL 2 and Kali Linux

Windows 11 makes installing WSL 2 incredibly straightforward.

1. Right-click the Windows Start button and select **Terminal (Admin)** or **Windows PowerShell (Admin)**.
2. Run the following command to install WSL 2 and Kali Linux simultaneously:
   ```powershell
   wsl --install --distribution kali-linux
   ```
3. Wait for the installation to complete. Windows will download the WSL kernel and the Kali Linux distribution.
4. **Restart your computer** when prompted.
5. After rebooting, a terminal window will automatically open to finalize the Kali installation. You will be prompted to create a UNIX username and password.
   * *Note: When typing your password, no characters will appear on screen. This is normal Linux security behavior.*

---

## Phase 3: Prepare the Kali Environment

Now that Kali is installed, we need to update the package repositories and install the necessary dependencies for Autonomous.

1. Open the **Kali Linux** app from your Windows Start menu.
2. Update the system packages:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```
3. Install the required system dependencies (Python, Node.js, and essential build tools):
   ```bash
   sudo apt install -y python3 python3-pip python3-venv nodejs npm git curl build-essential
   ```
4. Install common penetration testing tools used by Autonomous's Tool Arsenal:
   ```bash
   sudo apt install -y nmap masscan sqlmap hydra john aircrack-ng wireshark tcpdump
   ```

---

## Phase 4: Clone and Configure Autonomous

With the environment ready, you can now deploy the platform.

1. Clone the repository into your Kali home directory:
   ```bash
   git clone https://github.com/aquinoc627-lab/autonomous.git
   cd autonomous
   ```
2. Copy the environment template:
   ```bash
   cp .env.example .env
   ```
3. Edit the `.env` file to add your API keys. You can use the `nano` text editor:
   ```bash
   nano .env
   ```
   *Add your `GEMINI_API_KEY` and save the file (Press `Ctrl+O`, `Enter`, then `Ctrl+X`).*

---

## Phase 5: Launch the Platform

Autonomous runs as two separate processes: the FastAPI backend and the React frontend.

### Start the Backend
1. Navigate to the backend directory:
   ```bash
   cd ~/autonomous/backend
   ```
2. Install Python dependencies:
   ```bash
   pip3 install -r requirements.txt --break-system-packages
   ```
   *(Note: `--break-system-packages` is required in newer Debian/Kali versions when installing globally, or you can use a virtual environment).*
3. Seed the database with initial data:
   ```bash
   python3 -m app.seed
   ```
4. Start the backend server in the background:
   ```bash
   python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 &
   ```

### Start the Frontend
1. Open a **new** Kali terminal tab (or run in the same terminal).
2. Navigate to the frontend directory:
   ```bash
   cd ~/autonomous/hive-frontend
   ```
3. Install Node dependencies:
   ```bash
   npm install
   ```
4. Start the React development server:
   ```bash
   npm start
   ```

### Access the Dashboard
Open your Windows web browser (Edge, Chrome, or Firefox) and navigate to:
**http://localhost:3000**

Log in using the default administrator credentials:
- **Username:** `admin`
- **Password:** `Admin123!`

---

## Troubleshooting on HP EliteBook

- **"Virtual Machine Platform is not enabled" Error:** If you receive this error when running `wsl --install`, double-check that you saved the BIOS settings in Phase 1. You can also manually enable it in Windows by searching for "Turn Windows features on or off" and checking "Virtual Machine Platform".
- **Port Conflicts:** If port 8000 or 3000 is already in use by another Windows application, the servers will fail to start. You can change the ports in the `.env` file and `package.json`.
- **File Permissions:** Always clone the repository *inside* the Kali filesystem (e.g., `~/autonomous`), **not** on the mounted Windows drive (`/mnt/c/Users/...`). Running Linux databases and node_modules on the NTFS mount is significantly slower and can cause permission errors.
