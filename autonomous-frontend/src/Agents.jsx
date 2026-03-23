import React, { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { agentsAPI } from "./api";
import { useAuth } from "./AuthContext";
import { useWebSocket } from "./useWebSocket";
import { useToast } from "./ToastContext";
import AgentAvatar from "./AgentAvatar";
import { MdAdd, MdEdit, MdDelete, MdPsychology } from "react-icons/md";
import axios from "axios";

const STATUSES = ["idle", "active", "offline", "error"];
const ICONS = ["shield", "crosshair", "eye", "brain", "bolt", "satellite"];
const VOICE_STYLES = ["neutral", "assertive", "calm", "urgent"];
const COLORS = ["#00f0ff", "#39ff14", "#ff006e", "#bf00ff", "#ff6b00", "#ffe600"];

export default function Agents() {
  const { isAdmin } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editAgent, setEditAgent] = useState(null);
  const [detailAgent, setDetailAgent] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [triggering, setTriggering] = useState({});

  const onWsMessage = useCallback(
    (msg) => {
      if (msg.event?.startsWith("agent")) {
        queryClient.invalidateQueries({ queryKey: ["agents"] });
      }
    },
    [queryClient]
  );
  useWebSocket(onWsMessage);

  const { data: agents } = useQuery({
    queryKey: ["agents", statusFilter],
    queryFn: () =>
      agentsAPI.list(statusFilter ? { status: statusFilter } : {}).then((r) => r.data),
  });

  const createMut = useMutation({
    mutationFn: (data) => agentsAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      setShowCreate(false);
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => agentsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      setEditAgent(null);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => agentsAPI.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agents"] }),
  });

  const handleTriggerBrain = async (e, agent) => {
    e.stopPropagation();
    if (agent.status !== "active") {
      addToast({ type: "warning", title: "Agent Offline", message: "Agent must be 'active' to use the Brain." });
      return;
    }

    setTriggering(prev => ({ ...prev, [agent.id]: true }));
    try {
      const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";
      const token = localStorage.getItem("access_token");
      
      // We'll add a specific trigger endpoint to the backend agents router
      await axios.post(`${API_BASE}/api/agents/${agent.id}/think`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      addToast({ 
        type: "success", 
        title: "Brain Triggered", 
        message: `${agent.name} is now reasoning...` 
      });
    } catch (err) {
      console.error("Failed to trigger brain", err);
      addToast({ type: "error", title: "Error", message: "Failed to trigger agent brain." });
    } finally {
      setTriggering(prev => ({ ...prev, [agent.id]: false }));
    }
  };

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2>Agent Control</h2>
          <p>Manage Autonomous agents, personas, and their autonomous brains</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <MdAdd /> New Agent
        </button>
      </div>

      {/* Filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button className={`btn ${statusFilter === "" ? "btn-primary" : "btn-secondary"} btn-sm`} onClick={() => setStatusFilter("")}>All</button>
        {STATUSES.map((s) => (
          <button key={s} className={`btn ${statusFilter === s ? "btn-primary" : "btn-secondary"} btn-sm`} onClick={() => setStatusFilter(s)}>{s}</button>
        ))}
      </div>

      {/* Agent Cards Grid */}
      <div className="panel-grid">
        {agents?.map((agent) => (
          <div key={agent.id} className="panel" style={{ cursor: "pointer", textAlign: "center" }} onClick={() => setDetailAgent(agent)}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
              <AgentAvatar agent={agent} size={72} showLabel={false} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: agent.persona?.avatar_color || "var(--neon-cyan)" }}>
              {agent.name}
            </h3>
            <div style={{ marginBottom: 8 }}>
              <span className={`badge ${agent.status}`}>
                <span className="dot" />{agent.status}
              </span>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: 12, marginBottom: 4 }}>
              {agent.persona?.personality || "No personality set"}
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: 11, marginBottom: 12 }}>
              Voice: {agent.persona?.voice_style || "neutral"}
            </p>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button 
                className={`btn btn-block ${triggering[agent.id] ? "btn-secondary" : "btn-primary"} btn-sm`}
                onClick={(e) => handleTriggerBrain(e, agent)}
                disabled={triggering[agent.id] || agent.status !== "active"}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
              >
                <MdPsychology size={16} /> {triggering[agent.id] ? "Thinking..." : "Trigger Brain"}
              </button>
              
              <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={(e) => { e.stopPropagation(); setEditAgent(agent); }}>
                  <MdEdit /> Edit
                </button>
                {isAdmin && (
                  <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Delete agent "${agent.name}"?`)) deleteMut.mutate(agent.id);
                  }}>
                    <MdDelete /> Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {agents?.length === 0 && (
          <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 40 }}>No agents found</div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <AgentFormModal
          title="Create Agent"
          onClose={() => setShowCreate(false)}
          onSubmit={(data) => createMut.mutate(data)}
          loading={createMut.isPending}
        />
      )}

      {/* Edit Modal */}
      {editAgent && (
        <AgentFormModal
          title="Edit Agent"
          initial={editAgent}
          onClose={() => setEditAgent(null)}
          onSubmit={(data) => updateMut.mutate({ id: editAgent.id, data })}
          loading={updateMut.isPending}
        />
      )}

      {/* Detail Modal */}
      {detailAgent && (
        <AgentDetailModal agent={detailAgent} onClose={() => setDetailAgent(null)} />
      )}
    </div>
  );
}

function AgentFormModal({ title, initial, onClose, onSubmit, loading }) {
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [status, setStatus] = useState(initial?.status || "idle");
  const [avatarColor, setAvatarColor] = useState(initial?.persona?.avatar_color || "#00f0ff");
  const [icon, setIcon] = useState(initial?.persona?.icon || "shield");
  const [personality, setPersonality] = useState(initial?.persona?.personality || "");
  const [voiceStyle, setVoiceStyle] = useState(initial?.persona?.voice_style || "neutral");

  // Preview agent for the avatar
  const previewAgent = {
    name,
    status,
    persona: { avatar_color: avatarColor, icon, personality, voice_style: voiceStyle },
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      name,
      description,
      status,
      persona: {
        avatar_color: avatarColor,
        icon,
        personality: personality || "Unknown",
        voice_style: voiceStyle,
      },
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <h3>{title}</h3>
        <form onSubmit={handleSubmit}>
          {/* Avatar Preview */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <AgentAvatar agent={previewAgent} size={80} showLabel speaking={status === "active"} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="form-group">
              <label>Name</label>
              <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea className="form-textarea" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>

          <div style={{ borderTop: "1px solid var(--border-color)", margin: "12px 0", paddingTop: 12 }}>
            <h4 style={{ fontSize: 13, color: "var(--neon-cyan)", marginBottom: 10 }}>Persona Configuration</h4>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="form-group">
              <label>Avatar Color</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {COLORS.map((c) => (
                  <div
                    key={c}
                    onClick={() => setAvatarColor(c)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: c,
                      cursor: "pointer",
                      border: avatarColor === c ? "2px solid #fff" : "2px solid transparent",
                      boxShadow: avatarColor === c ? `0 0 8px ${c}` : "none",
                    }}
                  />
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>Icon</label>
              <select className="form-select" value={icon} onChange={(e) => setIcon(e.target.value)}>
                {ICONS.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="form-group">
              <label>Personality Trait</label>
              <input className="form-input" value={personality} onChange={(e) => setPersonality(e.target.value)} placeholder="e.g., Stealthy & Precise" />
            </div>
            <div className="form-group">
              <label>Voice Style</label>
              <select className="form-select" value={voiceStyle} onChange={(e) => setVoiceStyle(e.target.value)}>
                {VOICE_STYLES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AgentDetailModal({ agent, onClose }) {
  const { data: missions } = useQuery({
    queryKey: ["agent-missions", agent.id],
    queryFn: () => agentsAPI.missions(agent.id).then((r) => r.data),
  });

  const persona = agent.persona || {};

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
        <div style={{ display: "flex", gap: 20, marginBottom: 16 }}>
          <AgentAvatar agent={agent} size={100} speaking={agent.status === "active"} />
          <div style={{ flex: 1 }}>
            <h3 style={{ color: persona.avatar_color || "var(--neon-cyan)" }}>{agent.name}</h3>
            <span className={`badge ${agent.status}`}><span className="dot" />{agent.status}</span>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 8 }}>{agent.description || "No description"}</p>
            <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>
              <span>Personality: <strong style={{ color: "var(--text-primary)" }}>{persona.personality || "Unknown"}</strong></span>
              <span>Voice: <strong style={{ color: "var(--text-primary)" }}>{persona.voice_style || "neutral"}</strong></span>
            </div>
          </div>
        </div>

        <h4 style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 8 }}>Assigned Missions</h4>
        {missions?.length ? (
          <table className="data-table">
            <thead><tr><th>Mission</th><th>Status</th><th>Priority</th></tr></thead>
            <tbody>
              {missions.map((m) => (
                <tr key={m.id}>
                  <td>{m.name}</td>
                  <td><span className={`badge ${m.status}`}>{m.status.replace("_", " ")}</span></td>
                  <td><span className={`badge ${m.priority}`}>{m.priority}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No missions assigned</p>
        )}
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
