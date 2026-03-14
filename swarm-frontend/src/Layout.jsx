import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import {
  MdDashboard,
  MdRocketLaunch,
  MdSmartToy,
  MdChat,
  MdBarChart,
  MdLogout,
} from "react-icons/md";

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <MdSmartToy style={{ fontSize: 24, color: "var(--neon-cyan)" }} />
          <h1>SWARM SUITE</h1>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/" end>
            <MdDashboard /> <span>Swarm View</span>
          </NavLink>
          <NavLink to="/missions">
            <MdRocketLaunch /> <span>Missions</span>
          </NavLink>
          <NavLink to="/agents">
            <MdSmartToy /> <span>Agents</span>
          </NavLink>
          <NavLink to="/banter">
            <MdChat /> <span>Banter</span>
          </NavLink>
          <NavLink to="/analytics">
            <MdBarChart /> <span>Analytics</span>
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
        <Outlet />
      </main>
    </div>
  );
}
