import React, { useState, useEffect, useCallback } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import NotificationCenter from "./NotificationCenter";
import VoiceControl from "./VoiceControl";
import MemorySearch from "./MemorySearch";
import { ghostAPI } from "./api";
import {
  MdDashboard,
  MdRocketLaunch,
  MdSmartToy,
  MdChat,
  MdBarChart,
  MdLogout,
  MdMenu,
  MdClose,
  MdBuild,
  MdSecurity,
  MdTerminal,
  MdPlaylistPlay,
  MdAccountTree,
  MdWarning,
  MdCircle,
  MdMoreHoriz,
  MdGavel,
  MdPersonSearch,
} from "react-icons/md";


/* ================================================================
   GHOST PROTOCOL WIDGET
   Sidebar toggle to spin up / tear down the ephemeral Tor proxy
   ================================================================ */
function GhostProtocolWidget() {
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check initial status on mount
  useEffect(() => {
    ghostAPI
      .status()
      .then((res) => {
        if (res.data?.status === "success") setActive(res.data.active);
      })
      .catch(() => {});
  }, []);

  const handleToggle = async (e) => {
    const enable = e.target.checked;
    setLoading(true);
    try {
      const res = await ghostAPI.toggle(enable);
      if (res.data?.status === "success") setActive(enable);
      else setActive(!enable); // revert on backend error
    } catch {
      setActive(!enable); // revert on network error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        padding: "14px 16px",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        marginTop: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <span
          style={{
            color: active ? "#ff003c" : "var(--sidebar-text, #e0e6ed)",
            fontWeight: 700,
            fontSize: "0.8rem",
            letterSpacing: "0.05em",
            textShadow: active ? "0 0 8px #ff003c" : "none",
            transition: "all 0.3s",
          }}
        >
          👻 GHOST PROTOCOL
        </span>
        {/* Toggle switch */}
        <label
          style={{
            position: "relative",
            display: "inline-block",
            width: 40,
            height: 20,
            flexShrink: 0,
            opacity: loading ? 0.5 : 1,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={active}
            onChange={handleToggle}
            disabled={loading}
            style={{ opacity: 0, width: 0, height: 0 }}
          />
          <span
            style={{
              position: "absolute",
              cursor: loading ? "not-allowed" : "pointer",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: active ? "#ff003c" : "#2a2e3f",
              boxShadow: active ? "0 0 10px #ff003c" : "none",
              borderRadius: 20,
              transition: "0.4s",
            }}
          >
            <span
              style={{
                position: "absolute",
                content: '""',
                height: 16,
                width: 16,
                left: active ? 22 : 2,
                bottom: 2,
                backgroundColor: "white",
                borderRadius: "50%",
                transition: "0.4s",
              }}
            />
          </span>
        </label>
      </div>
      <p
        style={{
          fontSize: "0.7rem",
          color: active ? "#ff003c" : "#666",
          textShadow: active ? "0 0 5px #ff003c" : "none",
          margin: 0,
          transition: "all 0.3s",
        }}
      >
        {active ? "Status: ACTIVE (Obfuscated)" : "Status: Clearnet (Exposed)"}
      </p>
    </div>
  );
}

/* ================================================================
   SYSTEM STATUS BAR
   Shows backend health, AI status, version info
   ================================================================ */
function SystemStatusBar({ user }) {
  const [backendStatus, setBackendStatus] = useState("checking");
  const [agentCount, setAgentCount] = useState(0);
  const [uptime, setUptime] = useState(null);

  const checkHealth = useCallback(async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(
        `${process.env.REACT_APP_API_URL || "http://localhost:8000"}/api/analytics/health`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setBackendStatus("online");
        setAgentCount(data.active_agents ?? data.agents?.active ?? 0);
        setUptime(data.uptime_seconds ?? null);
      } else {
        setBackendStatus("degraded");
      }
    } catch {
      setBackendStatus("offline");
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  const statusColor =
    backendStatus === "online"
      ? "var(--neon-green)"
      : backendStatus === "degraded"
      ? "var(--neon-yellow)"
      : "var(--neon-red)";

  const formatUptime = (seconds) => {
    if (!seconds) return "";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="system-status-bar">
      <div className="status-bar-left">
        <div className="status-indicator" style={{ "--status-color": statusColor }}>
          <MdCircle className="status-pulse" />
          <span className="status-text">
            {backendStatus === "online"
              ? "AI ONLINE"
              : backendStatus === "degraded"
              ? "DEGRADED"
              : "OFFLINE"}
          </span>
        </div>
        <div className="status-divider" />
        <span className="status-meta">
          <MdSmartToy style={{ fontSize: 14 }} /> {agentCount} Active Agents
        </span>
        {uptime && (
          <>
            <div className="status-divider" />
            <span className="status-meta">Uptime: {formatUptime(uptime)}</span>
          </>
        )}
      </div>
      <div className="status-bar-right">
        <span className="status-version">Autonomous v2.0</span>
        <span className="status-role">{user?.role?.toUpperCase()}</span>
      </div>
    </div>
  );
}

/* ================================================================
   AUTHORIZATION DISCLAIMER BANNER
   Legal notice for authorized security assessments only
   ================================================================ */
function AuthBanner() {
  const [dismissed, setDismissed] = useState(() => {
    return sessionStorage.getItem("auth_banner_dismissed") === "true";
  });

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("auth_banner_dismissed", "true");
  };

  if (dismissed) return null;

  return (
    <div className="auth-disclaimer-banner">
      <div className="auth-banner-content">
        <MdGavel className="auth-banner-icon" />
        <div className="auth-banner-text">
          <strong>Authorized Use Only</strong> — This platform is intended for
          authorized security assessments and penetration testing only. Unauthorized
          access to computer systems is a violation of the Computer Fraud and Abuse
          Act (CFAA), the Computer Misuse Act (CMA), and equivalent laws in your
          jurisdiction. By using Autonomous, you confirm that you have explicit written
          authorization to test the target systems.
        </div>
        <button className="auth-banner-dismiss" onClick={handleDismiss} title="Dismiss">
          <MdClose />
        </button>
      </div>
    </div>
  );
}

/* ================================================================
   MOBILE BOTTOM NAV
   Shown only on screens <= 480px
   ================================================================ */
function BottomNav() {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const primaryLinks = [
    { to: "/", icon: <MdDashboard />, label: "Dashboard", exact: true },
    { to: "/arsenal", icon: <MdSecurity />, label: "Arsenal" },
    { to: "/playbooks", icon: <MdPlaylistPlay />, label: "Ops" },
    { to: "/terminal", icon: <MdTerminal />, label: "Terminal" },
  ];

  const moreLinks = [
    { to: "/missions", icon: <MdRocketLaunch />, label: "Missions" },
    { to: "/agents", icon: <MdSmartToy />, label: "Agents" },
    { to: "/banter", icon: <MdChat />, label: "Banter" },
    { to: "/analytics", icon: <MdBarChart />, label: "Analytics" },
    { to: "/lab", icon: <MdBuild />, label: "Agent Lab" },
    { to: "/knowledge", icon: <MdAccountTree />, label: "Intel Graph" },
    { to: "/osint", icon: <MdPersonSearch />, label: "OSINT" },
  ];

  const isActive = (to, exact) =>
    exact ? location.pathname === to : location.pathname.startsWith(to);

  const isMoreActive = moreLinks.some((l) => isActive(l.to, false));

  return (
    <>
      {moreOpen && (
        <div className="bottom-nav-more-overlay" onClick={() => setMoreOpen(false)}>
          <div className="bottom-nav-more-menu" onClick={(e) => e.stopPropagation()}>
            {moreLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={`bottom-nav-more-item ${isActive(link.to, false) ? "active" : ""}`}
                onClick={() => setMoreOpen(false)}
              >
                {link.icon}
                <span>{link.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      )}
      <nav className="bottom-nav">
        {primaryLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.exact}
            className={`bottom-nav-item ${isActive(link.to, link.exact) ? "active" : ""}`}
          >
            {link.icon}
            <span>{link.label}</span>
          </NavLink>
        ))}
        <button
          className={`bottom-nav-item ${isMoreActive || moreOpen ? "active" : ""}`}
          onClick={() => setMoreOpen(!moreOpen)}
        >
          <MdMoreHoriz />
          <span>More</span>
        </button>
      </nav>
    </>
  );
}

/* ================================================================
   LAYOUT COMPONENT
   ================================================================ */
export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 480);
  const [isTablet, setIsTablet] = useState(
    window.innerWidth > 480 && window.innerWidth <= 768
  );

  useEffect(() => {
    const handleRouteChange = () => setSidebarOpen(false);
    window.addEventListener("popstate", handleRouteChange);
    return () => window.removeEventListener("popstate", handleRouteChange);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      setIsMobile(w <= 480);
      setIsTablet(w > 480 && w <= 768);
      if (w > 768) setSidebarOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!isTablet) return;
    const handleClickOutside = (e) => {
      const sidebar = document.querySelector(".sidebar");
      const menuBtn = document.querySelector(".mobile-menu-btn");
      if (
        sidebar &&
        !sidebar.contains(e.target) &&
        !menuBtn?.contains(e.target)
      ) {
        setSidebarOpen(false);
      }
    };
    if (sidebarOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [sidebarOpen, isTablet]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className={`app-layout ${isMobile ? "mobile-layout" : ""}`}>
      {/* Tablet menu button */}
      {isTablet && (
        <button
          className="mobile-menu-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle menu"
        >
          {sidebarOpen ? <MdClose size={24} /> : <MdMenu size={24} />}
        </button>
      )}

      {/* Sidebar overlay for tablet */}
      {isTablet && sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Desktop/Tablet Sidebar — hidden on mobile */}
      {!isMobile && (
        <aside className={`sidebar ${sidebarOpen ? "mobile-open" : ""}`}>
          <div className="sidebar-logo">
            <img
              src="/logo192.png"
              alt="Autonomous"
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                filter: "drop-shadow(0 0 10px var(--neon-cyan))",
              }}
            />
            <h1>Autonomous</h1>
          </div>

          <nav className="sidebar-nav">
            <NavLink to="/" end onClick={() => setSidebarOpen(false)}>
              <MdDashboard /> <span>Autonomous View</span>
            </NavLink>
            <NavLink to="/missions" onClick={() => setSidebarOpen(false)}>
              <MdRocketLaunch /> <span>Missions</span>
            </NavLink>
            <NavLink to="/agents" onClick={() => setSidebarOpen(false)}>
              <MdSmartToy /> <span>Agents</span>
            </NavLink>
            <NavLink to="/banter" onClick={() => setSidebarOpen(false)}>
              <MdChat /> <span>Banter</span>
            </NavLink>
            <NavLink to="/analytics" onClick={() => setSidebarOpen(false)}>
              <MdBarChart /> <span>Analytics</span>
            </NavLink>

            <div className="sidebar-section-label">Operations</div>

            <NavLink to="/arsenal" onClick={() => setSidebarOpen(false)}>
              <MdSecurity /> <span>Tool Arsenal</span>
            </NavLink>
            <NavLink to="/playbooks" onClick={() => setSidebarOpen(false)}>
              <MdPlaylistPlay /> <span>Playbooks</span>
            </NavLink>
            <NavLink to="/terminal" onClick={() => setSidebarOpen(false)}>
              <MdTerminal /> <span>Terminal</span>
            </NavLink>
            <NavLink to="/knowledge" onClick={() => setSidebarOpen(false)}>
              <MdAccountTree /> <span>Intel Graph</span>
            </NavLink>
            <NavLink to="/osint" onClick={() => setSidebarOpen(false)}>
              <MdPersonSearch /> <span>OSINT</span>
            </NavLink>

            <div className="sidebar-section-label">System</div>

            <NavLink to="/lab" onClick={() => setSidebarOpen(false)}>
              <MdBuild /> <span>Agent Lab</span>
            </NavLink>

            <div style={{ flex: 1 }} />

            <button onClick={handleLogout}>
              <MdLogout /> <span>Logout</span>
            </button>
          </nav>

          <GhostProtocolWidget />

          {user && (
            <div className="sidebar-user">
              <div className="avatar">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div className="user-info">
                <div className="name">{user.username}</div>
                <div className="role">{user.role}</div>
              </div>
            </div>
          )}
        </aside>
      )}

      <main className={`main-content ${isMobile ? "main-content-mobile" : ""}`}>
        {/* System Status Bar */}
        <SystemStatusBar user={user} />

        {/* Authorization Disclaimer Banner */}
        <AuthBanner />

        {/* Utility Controls */}
        <div style={{ position: "relative" }}>
          <VoiceControl />
          <NotificationCenter />
          <MemorySearch />
        </div>

        <Outlet />
      </main>

      {/* Mobile Bottom Nav */}
      {isMobile && <BottomNav />}
    </div>
  );
}
