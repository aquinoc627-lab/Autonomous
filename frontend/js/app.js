const API_BASE_URL = 'http://localhost:8000/api';

const statusBadge = document.getElementById('api-status');
const consoleOutput = document.getElementById('console');
const navLinks = document.querySelectorAll('.nav-links li');

const dashboardPanel = document.getElementById('content-area');
const osintPanel = document.getElementById('osint-panel');
const breachPanel = document.getElementById('breach-panel');
const forensicsPanel = document.getElementById('forensics-panel');
const infrastructurePanel = document.getElementById('infrastructure-panel');
const archivePanel = document.getElementById('archive-panel');

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
let mapInstance = null;

const runInfraBtn = document.getElementById('run-infra-btn');
const targetInfra = document.getElementById('target-infra');
const shodanApiKey = document.getElementById('shodan-api-key');
const infraResults = document.getElementById('infra-results');

const runArchiveBtn = document.getElementById('run-archive-btn');
const targetArchive = document.getElementById('target-archive');
const archiveResults = document.getElementById('archive-results');

function logToConsole(message) {
    const timestamp = new Date().toLocaleTimeString();
    consoleOutput.innerHTML += `<br>[${timestamp}] ${message}`;
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
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
        infrastructurePanel.style.display = 'none';
        archivePanel.style.display = 'none';

        if (moduleName === 'dashboard') dashboardPanel.style.display = 'block';
        if (moduleName === 'osint') osintPanel.style.display = 'block';
        if (moduleName === 'breach') breachPanel.style.display = 'block';
        if (moduleName === 'forensics') forensicsPanel.style.display = 'block';
        if (moduleName === 'infrastructure') infrastructurePanel.style.display = 'block';
        if (moduleName === 'archive') archivePanel.style.display = 'block';
    });
});

// OSINT / Sherlock Execution Logic
if (runSherlockBtn) {
    runSherlockBtn.addEventListener('click', async () => {
        const username = targetUsername.value.trim();
        if (!username) return alert('Please enter a target username');

        logToConsole(`Initiating Sherlock hunt for: ${username}...`);
        osintResults.innerHTML = `<p style="color: #00f0ff;">Hunting across platforms...</p>`;

        try {
            const response = await fetch(`${API_BASE_URL}/osint/sherlock/${encodeURIComponent(username)}`);
            const data = await response.json();

            if (data.status === 'success') {
                logToConsole(`Hunt complete. Found ${data.accounts_found} accounts for "${username}".`);
                if (data.accounts_found === 0) {
                    osintResults.innerHTML = `<p style="color: #888;">No accounts found for "${username}".</p>`;
                    return;
                }
                let html = `<h4 style="margin-bottom: 10px; color: #00ff66;">Found ${data.accounts_found} Accounts</h4>`;
                html += `<div style="display: flex; flex-wrap: wrap; gap: 8px;">`;
                data.results.forEach(r => {
                    html += `<a href="${r.url}" target="_blank" style="background: #1a1c29; border: 1px solid #2a2e3f; color: #00f0ff; padding: 8px 12px; border-radius: 4px; text-decoration: none; font-size: 0.85rem;">${r.site}</a>`;
                });
                html += `</div>`;
                osintResults.innerHTML = html;
            } else {
                osintResults.innerHTML = `<p style="color: #ff003c;">Error: ${data.message}</p>`;
                logToConsole(`Error: ${data.message}`);
            }
        } catch (error) {
            osintResults.innerHTML = `<p style="color: #ff003c;">Failed to connect to backend.</p>`;
            logToConsole(`Failed to run Sherlock.`);
        }
    });
}

