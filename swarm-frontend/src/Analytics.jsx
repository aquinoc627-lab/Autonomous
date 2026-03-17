import React from "react";
import { useQuery } from "@tanstack/react-query";
import { analyticsAPI } from "./api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";

const NEON_COLORS = ["#00f0ff", "#39ff14", "#bf00ff", "#ff6b00", "#ffe600", "#ff006e"];

const STATUS_COLORS = {
  active: "#00f0ff",
  idle: "#ffe600",
  offline: "#5a6577",
  error: "#ff0040",
  pending: "#ffe600",
  in_progress: "#00f0ff",
  completed: "#39ff14",
  failed: "#ff0040",
  cancelled: "#5a6577",
};

export default function Analytics() {
  const { data: overview } = useQuery({
    queryKey: ["overview"],
    queryFn: () => analyticsAPI.overview().then((r) => r.data),
    refetchInterval: 15000,
  });

  const { data: activity } = useQuery({
    queryKey: ["activity"],
    queryFn: () => analyticsAPI.activity().then((r) => r.data),
    refetchInterval: 15000,
  });

  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: () => analyticsAPI.health().then((r) => r.data),
    refetchInterval: 15000,
  });

  // Transform data for charts
  const agentStatusData = overview?.agent_statuses
    ? Object.entries(overview.agent_statuses).map(([name, value]) => ({ name, value }))
    : [];

  const missionStatusData = overview?.mission_statuses
    ? Object.entries(overview.mission_statuses).map(([name, value]) => ({ name: name.replace("_", " "), value }))
    : [];

  const missionPriorityData = overview?.mission_priorities
    ? Object.entries(overview.mission_priorities).map(([name, value]) => ({ name, value }))
    : [];

  const dailyActivity = activity?.daily_activity || [];

  const banterTypeData = activity?.banter_by_type
    ? Object.entries(activity.banter_by_type).map(([name, value]) => ({ name, value }))
    : [];

  const tooltipStyle = {
    contentStyle: {
      background: "#1a1f2e",
      border: "1px solid #2a3040",
      borderRadius: 8,
      color: "#e0e6ed",
      fontSize: 12,
    },
  };

  return (
    <div>
      <div className="page-header">
        <h2>Analytics Dashboard</h2>
        <p>Advanced metrics and system health monitoring</p>
      </div>

      {/* Health Gauges */}
      <div className="panel-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon cyan" style={{ fontSize: 14, fontWeight: 700 }}>
            {health?.agent_availability || 0}%
          </div>
          <div>
            <div className="stat-value" style={{ fontSize: 18 }}>Agent Availability</div>
            <div className="stat-label">Active + Idle agents</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green" style={{ fontSize: 14, fontWeight: 700 }}>
            {health?.mission_completion_rate || 0}%
          </div>
          <div>
            <div className="stat-value" style={{ fontSize: 18 }}>Mission Completion</div>
            <div className="stat-label">Completed / Total</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple" style={{ fontSize: 14, fontWeight: 700 }}>
            {health?.websocket_connections || 0}
          </div>
          <div>
            <div className="stat-value" style={{ fontSize: 18 }}>Live Connections</div>
            <div className="stat-label">Active WebSocket clients</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">
            <span className={`badge ${health?.status === "operational" ? "completed" : "error"}`}>
              {health?.status || "unknown"}
            </span>
          </div>
          <div>
            <div className="stat-value" style={{ fontSize: 18 }}>System Status</div>
            <div className="stat-label">Overall health</div>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div style={{ display: "grid", gridTemplateColumns: window.innerWidth <= 768 ? "1fr" : "2fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Activity Timeline */}
        <div className="panel">
          <div className="panel-header"><h3>7-Day Activity</h3></div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={dailyActivity}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a3040" />
              <XAxis dataKey="date" stroke="#5a6577" tick={{ fontSize: 11 }} />
              <YAxis stroke="#5a6577" tick={{ fontSize: 11 }} />
              <Tooltip {...tooltipStyle} />
              <Legend />
              <Area type="monotone" dataKey="missions" stroke="#00f0ff" fill="rgba(0,240,255,0.1)" strokeWidth={2} />
              <Area type="monotone" dataKey="banter" stroke="#bf00ff" fill="rgba(191,0,255,0.1)" strokeWidth={2} />
              <Area type="monotone" dataKey="assignments" stroke="#39ff14" fill="rgba(57,255,20,0.1)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Agent Status Pie */}
        <div className="panel">
          <div className="panel-header"><h3>Agent Status</h3></div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={agentStatusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={{ stroke: "#5a6577" }}
              >
                {agentStatusData.map((entry, i) => (
                  <Cell key={i} fill={STATUS_COLORS[entry.name] || NEON_COLORS[i % NEON_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip {...tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div style={{ display: "grid", gridTemplateColumns: window.innerWidth <= 768 ? "1fr" : "1fr 1fr 1fr", gap: 16 }}>
        {/* Mission Status */}
        <div className="panel">
          <div className="panel-header"><h3>Mission Status</h3></div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={missionStatusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a3040" />
              <XAxis dataKey="name" stroke="#5a6577" tick={{ fontSize: 10 }} />
              <YAxis stroke="#5a6577" tick={{ fontSize: 11 }} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {missionStatusData.map((entry, i) => (
                  <Cell key={i} fill={STATUS_COLORS[entry.name.replace(" ", "_")] || NEON_COLORS[i % NEON_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Mission Priority */}
        <div className="panel">
          <div className="panel-header"><h3>Mission Priority</h3></div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={missionPriorityData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={{ stroke: "#5a6577" }}
              >
                {missionPriorityData.map((_, i) => (
                  <Cell key={i} fill={NEON_COLORS[i % NEON_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip {...tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Banter by Type */}
        <div className="panel">
          <div className="panel-header"><h3>Banter by Type</h3></div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={banterTypeData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#2a3040" />
              <XAxis type="number" stroke="#5a6577" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" stroke="#5a6577" tick={{ fontSize: 11 }} width={90} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {banterTypeData.map((_, i) => (
                  <Cell key={i} fill={NEON_COLORS[i % NEON_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
