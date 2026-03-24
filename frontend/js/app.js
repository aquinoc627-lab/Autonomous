function escapeHTML(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>'"]/g, function(tag) {
        const charsToReplace = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        };
        return charsToReplace[tag] || tag;
    });
}

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
const vulnerabilityPanel = document.getElementById('vulnerability-panel');

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

const runVulnBtn = document.getElementById('run-vuln-btn');
const targetVuln = document.getElementById('target-vuln');
const vulnResults = document.getElementById('vuln-results');

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
        
        e.currentTarget.classList.add('active');
        
        const moduleName = e.currentTarget.getAttribute('data-target');
        document.querySelector('h1').textContent = e.currentTarget.textContent;
        logToConsole(`Switching to module: ${moduleName.toUpperCase()}...`);
    });
});

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
        vulnerabilityPanel.style.display = 'none';
        

        if (moduleName === 'dashboard') dashboardPanel.style.display = 'block';
        if (moduleName === 'osint') osintPanel.style.display = 'block';
        if (moduleName === 'breach') breachPanel.style.display = 'block';
        if (moduleName === 'forensics') forensicsPanel.style.display = 'block';
        if (moduleName === 'infrastructure') infrastructurePanel.style.display = 'block';
        if (moduleName === 'archive') archivePanel.style.display = 'block';
        if (moduleName === 'vulnerability') vulnerabilityPanel.style.display = 'block';
    });
});

