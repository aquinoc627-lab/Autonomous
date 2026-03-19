import React, { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import NotificationCenter from "./NotificationCenter";
import VoiceControl from "./VoiceControl";
import MemorySearch from "./MemorySearch";
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
} from "react-icons/md";

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Close sidebar on route change
  useEffect(() => {
    const handleRouteChange = () => setSidebarOpen(false);
    window.addEventListener("popstate", handleRouteChange);
    return () => window.removeEventListener("popstate", handleRouteChange);
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    if (!isMobile) return;
    const handleClickOutside = (e) => {
      const sidebar = document.querySelector(".sidebar");
      const menuBtn = document.querySelector(".mobile-menu-btn");
      if (sidebar && !sidebar.contains(e.target) && !menuBtn?.contains(e.target)) {
        setSidebarOpen(false);
      }
    };
    if (sidebarOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [sidebarOpen, isMobile]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="app-layout">
      {/* Mobile menu button */}
      {isMobile && (
        <button
          className="mobile-menu-btn"
          onClick={toggleSidebar}
          aria-label="Toggle menu"
        >
          {sidebarOpen ? <MdClose size={24} /> : <MdMenu size={24} />}
        </button>
      )}

      {/* Sidebar overlay for mobile */}
      {isMobile && sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`sidebar ${sidebarOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-logo">
          <MdSmartToy style={{ fontSize: 24, color: "var(--neon-cyan)" }} />
          <h1>SWARM SUITE</h1>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/" end onClick={() => setSidebarOpen(false)}>
            <MdDashboard /> <span>Swarm View</span>
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
          <NavLink to="/lab" onClick={() => setSidebarOpen(false)}>
            <MdBuild /> <span>Agent Lab</span>
          </NavLink>

          <div style={{ flex: 1 }} />

          <button onClick={handleLogout}>
            <MdLogout /> <span>Logout</span>
          </button>
        </nav>

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

      <main className="main-content">
        <div style={{ position: "relative" }}>
          <VoiceControl />
          <NotificationCenter />
          <MemorySearch />
        </div>
        <Outlet />
      </main>
    </div>
  );
}
