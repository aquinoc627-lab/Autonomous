/**
 * Autonomous — Notification Center
 *
 * A slide-out panel accessible from the top bar that shows:
 *   - Recent notifications (from WebSocket events)
 *   - Online users (presence)
 *   - Autonomous Mode toggle
 */

import React, { useState, useEffect, useCallback } from "react";
import { useWebSocket } from "./useWebSocket";
import { useToast } from "./ToastContext";
import { autonomousAPI } from "./api";

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [unread, setUnread] = useState(0);
  const [autonomousEnabled, setAutonomousEnabled] = useState(false);
  const { addToast } = useToast();

  // Fetch initial autonomous status
  useEffect(() => {
    autonomousAPI.getStatus()
      .then(res => setAutonomousEnabled(res.data.enabled))
      .catch(err => console.error("Failed to fetch autonomous status", err));
  }, []);

  const handleWsMessage = useCallback(
    (data) => {
      // Handle presence events
      if (data.event === "user_joined" || data.event === "user_left") {
        if (data.data?.online_users) {
          setOnlineUsers(data.data.online_users);
        }
        const user = data.data?.user;
        if (user) {
          const action = data.event === "user_joined" ? "came online" : "went offline";
          addToast({
            type: "info",
            title: "Presence",
            message: `${user.username} ${action}`,
            duration: 3000,
          });
        }
        return;
      }

      if (data.event === "presence") {
        if (data.data?.online_users) {
          setOnlineUsers(data.data.online_users);
        }
        return;
      }

      // Handle entity events as notifications
      const eventMap = {
        agent_created: { type: "success", title: "Agent Created" },
        agent_updated: { type: "info", title: "Agent Updated" },
        agent_deleted: { type: "warning", title: "Agent Deleted" },
        mission_created: { type: "success", title: "Mission Created" },
        mission_updated: { type: "info", title: "Mission Updated" },
        mission_deleted: { type: "warning", title: "Mission Deleted" },
        banter_created: { type: "info", title: "New Banter" },
        banter_deleted: { type: "warning", title: "Banter Deleted" },
        agent_assigned: { type: "success", title: "Agent Assigned" },
        agent_revoked: { type: "warning", title: "Agent Revoked" },
      };

      const meta = eventMap[data.event];
      if (meta) {
        const entityData = data.data || {};
        const message =
          entityData.name ||
          entityData.message?.substring(0, 80) ||
          entityData.id ||
          data.event;

        const notification = {
          id: Date.now() + Math.random(),
          ...meta,
          message,
          timestamp: new Date(),
        };

        setNotifications((prev) => [notification, ...prev].slice(0, 50));
        setUnread((prev) => prev + 1);

        // Also show as toast
        addToast({ ...meta, message, duration: 4000 });
      }
    },
    [addToast]
  );

  const { connected } = useWebSocket(handleWsMessage);

  const toggleOpen = () => {
    setOpen((prev) => !prev);
    if (!open) setUnread(0);
  };

  const clearAll = () => {
    setNotifications([]);
    setUnread(0);
  };

  const handleToggleAutonomous = async () => {
    const newState = !autonomousEnabled;
    try {
      await autonomousAPI.toggle(newState);
      setAutonomousEnabled(newState);
      addToast({
        type: newState ? "success" : "warning",
        title: "Autonomous Mode",
        message: `Agent Brain is now ${newState ? "ONLINE" : "OFFLINE"}`,
        duration: 3000,
      });
    } catch (err) {
      addToast({
        type: "error",
        title: "Error",
        message: "Failed to toggle autonomous mode",
        duration: 3000,
      });
    }
  };

  return (
    <>
      {/* Top bar with notification bell and presence */}
      <div className="topbar">
        <div className="topbar-left">
          <div className="ws-indicator">
            <span className={`ws-dot ${connected ? "connected" : ""}`} />
            {connected ? "Live" : "Reconnecting..."}
          </div>
          <div className="presence-indicator">
            <span className="presence-dot" />
            {onlineUsers.length} online
          </div>
          <div className={`autonomous-status ${autonomousEnabled ? "active" : ""}`}>
            <span className="autonomous-dot" />
            Brain: {autonomousEnabled ? "ONLINE" : "OFFLINE"}
          </div>
        </div>
        <div className="topbar-right">
          <button className="notification-bell" onClick={toggleOpen}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unread > 0 && <span className="notification-badge">{unread > 9 ? "9+" : unread}</span>}
          </button>
        </div>
      </div>

      {/* Slide-out panel */}
      {open && (
        <div className="notification-overlay" onClick={toggleOpen}>
          <div className="notification-panel" onClick={(e) => e.stopPropagation()}>
            <div className="notification-panel-header">
              <h3>System Control</h3>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-sm btn-secondary" onClick={clearAll}>
                  Clear All
                </button>
                <button className="btn btn-sm btn-secondary" onClick={toggleOpen}>
                  &times;
                </button>
              </div>
            </div>

            {/* Autonomous Mode Toggle */}
            <div className="notification-section">
              <h4>Autonomous Mode</h4>
              <div className="autonomous-control">
                <div className="control-info">
                  <p>When enabled, agents will autonomously reason about missions and communicate in the Banter feed.</p>
                </div>
                <button 
                  className={`btn btn-block ${autonomousEnabled ? "btn-danger" : "btn-primary"}`}
                  onClick={handleToggleAutonomous}
                >
                  {autonomousEnabled ? "Disable Agent Brain" : "Enable Agent Brain"}
                </button>
              </div>
            </div>

            {/* Online Users Section */}
            <div className="notification-section">
              <h4>Online Users ({onlineUsers.length})</h4>
              <div className="online-users-list">
                {onlineUsers.length === 0 ? (
                  <div className="empty-state">No users currently online</div>
                ) : (
                  onlineUsers.map((u) => (
                    <div key={u.id} className="online-user-item">
                      <span className="online-dot" />
                      <span className="online-username">{u.username}</span>
                      <span className={`badge ${u.role}`}>{u.role}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Notifications Section */}
            <div className="notification-section">
              <h4>Recent Activity</h4>
              <div className="notification-list">
                {notifications.length === 0 ? (
                  <div className="empty-state">No notifications yet</div>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className={`notification-item notification-${n.type}`}>
                      <div className="notification-title">{n.title}</div>
                      <div className="notification-message">{n.message}</div>
                      <div className="notification-time">
                        {n.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
