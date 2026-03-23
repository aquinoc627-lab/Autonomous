const API_BASE_URL = 'http://localhost:8000/api';

const statusBadge = document.getElementById('api-status');
const consoleOutput = document.getElementById('console');
const navLinks = document.querySelectorAll('.nav-links li');

const dashboardPanel = document.getElementById('content-area');
const osintPanel = document.getElementById('osint-panel');
const breachPanel = document.getElementById('breach-panel');
const forensicsPanel = document.getElementById('forensics-panel');

const runSherlockBtn = document.getElementById('run-sherlock-btn');
const targetUsername = document.getElementById('target-username');
const osintResults = document.getElementById('osint-results');

const runBreachBtn = document.getElementById('run-breach-btn');
const targetEmail = document.getElementById('target-email');
const hibpApiKey = document.getElementById('hibp-api-key');
const breachResults = document.getElementById('breach-results');

const runForensicsBtn = document.getElementById('run-forensics-btn');
const imageUpload = document.getElementById('image-upload');
const forensicsResults = document.getElementById('forensics-results');
const MAX_METADATA_VALUE_LENGTH = 100;
let mapInstance = null;

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
        
        dashboardPanel.style.display = 'none';
        osintPanel.style.display = 'none';
        breachPanel.style.display = 'none';
        forensicsPanel.style.display = 'none';
        
        if (moduleName === 'dashboard') dashboardPanel.style.display = 'block';
        if (moduleName === 'osint') osintPanel.style.display = 'block';
        if (moduleName === 'breach') breachPanel.style.display = 'block';
        if (moduleName === 'forensics') forensicsPanel.style.display = 'block';
    });
});

if(runSherlockBtn) {
    runSherlockBtn.addEventListener('click', async () => {
        const username = targetUsername.value.trim();
        if (!username) return alert('Please enter a username');
        
        logToConsole(`Initiating Sherlock swarm against target: ${username}...`);
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
                    html += `<tr style="border-bottom: 1px solid #1a1c29;">
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
                    html += `<div style="background: #1a1c29; padding: 15px; border: 1px solid #ff003c; border-radius: 5px;">
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

if(runForensicsBtn) {
    runForensicsBtn.addEventListener('click', async () => {
        const file = imageUpload.files[0];
        if (!file) return alert('Please select an image file first.');
        
        logToConsole(`Analyzing image: ${file.name}...`);
        forensicsResults.innerHTML = `<p style="color: #00f0ff;">Extracting EXIF data...</p>`;
        document.getElementById('map').style.display = 'none';
        
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const response = await fetch(`${API_BASE_URL}/forensics/image`, {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            
            if (data.status === 'success') {
                logToConsole(`Extraction complete for ${file.name}.`);
                
                if (data.gps) {
                    logToConsole(`CRITICAL: GPS Coordinates found! Lat: ${data.gps.lat}, Lon: ${data.gps.lon}`);
                    const mapDiv = document.getElementById('map');
                    mapDiv.style.display = 'block';
                    
                    if (mapInstance) mapInstance.remove();
                    mapInstance = L.map('map').setView([data.gps.lat, data.gps.lon], 13);
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '&copy; OpenStreetMap contributors'
                    }).addTo(mapInstance);
                    L.marker([data.gps.lat, data.gps.lon]).addTo(mapInstance)
                        .bindPopup('Extracted Origin')
                        .openPopup();
                } else {
                    logToConsole('No GPS coordinates found in image.');
                }
                
                if (Object.keys(data.metadata).length === 0) {
                    forensicsResults.innerHTML = `<h4 style="color: #00ff66;">No EXIF metadata found in this image.</h4>`;
                    return;
                }
                
                let html = `<h4 style="margin-bottom: 10px; color: #00f0ff;">Extracted Metadata</h4>`;
                html += `<div style="max-height: 400px; overflow-y: auto; border: 1px solid #2a2e3f; border-radius: 4px;">`;
                html += `<table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
                            <tr style="background: #1a1c29; position: sticky; top: 0;">
                                <th style="padding: 10px; border-bottom: 1px solid #2a2e3f;">EXIF Tag</th>
                                <th style="padding: 10px; border-bottom: 1px solid #2a2e3f;">Value</th>
                            </tr>`;
                
                for (const [key, value] of Object.entries(data.metadata)) {
                    if (value.length > MAX_METADATA_VALUE_LENGTH) continue;
                    html += `
                    <tr style="border-bottom: 1px solid #1a1c29;">
                        <td style="padding: 8px 10px; color: #00ff66;">${key}</td>
                        <td style="padding: 8px 10px; color: #e0e6ed;">${value}</td>
                    </tr>`;
                }
                html += `</table></div>`;
                forensicsResults.innerHTML = html;
                
            } else {
                forensicsResults.innerHTML = `<p style="color: #ff003c;">Error: ${data.message}</p>`;
                logToConsole(`Error: ${data.message}`);
            }
        } catch (error) {
            forensicsResults.innerHTML = `<p style="color: #ff003c;">Failed to connect to backend.</p>`;
            logToConsole(`Failed to analyze image.`);
        }
    });
}

window.onload = () => {
    checkBackendStatus();
};
