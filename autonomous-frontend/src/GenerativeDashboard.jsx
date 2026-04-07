import React, { useState, useEffect, useRef } from "react";
import { MdLanguage, MdWifi, MdPersonSearch, MdOutlineArchitecture } from "react-icons/md";
import "./GenerativeDashboard.css";

/* ================================================================
   GENERATIVE CONTEXTS
   ================================================================ */

// Context 1: Web Application Audit (HTTP Waterfall & DOM Tree)
const WebAuditWidget = () => {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    // Simulate streaming HTTP requests
    let count = 0;
    const interval = setInterval(() => {
      count++;
      setRequests((prev) => {
        const newReq = {
          id: count,
          method: ["GET", "POST", "OPTIONS"][Math.floor(Math.random() * 3)],
          path: ["/api/v1/auth", "/login.php", "/admin/dashboard", "/wp-content/"][Math.floor(Math.random() * 4)],
          status: [200, 403, 404, 500][Math.floor(Math.random() * 4)],
          duration: Math.floor(Math.random() * 500) + 10,
        };
        // Keep last 15
        return [...prev, newReq].slice(-15);
      });
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="gen-widget web-audit-widget fade-in-up">
      <div className="gen-widget-header">
        <MdLanguage /> Web Application Audit
      </div>
      <div className="gen-widget-body" style={{ display: 'flex', gap: 24 }}>
        
        {/* HTTP Waterfall */}
        <div className="http-waterfall" style={{ flex: 1 }}>
          <h4 style={{ color: 'var(--neon-cyan)', marginBottom: 12 }}>HTTP Request Waterfall</h4>
          <div className="waterfall-container">
            {requests.map((req) => (
              <div key={req.id} className="waterfall-row">
                <div className="wf-method" style={{ color: req.method === "POST" ? "var(--neon-yellow)" : "var(--neon-cyan)" }}>{req.method}</div>
                <div className="wf-path">{req.path}</div>
                <div className="wf-status" style={{ color: req.status >= 400 ? "var(--neon-red)" : "var(--neon-green)" }}>{req.status}</div>
                <div className="wf-bar-track">
                  <div 
                    className="wf-bar" 
                    style={{ 
                      width: `${Math.min(100, req.duration / 5)}%`,
                      background: req.status >= 400 ? "var(--neon-red)" : "var(--neon-cyan)"
                    }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Simulated DOM Tree */}
        <div className="dom-tree-view" style={{ flex: 1 }}>
          <h4 style={{ color: 'var(--neon-cyan)', marginBottom: 12 }}>DOM Traversal Graph</h4>
          <div className="dom-tree-container">
            <div className="dom-node root glow-pulse">
              document
              <div className="dom-children">
                <div className="dom-node">
                  html
                  <div className="dom-children">
                    <div className="dom-node">head</div>
                    <div className="dom-node active-target">
                      body (Scanning...)
                      <div className="dom-children">
                        <div className="dom-node vulnerable">&lt;form id="login"&gt; (SQLi detected)</div>
                        <div className="dom-node">&lt;script src="app.js"&gt;</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

// Context 2: WiFi Hacking (RF Spectrum Analyzer)
const WiFiHackingWidget = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationId;
    let offset = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 2;

      // Draw 3 frequency bands
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        const colors = ["#00f0ff", "#39ff14", "#ff0040"];
        ctx.strokeStyle = colors[i];
        
        for (let x = 0; x < canvas.width; x++) {
          // Complex sine wave for RF simulation
          const y = (Math.sin(x * 0.05 + offset + i) * 30) + 
                    (Math.sin(x * 0.1 + offset * 2) * 10) + 
                    (canvas.height / 2) + (i * 20 - 20);
          
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Draw Handshake Capture spikes
      if (Math.random() > 0.95) {
        ctx.fillStyle = "rgba(255, 230, 0, 0.5)";
        const spikeX = Math.random() * canvas.width;
        ctx.fillRect(spikeX, 0, 4, canvas.height);
        ctx.fillStyle = "#ffe600";
        ctx.fillText("EAPOL Handshake", spikeX + 8, Math.random() * canvas.height);
      }

      offset += 0.1;
      animationId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <div className="gen-widget wifi-widget fade-in-up">
      <div className="gen-widget-header" style={{ color: "var(--neon-green)" }}>
        <MdWifi /> Radio Frequency Spectrum Analyzer (802.11)
      </div>
      <div className="gen-widget-body">
        <canvas 
          ref={canvasRef} 
          width={800} 
          height={300} 
          style={{ width: '100%', height: '300px', background: '#050a0f', borderRadius: 8, border: '1px solid rgba(57, 255, 20, 0.3)' }} 
        />
        <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
          <div className="rf-stat-box">
            <div className="label">Channel</div>
            <div className="value">6 (2.437 GHz)</div>
          </div>
          <div className="rf-stat-box">
            <div className="label">BSSID</div>
            <div className="value" style={{ color: "var(--neon-yellow)" }}>00:14:22:01:23:45</div>
          </div>
          <div className="rf-stat-box">
            <div className="label">Deauth Frames</div>
            <div className="value" style={{ color: "var(--neon-red)" }}>Transmitting...</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Context 3: OSINT Recon (Identity Graph)
const OsintWidget = () => {
  return (
    <div className="gen-widget osint-widget fade-in-up">
      <div className="gen-widget-header" style={{ color: "var(--neon-yellow)" }}>
        <MdPersonSearch /> OSINT Identity Graph
      </div>
      <div className="gen-widget-body">
        <div className="osint-grid">
          {/* Main Target */}
          <div className="osint-card primary-target glow-pulse-yellow">
            <div className="osint-avatar">JD</div>
            <h4>John Doe</h4>
            <p>Target Profile</p>
            <div className="osint-data">Email: j.doe@example.com</div>
          </div>
          
          {/* Connecting Lines (Simulated via borders/layout in CSS) */}
          <div className="osint-links">
            <div className="osint-link" />
            <div className="osint-link" />
            <div className="osint-link" />
          </div>

          {/* Discovered Entities */}
          <div className="osint-discoveries">
            <div className="osint-card sub-target">
              <MdLanguage className="icon" />
              <h4>LinkedIn</h4>
              <div className="osint-data">/in/johndoe99</div>
            </div>
            <div className="osint-card sub-target">
              <MdLanguage className="icon" />
              <h4>GitHub</h4>
              <div className="osint-data">@jdoe-dev (3 leaked keys)</div>
            </div>
            <div className="osint-card sub-target danger">
              <MdLanguage className="icon" />
              <h4>Darknet Paste</h4>
              <div className="osint-data">Password hash found (2021)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ================================================================
   MAIN GENERATIVE DASHBOARD
   ================================================================ */
export default function GenerativeDashboard() {
  const [context, setContext] = useState("idle");
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Simulate context switching with a brief "dissolve" state
  const switchContext = (newContext) => {
    if (newContext === context) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setContext(newContext);
      setIsTransitioning(false);
    }, 600); // 600ms dissolve animation
  };

  return (
    <div className="generative-dashboard">
      <div className="generative-controls">
        <span className="generative-label"><MdOutlineArchitecture /> GENERATIVE UI ENGINE:</span>
        <button className={`btn ${context === "idle" ? "btn-primary" : "btn-secondary"}`} onClick={() => switchContext("idle")}>
          Idle
        </button>
        <button className={`btn ${context === "web_audit" ? "btn-primary" : "btn-secondary"}`} onClick={() => switchContext("web_audit")}>
          Web Audit
        </button>
        <button className={`btn ${context === "wifi_hack" ? "btn-primary" : "btn-secondary"}`} onClick={() => switchContext("wifi_hack")}>
          WiFi Hack
        </button>
        <button className={`btn ${context === "osint" ? "btn-primary" : "btn-secondary"}`} onClick={() => switchContext("osint")}>
          OSINT Recon
        </button>
      </div>

      <div className={`generative-canvas ${isTransitioning ? "dissolving" : "solid"}`}>
        {context === "idle" && (
          <div className="gen-idle-state">
            <div className="idle-ring" />
            <p>Awaiting AI Context Shift...</p>
            <span style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 8 }}>
              The UI will physically rebuild itself based on the active agent's operational focus.
            </span>
          </div>
        )}

        {context === "web_audit" && <WebAuditWidget />}
        {context === "wifi_hack" && <WiFiHackingWidget />}
        {context === "osint" && <OsintWidget />}
      </div>
    </div>
  );
}