// Breach Intelligence Execution Logic
if (runBreachBtn) {
    runBreachBtn.addEventListener('click', async () => {
        const email = targetEmail.value.trim();
        const apiKey = hibpApiKey.value.trim();
        if (!email) return alert('Please enter a target email address');
        if (!apiKey) return alert('Please enter your HIBP API Key');

        logToConsole(`Checking breach records for: ${email}...`);
        breachResults.innerHTML = `<p style="color: #00f0ff;">Querying HaveIBeenPwned database...</p>`;

        try {
            const response = await fetch(`${API_BASE_URL}/breach/${encodeURIComponent(email)}?api_key=${encodeURIComponent(apiKey)}`);
            const data = await response.json();

            if (data.status === 'success') {
                logToConsole(`Breach check complete. Found ${data.found} breach(es) for "${email}".`);
                if (data.found === 0) {
                    breachResults.innerHTML = `<p style="color: #00ff66;">✓ No breaches found for "${email}".</p>`;
                    return;
                }
                let html = `<h4 style="margin-bottom: 10px; color: #ff003c;">⚠ Found in ${data.found} Breach(es)</h4>`;
                html += `<div style="display: flex; flex-direction: column; gap: 10px;">`;
                data.breaches.forEach(b => {
                    html += `<div style="background: #1a1c29; border: 1px solid #2a2e3f; border-left: 3px solid #ff003c; padding: 12px; border-radius: 4px;">
                        <strong style="color: #ff003c;">${b.Name}</strong>
                        <span style="color: #888; font-size: 0.8rem; margin-left: 10px;">${b.BreachDate}</span>
                        <p style="color: #aaa; font-size: 0.8rem; margin-top: 5px;">Compromised: ${b.DataClasses ? b.DataClasses.join(', ') : 'Unknown'}</p>
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
            logToConsole(`Failed to run breach check.`);
        }
    });
}

// Image Forensics Execution Logic
if (runForensicsBtn) {
    runForensicsBtn.addEventListener('click', async () => {
        const file = imageUpload.files[0];
        if (!file) return alert('Please select an image file');

        logToConsole(`Extracting EXIF data from: ${file.name}...`);
        forensicsResults.innerHTML = `<p style="color: #00f0ff;">Analyzing image metadata...</p>`;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`${API_BASE_URL}/forensics/image`, {
                method: 'POST',
                body: formData
            });
            const data = await response.json();

            if (data.status === 'success') {
                logToConsole(`Analysis complete for "${data.filename}".`);
                const mapDiv = document.getElementById('map');

                if (data.gps) {
                    mapDiv.style.display = 'block';
                    if (mapInstance) {
                        mapInstance.remove();
                        mapInstance = null;
                    }
                    mapInstance = L.map('map').setView([data.gps.lat, data.gps.lon], 13);
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '© OpenStreetMap contributors'
                    }).addTo(mapInstance);
                    L.marker([data.gps.lat, data.gps.lon]).addTo(mapInstance)
                        .bindPopup(`📍 ${data.gps.lat.toFixed(5)}, ${data.gps.lon.toFixed(5)}`).openPopup();
                    logToConsole(`GPS coordinates found: ${data.gps.lat.toFixed(5)}, ${data.gps.lon.toFixed(5)}`);
                } else {
                    mapDiv.style.display = 'none';
                }

                const entries = Object.entries(data.metadata);
                if (entries.length === 0 && !data.gps) {
                    forensicsResults.innerHTML = `<p style="color: #888;">${data.message || 'No metadata found.'}</p>`;
                    return;
                }

                let html = `<h4 style="margin-bottom: 10px; color: #00f0ff;">EXIF Metadata (${entries.length} fields)</h4>`;
                html += `<div style="border: 1px solid #2a2e3f; border-radius: 4px; overflow: hidden;">
                            <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">`;
                entries.forEach(([key, val]) => {
                    html += `<tr style="border-bottom: 1px solid #1a1c29;">
                        <td style="padding: 8px 12px; color: #00f0ff; width: 35%;">${key}</td>
                        <td style="padding: 8px 12px; color: #aaa;">${val}</td>
                    </tr>`;
                });
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

// Infrastructure Execution Logic
if (runInfraBtn) {
    runInfraBtn.addEventListener('click', async () => {
        const target = targetInfra.value.trim();
        const apiKey = shodanApiKey.value.trim();
        if (!target) return alert('Please enter a target domain or IP');
        if (!apiKey) return alert('Please enter a Shodan API Key');

        logToConsole(`Mapping infrastructure for: ${target}...`);
        infraResults.innerHTML = `<p style="color: #00f0ff;">Resolving target and querying Shodan...</p>`;

        try {
            const response = await fetch(`${API_BASE_URL}/infrastructure/${encodeURIComponent(target)}?api_key=${encodeURIComponent(apiKey)}`);
            const data = await response.json();

            if (data.status === 'success') {
                if (data.message) {
                    logToConsole(`Target resolved to ${data.ip}, but no Shodan data found.`);
                    infraResults.innerHTML = `<h4 style="color: #00ff66;">Target IP: ${data.ip}</h4><p>${data.message}</p>`;
                    return;
                }

                logToConsole(`Shodan mapping complete for ${data.ip}. Found ${data.services.length} exposed services.`);

                let html = `<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px;">
                                <div style="background: #1a1c29; padding: 15px; border: 1px solid #2a2e3f; border-radius: 5px;">
                                    <p style="font-size: 0.8rem; color: #888;">Resolved IP</p><h4 style="color: #00f0ff;">${data.ip}</h4>
                                </div>
                                <div style="background: #1a1c29; padding: 15px; border: 1px solid #2a2e3f; border-radius: 5px;">
                                    <p style="font-size: 0.8rem; color: #888;">ISP / Org</p><h4 style="color: #e0e6ed;">${data.isp}</h4>
                                </div>
                                <div style="background: #1a1c29; padding: 15px; border: 1px solid #2a2e3f; border-radius: 5px;">
                                    <p style="font-size: 0.8rem; color: #888;">Location</p><h4 style="color: #e0e6ed;">${data.country}</h4>
                                </div>
                                <div style="background: #1a1c29; padding: 15px; border: 1px solid #2a2e3f; border-radius: 5px;">
                                    <p style="font-size: 0.8rem; color: #888;">Known Vulns</p><h4 style="color: ${data.vulns.length > 0 ? '#ff003c' : '#00ff66'};">${data.vulns.length}</h4>
                                </div>
                            </div>`;

                html += `<h4 style="margin-bottom: 10px; color: #00f0ff;">Exposed Services (${data.services.length})</h4>`;
                html += `<div style="border: 1px solid #2a2e3f; border-radius: 4px; overflow: hidden;">
                            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
                                <tr style="background: #1a1c29;">
                                    <th style="padding: 10px; border-bottom: 1px solid #2a2e3f;">Port / Protocol</th>
                                    <th style="padding: 10px; border-bottom: 1px solid #2a2e3f;">Product</th>
                                    <th style="padding: 10px; border-bottom: 1px solid #2a2e3f;">Banner Data</th>
                                </tr>`;

                data.services.forEach(svc => {
                    html += `<tr style="border-bottom: 1px solid #1a1c29;">
                        <td style="padding: 10px; color: #00ff66; font-weight: bold;">${svc.port} / ${svc.protocol}</td>
                        <td style="padding: 10px; color: #00f0ff;">${svc.product}</td>
                        <td style="padding: 10px; color: #aaa; font-family: monospace;">${escapeHtml(svc.banner)}</td>
                    </tr>`;
                });
                html += `</table></div>`;

                if (data.vulns.length > 0) {
                    html += `<h4 style="margin-top: 20px; margin-bottom: 10px; color: #ff003c;">Associated CVEs</h4><div style="display: flex; flex-wrap: wrap; gap: 5px;">`;
                    data.vulns.forEach(cve => {
                        html += `<span style="background: rgba(255, 0, 60, 0.2); border: 1px solid #ff003c; color: #ff003c; padding: 5px 10px; border-radius: 3px; font-size: 0.8rem;">${cve}</span>`;
                    });
                    html += `</div>`;
                }
                infraResults.innerHTML = html;
            } else {
                infraResults.innerHTML = `<p style="color: #ff003c;">Error: ${data.message}</p>`;
                logToConsole(`Error: ${data.message}`);
            }
        } catch (error) {
            infraResults.innerHTML = `<p style="color: #ff003c;">Failed to connect to backend.</p>`;
            logToConsole(`Failed to map infrastructure.`);
        }
    });
}

// Archive Execution Logic
if (runArchiveBtn) {
    runArchiveBtn.addEventListener('click', async () => {
        const domain = targetArchive.value.trim();
        if (!domain) return alert('Please enter a domain');

        logToConsole(`Querying Wayback Machine for: ${domain}...`);
        archiveResults.innerHTML = `<p style="color: #00f0ff;">Digging through archives...</p>`;

        try {
            const response = await fetch(`${API_BASE_URL}/archive/${encodeURIComponent(domain)}`);
            const data = await response.json();

            if (data.status === 'success') {
                logToConsole(`Archive search complete. Found ${data.found} historical URLs.`);
                let html = `<h4 style="margin-bottom: 10px; color: #00ff66;">Found ${data.found} Historical Endpoints</h4>`;
                html += `<div style="max-height: 400px; overflow-y: auto; border: 1px solid #2a2e3f; border-radius: 4px;">`;
                html += `<table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.85rem;">
                            <tr style="background: #1a1c29; position: sticky; top: 0;">
                                <th style="padding: 10px; border-bottom: 1px solid #2a2e3f;">Timestamp</th>
                                <th style="padding: 10px; border-bottom: 1px solid #2a2e3f;">MimeType</th>
                                <th style="padding: 10px; border-bottom: 1px solid #2a2e3f;">Status</th>
                                <th style="padding: 10px; border-bottom: 1px solid #2a2e3f;">URL</th>
                            </tr>`;

                data.urls.forEach(u => {
                    html += `<tr style="border-bottom: 1px solid #1a1c29;">
                        <td style="padding: 8px 10px; color: #aaa;">${u.timestamp}</td>
                        <td style="padding: 8px 10px; color: #00f0ff;">${u.mimetype}</td>
                        <td style="padding: 8px 10px; color: ${u.status === '200' ? '#00ff66' : '#ff003c'};">${u.status}</td>
                        <td style="padding: 8px 10px;"><a href="${u.url}" target="_blank" style="color: #e0e6ed; text-decoration: none;">${u.url}</a></td>
                    </tr>`;
                });
                html += `</table></div>`;
                archiveResults.innerHTML = html;
            } else {
                archiveResults.innerHTML = `<p style="color: #ff003c;">Error: ${data.message}</p>`;
            }
        } catch (error) {
            archiveResults.innerHTML = `<p style="color: #ff003c;">Failed to fetch archive data.</p>`;
        }
    });
}

window.onload = () => {
    checkBackendStatus();
};
