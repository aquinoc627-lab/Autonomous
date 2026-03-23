import React, { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { analyticsAPI, agentsAPI, missionsAPI, banterAPI } from "./api";
import { useWebSocket } from "./useWebSocket";
import AgentAvatar from "./AgentAvatar";
import { Hologram3DCanvas } from "./Hologram3D";
import HiveGraph from "./AutonomousGraph";
import ARHologramViewer from "./Hologram3DXR";
import {
  MdSmartToy,
  MdRocketLaunch,
  MdChat,
  MdPeople,
  MdHub,
  MdGridView,
  MdViewInAr,
} from "react-icons/md";

export default function HiveView() {
  const queryClient = useQueryClient();
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [activeTab, setActiveTab] = useState("grid"); // "grid" or "collaboration"
  const [arMode, setArMode] = useState(false);
  const [arAgent, setArAgent] = useState(null);

  const onWsMessage = useCallback(
    (msg) => {
      if (msg.event) {
        queryClient.invalidateQueries({ queryKey: ["overview"] });
        queryClient.invalidateQueries({ queryKey: ["agents"] });
        queryClient.invalidateQueries({ queryKey: ["missions"] });
        queryClient.invalidateQueries({ queryKey: ["recent-banter"] });
      }
    },
    [queryClient]
  );

  const { connected } = useWebSocket(onWsMessage);

  const { data: overview } = useQuery({
    queryKey: ["overview"],
    queryFn: () => analyticsAPI.overview().then((r) => r.data),
    refetchInterval: 15000,
  });

  const { data: agents } = useQuery({
    queryKey: ["agents"],
    queryFn: () => agentsAPI.list().then((r) => r.data),
  });

  const { data: missions } = useQuery({
    queryKey: ["missions"],
    queryFn: () => missionsAPI.list().then((r) => r.data),
  });

  // Fetch recent banter to determine which agents are "speaking"
  const { data: recentBanter } = useQuery({
    queryKey: ["recent-banter"],
    queryFn: () => banterAPI.list({ limit: 20 }).then((r) => r.data),
    refetchInterval: 5000,
  });

  // Determine speaking agents (those with banter in last 60 seconds)
  const speakingAgentIds = useMemo(() => {
    if (!recentBanter) return new Set();
    const cutoff = Date.now() - 60000;
    const ids = new Set();
    for (const b of recentBanter) {
      if (b.agent_id && new Date(b.created_at).getTime() > cutoff) {
        ids.add(b.agent_id);
      }
    }
    return ids;
  }, [recentBanter]);

  // Determine listening agents (active agents assigned to in-progress missions)
  const listeningAgentIds = useMemo(() => {
    if (!agents || !missions) return new Set();
    const ids = new Set();
    for (const a of agents) {
      if (a.status === "active" && !speakingAgentIds.has(a.id)) {
        ids.add(a.id);
      }
    }
    return ids;
  }, [agents, missions, speakingAgentIds]);

  const totals = overview?.totals || {};

  return (
    <div>
      <div className="page-header">
        <h2>Autonomous View</h2>
        <p>
          Real-time overview of agents and missions&nbsp;
          <span className="ws-indicator">
            <span className={`ws-dot ${connected ? "connected" : ""}`} />
            {connected ? "Live" : "Reconnecting..."}
          </span>
        </p>
      </div>

      {/* Stat Cards */}
      <div className="panel-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon cyan"><MdSmartToy /></div>
          <div>
            <div className="stat-value">{totals.agents || 0}</div>
            <div className="stat-label">Total Agents</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><MdRocketLaunch /></div>
          <div>
            <div className="stat-value">{totals.missions || 0}</div>
            <div className="stat-label">Total Missions</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple"><MdChat /></div>
          <div>
            <div className="stat-value">{totals.banter || 0}</div>
            <div className="stat-label">Banter Messages</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><MdPeople /></div>
          <div>
            <div className="stat-value">{totals.users || 0}</div>
            <div className="stat-label">Users</div>
          </div>
        </div>
      </div>

      {/* View Tabs */}
      <div className="view-tabs" style={{ marginBottom: 24, display: "flex", gap: 12 }}>
        <button 
          className={`btn ${activeTab === "grid" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveTab("grid")}
          style={{ display: "flex", alignItems: "center", gap: 8 }}
        >
          <MdGridView /> Autonomous Grid
        </button>
        <button 
          className={`btn ${activeTab === "collaboration" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveTab("collaboration")}
          style={{ display: "flex", alignItems: "center", gap: 8 }}
        >
          <MdHub /> Collaboration Graph
        </button>
      </div>

      {activeTab === "grid" ? (
        <>
          {/* Animated Agent Autonomous Grid */}
          <div className="panel" style={{ marginBottom: 24 }}>
            <div className="panel-header">
              <h3>Agent Autonomous</h3>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Click an agent to inspect
              </span>
            </div>
            <div className="autonomous-grid">
              {agents?.map((agent) => (
                <div
                  key={agent.id}
                  className="autonomous-agent-cell"
                  onClick={() => setSelectedAgent(selectedAgent?.id === agent.id ? null : agent)}
                >
                  <AgentAvatar
                    agent={agent}
                    size={80}
                    speaking={speakingAgentIds.has(agent.id)}
                    listening={listeningAgentIds.has(agent.id)}
                    showLabel
                  />
                  <div className="agent-voice-tag">
                    {speakingAgentIds.has(agent.id)
                      ? "SPEAKING"
                      : listeningAgentIds.has(agent.id)
                      ? "LISTENING"
                      : agent.status === "offline"
                      ? "OFFLINE"
                      : agent.status === "error"
                      ? "ERROR"
                      : "STANDBY"}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Agent Detail */}
          {selectedAgent && (
            <div className="panel" style={{ marginBottom: 24 }}>
              <div className="panel-header">
                <h3>Agent Profile: {selectedAgent.name}</h3>
              </div>
              <div style={{ display: "flex", gap: 24, padding: "16px 0", flexDirection: window.innerWidth <= 480 ? "column" : "row", alignItems: window.innerWidth <= 480 ? "center" : "flex-start" }}>
                <AgentAvatar
                  agent={selectedAgent}
                  size={120}
                  speaking={speakingAgentIds.has(selectedAgent.id)}
                  listening={listeningAgentIds.has(selectedAgent.id)}
                />
                <div style={{ flex: 1 }}>
                  <table className="data-table" style={{ marginBottom: 16 }}>
                    <tbody>
                      <tr>
                        <td style={{ color: "var(--text-muted)", width: 120 }}>Status</td>
                        <td><span className={`badge ${selectedAgent.status}`}><span className="dot" />{selectedAgent.status}</span></td>
                      </tr>
                      <tr>
                        <td style={{ color: "var(--text-muted)" }}>Personality</td>
                        <td>{selectedAgent.persona?.personality || "Unknown"}</td>
                      </tr>
                      <tr>
                        <td style={{ color: "var(--text-muted)" }}>Voice Style</td>
                        <td style={{ textTransform: "capitalize" }}>{selectedAgent.persona?.voice_style || "neutral"}</td>
                      </tr>
                      <tr>
                        <td style={{ color: "var(--text-muted)" }}>Description</td>
                        <td>{selectedAgent.description || "No description"}</td>
                      </tr>
                      <tr>
                        <td style={{ color: "var(--text-muted)" }}>Activity</td>
                        <td>
                          {speakingAgentIds.has(selectedAgent.id)
                            ? "Currently transmitting banter"
                            : listeningAgentIds.has(selectedAgent.id)
                            ? "Monitoring active missions"
                            : "Idle / Standby"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setArAgent(selectedAgent);
                      setArMode(true);
                    }}
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <MdViewInAr /> View in AR
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mission Status Table */}
          <div className="panel">
            <div className="panel-header">
              <h3>Mission Status</h3>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Priority</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {missions?.map((m) => (
                  <tr key={m.id}>
                    <td>{m.name}</td>
                    <td>
                      <span className={`badge ${m.priority}`}>
                        {m.priority}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${m.status}`}>
                        <span className="dot" />
                        {m.status.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <HiveGraph />
      )}

      {/* AR Mode */}
      {arMode && arAgent && (
        <ARHologramViewer
          agent={arAgent}
          onClose={() => {
            setArMode(false);
            setArAgent(null);
          }}
        />
      )}
    </div>
  );
}
