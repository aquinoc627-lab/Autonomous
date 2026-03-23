#!/bin/bash
# Autonomous — Automated Security Audit Script

set -e

echo "================================================================"
echo "Starting Autonomous Security Audit"
echo "================================================================"

# 1. Backend Dependency Audit
echo -e "\n[1/4] Auditing Backend Dependencies..."
cd backend
if command -v pip-audit &> /dev/null; then
    pip-audit -r requirements.txt
else
    echo "pip-audit not found. Skipping dependency audit."
fi

# 2. Backend Static Analysis
echo -e "\n[2/4] Running Static Analysis (Bandit)..."
if command -v bandit &> /dev/null; then
    bandit -r app/
else
    echo "bandit not found. Skipping static analysis."
fi

# 3. Frontend Dependency Audit
echo -e "\n[3/4] Auditing Frontend Dependencies..."
cd ../autonomous-frontend
npm audit --audit-level=high

# 4. Secret Scanning (Basic)
echo -e "\n[4/4] Scanning for hardcoded secrets..."
cd ..
if grep -rE "SECRET_KEY|PASSWORD|API_KEY" . --exclude-dir={.git,node_modules,build,venv} | grep -vE "example|template|config\.py"; then
    echo "WARNING: Potential hardcoded secrets found!"
else
    echo "No obvious hardcoded secrets found."
fi

echo -e "\n================================================================"
echo "Security Audit Complete"
echo "================================================================"