if (runSherlockBtn) {
    runSherlockBtn.addEventListener('click', async () => {
        const username = targetUsername.value.trim();
        if (!username) return alert('Please enter a target username');

        logToConsole(`Initiating Sherlock hunt for username: ${username}...`);
        logToConsole(`Initiating Sherlock hunt for username: ${escapeHTML(username)}...`);
        osintResults.innerHTML = `<p style="color: #00f0ff;">Searching social platforms...</p>`;

        try {
            const response = await fetch(`${API_BASE_URL}/osint/sherlock/${encodeURIComponent(username)}`);
            const data = await response.json();

            if (data.status === 'success') {
                logToConsole(`Hunt complete. Found ${data.accounts_found} accounts for "${data.target}".`);
                if (data.accounts_found === 0) {
                    osintResults.innerHTML = `<p style="color: #888;">No accounts found for "${username}".</p>`;
                logToConsole(`Hunt complete. Found ${data.accounts_found} accounts for "${escapeHTML(data.target)}".`);
                if (data.accounts_found === 0) {
                    osintResults.innerHTML = `<p style="color: #888;">No accounts found for "${escapeHTML(username)}".</p>`;
                    return;
                }
                let html = `<p style="color: #00ff66; margin-bottom: 10px;">Found ${data.accounts_found} accounts:</p>
                            <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                                <tr style="background: #1a1c29;">
                                    <th style="padding: 10px; border-bottom: 1px solid #2a2e3f; text-align: left;">Platform</th>
                                    <th style="padding: 10px; border-bottom: 1px solid #2a2e3f; text-align: left;">URL</th>
                                </tr>`;
                data.results.forEach(r => {
                    html += `<tr style="border-bottom: 1px solid #1a1c29;">
                        <td style="padding: 10px; color: #00f0ff;">${r.site}</td>
                        <td style="padding: 10px;"><a href="${r.url}" target="_blank" style="color: #00ff66;">${r.url}</a></td>
                        <td style="padding: 10px; color: #00f0ff;">${escapeHTML(r.site)}</td>
                        <td style="padding: 10px;"><a href="${escapeHTML(r.url)}" target="_blank" style="color: #00ff66;">${escapeHTML(r.url)}</a></td>
                    </tr>`;
                });
                html += `</table>`;
                osintResults.innerHTML = html;
            } else {
                osintResults.innerHTML = `<p style="color: #ff003c;">Error: ${data.message}</p>`;
                logToConsole(`Sherlock Error: ${data.message}`);
                osintResults.innerHTML = `<p style="color: #ff003c;">Error: ${escapeHTML(data.message)}</p>`;
                logToConsole(`Sherlock Error: ${escapeHTML(data.message)}`);
            }
        } catch (error) {
            osintResults.innerHTML = `<p style="color: #ff003c;">Failed to connect to backend.</p>`;
            logToConsole(`Failed to execute Sherlock hunt.`);
        }
    });
}

if (runBreachBtn) {
    runBreachBtn.addEventListener('click', async () => {
        const email = targetEmail.value.trim();
        const apiKey = hibpApiKey.value.trim();
        if (!email) return alert('Please enter a target email');

        logToConsole(`Checking breach data for: ${email}...`);
        logToConsole(`Checking breach data for: ${escapeHTML(email)}...`);
        breachResults.innerHTML = `<p style="color: #00f0ff;">Querying HaveIBeenPwned database...</p>`;

        try {
            const response = await fetch(`${API_BASE_URL}/breach/${encodeURIComponent(email)}?api_key=${encodeURIComponent(apiKey)}`);
            const data = await response.json();

            if (data.status === 'success') {
                logToConsole(`Breach check complete. Found ${data.found} breach(es) for "${data.target}".`);
                if (data.found === 0) {
                    breachResults.innerHTML = `<p style="color: #00ff66;">✓ No breaches found for "${email}".</p>`;
                logToConsole(`Breach check complete. Found ${data.found} breach(es) for "${escapeHTML(data.target)}".`);
                if (data.found === 0) {
                    breachResults.innerHTML = `<p style="color: #00ff66;">✓ No breaches found for "${escapeHTML(email)}".</p>`;
                    return;
                }
                let html = `<p style="color: #ff003c; margin-bottom: 10px;">⚠️ Found in ${data.found} breach(es):</p>`;
                data.breaches.forEach(b => {
                    html += `<div style="background: #1a1c29; border: 1px solid #2a2e3f; border-radius: 5px; padding: 15px; margin-bottom: 10px;">
                        <h4 style="color: #ff003c; margin-bottom: 5px;">${b.Name}</h4>
                        <p style="color: #888; font-size: 0.85rem; margin-bottom: 5px;">Breach Date: ${b.BreachDate} | ${b.PwnCount ? b.PwnCount.toLocaleString() : 'N/A'} accounts</p>
                        <p style="color: #aaa; font-size: 0.85rem;">Data: ${b.DataClasses ? b.DataClasses.join(', ') : 'N/A'}</p>
                        <h4 style="color: #ff003c; margin-bottom: 5px;">${escapeHTML(b.Name)}</h4>
                        <p style="color: #888; font-size: 0.85rem; margin-bottom: 5px;">Breach Date: ${escapeHTML(b.BreachDate)} | ${b.PwnCount ? escapeHTML(b.PwnCount.toLocaleString()) : 'N/A'} accounts</p>
                        <p style="color: #aaa; font-size: 0.85rem;">Data: ${b.DataClasses ? b.DataClasses.map(escapeHTML).join(', ') : 'N/A'}</p>
                    </div>`;
                });
                breachResults.innerHTML = html;
            } else {
                breachResults.innerHTML = `<p style="color: #ff003c;">Error: ${data.message}</p>`;
                logToConsole(`Breach Error: ${data.message}`);
                breachResults.innerHTML = `<p style="color: #ff003c;">Error: ${escapeHTML(data.message)}</p>`;
                logToConsole(`Breach Error: ${escapeHTML(data.message)}`);
            }
        } catch (error) {
            breachResults.innerHTML = `<p style="color: #ff003c;">Failed to connect to backend.</p>`;
            logToConsole(`Failed to execute breach check.`);
        }
    });
}

if (runForensicsBtn) {
    runForensicsBtn.addEventListener('click', async () => {
        const file = imageUpload.files[0];
        if (!file) return alert('Please select an image file');

        logToConsole(`Extracting EXIF data from: ${file.name}...`);
        logToConsole(`Extracting EXIF data from: ${escapeHTML(file.name)}...`);
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
                logToConsole(`Forensic analysis complete for "${data.filename}".`);
                logToConsole(`Forensic analysis complete for "${escapeHTML(data.filename)}".`);

                if (data.gps) {
                    const mapDiv = document.getElementById('map');
                    mapDiv.style.display = 'block';
                    if (mapInstance) {
                        mapInstance.remove();
                        mapInstance = null;
                    }
                    mapInstance = L.map('map').setView([data.gps.lat, data.gps.lon], 13);
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstance);
                    L.marker([data.gps.lat, data.gps.lon]).addTo(mapInstance)
                        .bindPopup(`📍 GPS: ${data.gps.lat.toFixed(5)}, ${data.gps.lon.toFixed(5)}`).openPopup();
                    logToConsole(`GPS coordinates found: ${data.gps.lat.toFixed(5)}, ${data.gps.lon.toFixed(5)}`);
                }

                const metaEntries = Object.entries(data.metadata);
                if (metaEntries.length === 0) {
                    forensicsResults.innerHTML = `<p style="color: #888;">${data.message || 'No metadata found.'}</p>`;
                    forensicsResults.innerHTML = `<p style="color: #888;">${escapeHTML(data.message) || 'No metadata found.'}</p>`;
                    return;
                }
                let html = `<table style="width: 100%; border-collapse: collapse; font-size: 0.85rem; margin-top: 10px;">
                                <tr style="background: #1a1c29;">
                                    <th style="padding: 8px; border-bottom: 1px solid #2a2e3f; text-align: left; width: 35%;">Tag</th>
                                    <th style="padding: 8px; border-bottom: 1px solid #2a2e3f; text-align: left;">Value</th>
                                </tr>`;
                metaEntries.forEach(([key, value]) => {
                    html += `<tr style="border-bottom: 1px solid #1a1c29;">
                        <td style="padding: 8px; color: #00f0ff; font-family: monospace;">${key}</td>
                        <td style="padding: 8px; color: #aaa; word-break: break-all;">${value}</td>
                        <td style="padding: 8px; color: #00f0ff; font-family: monospace;">${escapeHTML(key)}</td>
                        <td style="padding: 8px; color: #aaa; word-break: break-all;">${escapeHTML(value)}</td>
                    </tr>`;
                });
                html += `</table>`;
                forensicsResults.innerHTML = html;
            } else {
                forensicsResults.innerHTML = `<p style="color: #ff003c;">Error: ${data.message}</p>`;
                logToConsole(`Forensics Error: ${data.message}`);
                forensicsResults.innerHTML = `<p style="color: #ff003c;">Error: ${escapeHTML(data.message)}</p>`;
                logToConsole(`Forensics Error: ${escapeHTML(data.message)}`);
            }
        } catch (error) {
            forensicsResults.innerHTML = `<p style="color: #ff003c;">Failed to connect to backend.</p>`;
            logToConsole(`Failed to execute forensics analysis.`);
        }
    });
}

