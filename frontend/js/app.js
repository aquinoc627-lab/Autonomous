const API_BASE_URL = 'http://localhost:8000/api';

const statusBadge = document.getElementById('api-status');
const consoleOutput = document.getElementById('console');
const navLinks = document.querySelectorAll('.nav-links li');

// DOM Elements
const dashboardPanel = document.getElementById('content-area');
const osintPanel = document.getElementById('osint-panel');
const breachPanel = document.getElementById('breach-panel');

const runSherlockBtn = document.getElementById('run-sherlock-btn');
const targetUsername = document.getElementById('target-username');
const osintResults = document.getElementById('osint-results');

const runBreachBtn = document.getElementById('run-breach-btn');
const targetEmail = document.getElementById('target-email');
const hibpApiKey = document.getElementById('hibp-api-key');
const breachResults = document.getElementById('breach-results');

function logToConsole(message) {
    const timestamp = new Date().toLocaleTimeString();
    consoleOutput.innerHTML += `<br>[${timestamp}] ${message}`;
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

async function checkBackendStatus() {
    try {
        logToConsole("Pinging API backend...");
        const response = await fetch(`${API_BASE_URL}/status`);
        const data = await response.json();
        
        if (data.status === 'online') {
            statusBadge.textContent = 'API Online';
            statusBadge.className = 'status-badge online';
            logToConsole(`Connection successful. ${data.message}`);
        }
    } catch (error) {
        statusBadge.textContent = 'API Offline';
        statusBadge.className = 'status-badge offline';
        logToConsole(`<span style="color: #ff003c;">Error connecting to API. Is FastAPI running on port 8000?</span>`);
    }
}

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        navLinks.forEach(l => l.classList.remove('active'));
        e.target.classList.add('active');
        
        const moduleName = e.target.getAttribute('data-target');
        document.querySelector('h1').textContent = e.target.textContent;
        logToConsole(`Switching to module: ${moduleName.toUpperCase()}...`);
        
        // Hide all panels
        dashboardPanel.style.display = 'none';
        osintPanel.style.display = 'none';
        breachPanel.style.display = 'none';
        
        // Show selected panel
        if (moduleName === 'dashboard') dashboardPanel.style.display = 'block';
        if (moduleName === 'osint') osintPanel.style.display = 'block';
        if (moduleName === 'breach') breachPanel.style.display = 'block';
    });
});

// Sherlock Execution Logic
if(runSherlockBtn) {
    runSherlockBtn.addEventListener('click', async () => {
        const username = targetUsername.value.trim();
        if (!username) return alert('Please enter a username');
        
        logToConsole(`Initiating Sherlock swarm against target: ${username}... This may take a minute.`);
        osintResults.innerHTML = `<p style="color: #00f0ff;">Running deep web scan for ${username}...</p>`;
        
        try {
            const response = await fetch(`${API_BASE_URL}/osint/sherlock/${username}`);
            const data = await response.json();
            
            if (data.status === 'success') {
                logToConsole(`Scan complete. Found ${data.accounts_found} accounts for ${username}.`);
                
                let html = `<h4 style="margin-bottom: 10px; color: #00ff66;">Found ${data.accounts_found} Accounts</h4>`;
                html += `<table style="width: 100%; border-collapse: collapse; text-align: left;">
                            <tr style="border-bottom: 1px solid #2a2e3f;">
                                <th style="padding: 10px;">Platform</th>
                                <th style="padding: 10px;">Profile URL</th>
                            </tr>`;
                
                data.results.forEach(res => {
                    html += `
                    <tr style="border-bottom: 1px solid #1a1c29;">
                        <td style="padding: 10px; color: #00f0ff;">${res.site}</td>
                        <td style="padding: 10px;"><a href="${res.url}" target="_blank" style="color: #e0e6ed; text-decoration: none;">${res.url}</a></td>
                    </tr>`;
                });
                
                html += `</table>`;
                osintResults.innerHTML = html;
            } else {
                osintResults.innerHTML = `<p style="color: #ff003c;">Error: ${data.message}</p>`;
                logToConsole(`Error: ${data.message}`);
            }
        } catch (error) {
            osintResults.innerHTML = `<p style="color: #ff003c;">Failed to connect to backend.</p>`;
            logToConsole(`Failed to execute Sherlock.`);
        }
    });
}

// Breach Execution Logic
if(runBreachBtn) {
    runBreachBtn.addEventListener('click', async () => {
        const email = targetEmail.value.trim();
        const apiKey = hibpApiKey.value.trim();
        
        if (!email) return alert('Please enter an email address');
        if (!apiKey) return alert('Please enter an HIBP API Key');
        
        logToConsole(`Querying breach databases for: ${email}...`);
        breachResults.innerHTML = `<p style="color: #00f0ff;">Contacting HIBP servers...</p>`;
        
        try {
            const response = await fetch(`${API_BASE_URL}/breach/${encodeURIComponent(email)}?api_key=${encodeURIComponent(apiKey)}`);
            const data = await response.json();
            
            if (data.status === 'success') {
                if (data.found === 0) {
                    logToConsole(`Good news! No breaches found for ${email}.`);
                    breachResults.innerHTML = `<h4 style="color: #00ff66;">No known breaches found for this email.</h4>`;
                    return;
                }
                
                logToConsole(`CRITICAL: Found ${data.found} breaches for ${email}.`);
                
                let html = `<h4 style="margin-bottom: 10px; color: #ff003c;">Compromised in ${data.found} Breaches</h4>`;
                html += `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px;">`;
                
                data.breaches.forEach(b => {
                    html += `
                    <div style="background: #1a1c29; padding: 15px; border: 1px solid #ff003c; border-radius: 5px;">
                        <h5 style="color: #ff003c; font-size: 1.1rem; margin-bottom: 5px;">${b.Name} (${b.BreachDate})</h5>
                        <p style="font-size: 0.9rem; color: #aaa; margin-bottom: 10px;"><strong>Compromised Data:</strong> ${b.DataClasses.join(', ')}</p>
                        <p style="font-size: 0.8rem; color: #888; overflow-y: auto; max-height: 80px;">${b.Description}</p>
                    </div>`;
                });
                
                html += `</div>`;
                breachResults.innerHTML = html;
            } else {
                breachResults.innerHTML = `<p style="color: #ff003c;">Error: ${data.message}</p>`;
                logToConsole(`Error: ${data.message}`);
            }
        } catch (error) {
            breachResults.innerHTML = `<p style="color: #ff003c;">Failed to connect to backend.</p>`;
            logToConsole(`Failed to check breaches.`);
        }
    });
}

window.onload = () => {
    checkBackendStatus();
};
