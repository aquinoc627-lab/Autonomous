const API_BASE_URL = 'http://localhost:8000/api';

const statusBadge = document.getElementById('api-status');
const consoleOutput = document.getElementById('console');
const navLinks = document.querySelectorAll('.nav-links li');

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
        e.currentTarget.classList.add('active');
        
        const moduleName = e.currentTarget.getAttribute('data-target');
        document.querySelector('h1').textContent = e.currentTarget.textContent;
        logToConsole(`Switching to module: ${moduleName.toUpperCase()}...`);
    });
});

window.onload = () => {
    checkBackendStatus();
};