if (runInfraBtn) {
    runInfraBtn.addEventListener('click', async () => {
        const target = targetInfra.value.trim();
        const apiKey = shodanApiKey.value.trim();
        if (!target) return alert('Please enter a domain or IP address');

        logToConsole(`Mapping attack surface for: ${target}...`);
        logToConsole(`Mapping attack surface for: ${escapeHTML(target)}...`);
        infraResults.innerHTML = `<p style="color: #00f0ff;">Querying Shodan intelligence...</p>`;

        try {
            const response = await fetch(`${API_BASE_URL}/infrastructure/${encodeURIComponent(target)}?api_key=${encodeURIComponent(apiKey)}`);
            const data = await response.json();

            if (data.status === 'success') {
                logToConsole(`Infrastructure mapping complete for "${data.target}".`);

                if (data.message) {
                    infraResults.innerHTML = `<p style="color: #888;">${data.message}</p>`;
                logToConsole(`Infrastructure mapping complete for "${escapeHTML(data.target)}".`);

                if (data.message) {
                    infraResults.innerHTML = `<p style="color: #888;">${escapeHTML(data.message)}</p>`;
                    return;
                }

                let html = `<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-bottom: 20px;">
                    <div style="background: #1a1c29; padding: 15px; border-radius: 5px; border: 1px solid #2a2e3f;">
                        <p style="font-size: 0.75rem; color: #888;">IP Address</p>
                        <h4 style="color: #00f0ff;">${data.ip}</h4>
                    </div>
                    <div style="background: #1a1c29; padding: 15px; border-radius: 5px; border: 1px solid #2a2e3f;">
                        <p style="font-size: 0.75rem; color: #888;">ISP / Org</p>
                        <h4 style="color: #00f0ff;">${data.isp}</h4>
                    </div>
                    <div style="background: #1a1c29; padding: 15px; border-radius: 5px; border: 1px solid #2a2e3f;">
                        <p style="font-size: 0.75rem; color: #888;">Country</p>
                        <h4 style="color: #00f0ff;">${data.country}</h4>
                    </div>
                    <div style="background: #1a1c29; padding: 15px; border-radius: 5px; border: 1px solid #2a2e3f;">
                        <p style="font-size: 0.75rem; color: #888;">OS</p>
                        <h4 style="color: #00f0ff;">${data.os || 'Unknown'}</h4>
                        <h4 style="color: #00f0ff;">${escapeHTML(data.ip)}</h4>
                    </div>
                    <div style="background: #1a1c29; padding: 15px; border-radius: 5px; border: 1px solid #2a2e3f;">
                        <p style="font-size: 0.75rem; color: #888;">ISP / Org</p>
                        <h4 style="color: #00f0ff;">${escapeHTML(data.isp)}</h4>
                    </div>
                    <div style="background: #1a1c29; padding: 15px; border-radius: 5px; border: 1px solid #2a2e3f;">
                        <p style="font-size: 0.75rem; color: #888;">Country</p>
                        <h4 style="color: #00f0ff;">${escapeHTML(data.country)}</h4>
                    </div>
                    <div style="background: #1a1c29; padding: 15px; border-radius: 5px; border: 1px solid #2a2e3f;">
                        <p style="font-size: 0.75rem; color: #888;">OS</p>
                        <h4 style="color: #00f0ff;">${escapeHTML(data.os || 'Unknown')}</h4>
                    </div>
                </div>`;

                if (data.vulns && data.vulns.length > 0) {
                    html += `<h4 style="color: #ff003c; margin-bottom: 10px;">⚠️ Known CVEs (${data.vulns.length})</h4>
                             <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px;">`;
                    data.vulns.forEach(cve => {
                        html += `<span style="background: rgba(255,0,60,0.1); color: #ff003c; border: 1px solid #ff003c; padding: 4px 8px; border-radius: 3px; font-family: monospace; font-size: 0.8rem;">${cve}</span>`;
                        html += `<span style="background: rgba(255,0,60,0.1); color: #ff003c; border: 1px solid #ff003c; padding: 4px 8px; border-radius: 3px; font-family: monospace; font-size: 0.8rem;">${escapeHTML(cve)}</span>`;
                    });
                    html += `</div>`;
                }

                if (data.services && data.services.length > 0) {
                    html += `<h4 style="margin-bottom: 10px; color: #e0e6ed;">Open Services (${data.services.length})</h4>
                             <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                                <tr style="background: #1a1c29;">
                                    <th style="padding: 8px; border-bottom: 1px solid #2a2e3f; text-align: left;">Port</th>
                                    <th style="padding: 8px; border-bottom: 1px solid #2a2e3f; text-align: left;">Protocol</th>
                                    <th style="padding: 8px; border-bottom: 1px solid #2a2e3f; text-align: left;">Product</th>
                                </tr>`;
                    data.services.forEach(s => {
                        html += `<tr style="border-bottom: 1px solid #1a1c29;">
                            <td style="padding: 8px; color: #00f0ff; font-family: monospace;">${s.port}</td>
                            <td style="padding: 8px; color: #aaa;">${s.protocol || 'tcp'}</td>
                            <td style="padding: 8px; color: #aaa;">${s.product}</td>
                            <td style="padding: 8px; color: #00f0ff; font-family: monospace;">${escapeHTML(String(s.port))}</td>
                            <td style="padding: 8px; color: #aaa;">${escapeHTML(s.protocol || 'tcp')}</td>
                            <td style="padding: 8px; color: #aaa;">${escapeHTML(s.product)}</td>
                        </tr>`;
                    });
                    html += `</table>`;
                }

                infraResults.innerHTML = html;
            } else {
                infraResults.innerHTML = `<p style="color: #ff003c;">Error: ${data.message}</p>`;
                logToConsole(`Infrastructure Error: ${data.message}`);
                infraResults.innerHTML = `<p style="color: #ff003c;">Error: ${escapeHTML(data.message)}</p>`;
                logToConsole(`Infrastructure Error: ${escapeHTML(data.message)}`);
            }
        } catch (error) {
            infraResults.innerHTML = `<p style="color: #ff003c;">Failed to connect to backend.</p>`;
            logToConsole(`Failed to execute infrastructure mapping.`);
        }
    });
}

if (runArchiveBtn) {
    runArchiveBtn.addEventListener('click', async () => {
        const domain = targetArchive.value.trim();
        if (!domain) return alert('Please enter a domain');

        logToConsole(`Querying Wayback Machine for: ${domain}...`);
        logToConsole(`Querying Wayback Machine for: ${escapeHTML(domain)}...`);
        archiveResults.innerHTML = `<p style="color: #00f0ff;">Discovering archived endpoints...</p>`;

        try {
            const response = await fetch(`${API_BASE_URL}/archive/${encodeURIComponent(domain)}`);
            const data = await response.json();

            if (data.status === 'success') {
                logToConsole(`Archive discovery complete. Found ${data.found} URLs for "${data.target}".`);
                if (data.found === 0) {
                    archiveResults.innerHTML = `<p style="color: #888;">No archived URLs found for "${domain}".</p>`;
                logToConsole(`Archive discovery complete. Found ${data.found} URLs for "${escapeHTML(data.target)}".`);
                if (data.found === 0) {
                    archiveResults.innerHTML = `<p style="color: #888;">No archived URLs found for "${escapeHTML(domain)}".</p>`;
                    return;
                }
                let html = `<p style="color: #00ff66; margin-bottom: 10px;">Found ${data.found} archived URLs:</p>
                            <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem;">
                                <tr style="background: #1a1c29;">
                                    <th style="padding: 8px; border-bottom: 1px solid #2a2e3f; text-align: left;">URL</th>
                                    <th style="padding: 8px; border-bottom: 1px solid #2a2e3f; text-align: left;">Timestamp</th>
                                    <th style="padding: 8px; border-bottom: 1px solid #2a2e3f; text-align: left;">Type</th>
                                    <th style="padding: 8px; border-bottom: 1px solid #2a2e3f; text-align: left;">Status</th>
                                </tr>`;
                data.urls.forEach(u => {
                    html += `<tr style="border-bottom: 1px solid #1a1c29;">
                        <td style="padding: 8px; color: #00f0ff; word-break: break-all; max-width: 300px;">${u.url}</td>
                        <td style="padding: 8px; color: #aaa; white-space: nowrap;">${u.timestamp}</td>
                        <td style="padding: 8px; color: #aaa;">${u.mimetype}</td>
                        <td style="padding: 8px; color: ${u.status === '200' ? '#00ff66' : '#ff003c'};">${u.status}</td>
                        <td style="padding: 8px; color: #00f0ff; word-break: break-all; max-width: 300px;">${escapeHTML(u.url)}</td>
                        <td style="padding: 8px; color: #aaa; white-space: nowrap;">${escapeHTML(u.timestamp)}</td>
                        <td style="padding: 8px; color: #aaa;">${escapeHTML(u.mimetype)}</td>
                        <td style="padding: 8px; color: ${u.status === '200' ? '#00ff66' : '#ff003c'};">${escapeHTML(u.status)}</td>
                    </tr>`;
                });
                html += `</table>`;
                archiveResults.innerHTML = html;
            } else {
                archiveResults.innerHTML = `<p style="color: #ff003c;">Error: ${data.message}</p>`;
                logToConsole(`Archive Error: ${data.message}`);
                archiveResults.innerHTML = `<p style="color: #ff003c;">Error: ${escapeHTML(data.message)}</p>`;
                logToConsole(`Archive Error: ${escapeHTML(data.message)}`);
            }
        } catch (error) {
            archiveResults.innerHTML = `<p style="color: #ff003c;">Failed to connect to backend.</p>`;
            logToConsole(`Failed to execute archive discovery.`);
        }
    });
}

// Vulnerability Execution Logic
if (runVulnBtn) {
    runVulnBtn.addEventListener('click', async () => {
        let url = targetVuln.value.trim();
        if (!url) return alert('Please enter a target URL');
        
        logToConsole(`Initiating passive vulnerability scan against: ${url}...`);
        vulnResults.innerHTML = `<p style="color: #00f0ff;">Analyzing headers and directory structure...</p>`;
        
        try {
            const response = await fetch(`${API_BASE_URL}/validate?target_url=${encodeURIComponent(url)}`);
            const resData = await response.json();
            
            if (resData.status === 'success') {
                const data = resData.data;
                logToConsole(`Scan complete for ${data.target}.`);
                
                let html = `<div style="background: #1a1c29; padding: 15px; border: 1px solid #2a2e3f; border-radius: 5px; margin-bottom: 20px;">
                                <p style="font-size: 0.8rem; color: #888;">Detected Server</p>
                                <h4 style="color: #00f0ff;">${data.server_info}</h4>
                            </div>`;
                

        logToConsole(`Initiating passive vulnerability scan against: ${escapeHTML(url)}...`);
        vulnResults.innerHTML = `<p style="color: #00f0ff;">Analyzing headers and directory structure...</p>`;

        try {
            const response = await fetch(`${API_BASE_URL}/validate?target_url=${encodeURIComponent(url)}`);
            const resData = await response.json();

            if (resData.status === 'success') {
                const data = resData.data;
                logToConsole(`Scan complete for ${escapeHTML(data.target)}.`);

                let html = `<div style="background: #1a1c29; padding: 15px; border: 1px solid #2a2e3f; border-radius: 5px; margin-bottom: 20px;">
                                <p style="font-size: 0.8rem; color: #888;">Detected Server</p>
                                <h4 style="color: #00f0ff;">${escapeHTML(data.server_info)}</h4>
                            </div>`;

                html += `<h4 style="margin-bottom: 10px; color: ${data.sensitive_files.length > 0 ? '#ff003c' : '#00ff66'};">Exposed Sensitive Files</h4>`;
                if (data.sensitive_files.length > 0) {
                    html += `<ul style="list-style: none; margin-bottom: 20px;">`;
                    data.sensitive_files.forEach(f => {
                        html += `<li style="color: #ff003c; margin-bottom: 5px;">⚠️ <strong>${f}</strong> is publicly accessible!</li>`;
                        html += `<li style="color: #ff003c; margin-bottom: 5px;">⚠️ <strong>${escapeHTML(f)}</strong> is publicly accessible!</li>`;
                    });
                    html += `</ul>`;
                } else {
                    html += `<p style="color: #00ff66; margin-bottom: 20px;">✓ No common sensitive files found.</p>`;
                }
                

                html += `<h4 style="margin-bottom: 10px; color: #ff003c;">Missing Security Headers</h4>`;
                if (data.missing_headers.length > 0) {
                    html += `<table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
                                <tr style="background: #1a1c29;">
                                    <th style="padding: 10px; border-bottom: 1px solid #2a2e3f;">Header</th>
                                    <th style="padding: 10px; border-bottom: 1px solid #2a2e3f;">Impact</th>
                                </tr>`;
                    data.missing_headers.forEach(h => {
                        html += `<tr style="border-bottom: 1px solid #1a1c29;">
                            <td style="padding: 10px; color: #ff003c; font-family: monospace;">${h.header}</td>
                            <td style="padding: 10px; color: #aaa;">${h.risk}</td>
                            <td style="padding: 10px; color: #ff003c; font-family: monospace;">${escapeHTML(h.header)}</td>
                            <td style="padding: 10px; color: #aaa;">${escapeHTML(h.risk)}</td>
                        </tr>`;
                    });
                    html += `</table>`;
                } else {
                    html += `<p style="color: #00ff66;">✓ All standard security headers are present.</p>`;
                }
                
                vulnResults.innerHTML = html;
                
            } else {
                vulnResults.innerHTML = `<p style="color: #ff003c;">Error: ${resData.message}</p>`;
                logToConsole(`Scan Error: ${resData.message}`);

                vulnResults.innerHTML = html;

            } else {
                vulnResults.innerHTML = `<p style="color: #ff003c;">Error: ${escapeHTML(resData.message)}</p>`;
                logToConsole(`Scan Error: ${escapeHTML(resData.message)}`);
            }
        } catch (error) {
            vulnResults.innerHTML = `<p style="color: #ff003c;">Failed to connect to backend.</p>`;
            logToConsole(`Failed to execute vulnerability scan.`);
        }
    });
}

window.onload = () => {
    checkBackendStatus();
};
