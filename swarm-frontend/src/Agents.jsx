import React, { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { agentsAPI } from "./api";
import { useAuth } from "./AuthContext";
import { useWebSocket } from "./useWebSocket";
import { MdAdd, MdEdit, MdDelete } from "react-icons/md";

const STATUSES = ["idle", "active", "offline", "error"];

export default function Agents() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editAgent, setEditAgent] = useState(null);
  const [detailAgent, setDetailAgent] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");

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

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2>Agent Control</h2>
          <p>Manage swarm agents and their assignments</p>
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
          <div key={agent.id} className="panel" style={{ cursor: "pointer" }} onClick={() => setDetailAgent(agent)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>{agent.name}</h3>
              <span className={`badge ${agent.status}`}>
                <span className="dot" />{agent.status}
              </span>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 12 }}>
              {agent.description || "No description"}
            </p>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); setEditAgent(agent); }}>
                <MdEdit /> Edit
              </button>
              {isAdmin && (
                <button className="btn btn-danger btn-sm" onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Delete agent "${agent.name}"?`)) deleteMut.mutate(agent.id);
                }}>
                  <MdDelete /> Delete
                </button>
              )}
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

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ name, description, status });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea className="form-textarea" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 550 }}>
        <h3>{agent.name}</h3>
        <div style={{ marginBottom: 16 }}>
          <span className={`badge ${agent.status}`}><span className="dot" />{agent.status}</span>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 8 }}>{agent.description || "No description"}</p>
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
