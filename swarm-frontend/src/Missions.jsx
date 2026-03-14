import React, { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { missionsAPI, agentsAPI } from "./api";
import { useAuth } from "./AuthContext";
import { useWebSocket } from "./useWebSocket";
import { MdAdd, MdEdit, MdDelete, MdPersonAdd, MdPersonRemove } from "react-icons/md";

const STATUSES = ["pending", "in_progress", "completed", "failed", "cancelled"];
const PRIORITIES = ["low", "medium", "high", "critical"];

export default function Missions() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editMission, setEditMission] = useState(null);
  const [assignModal, setAssignModal] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");

  const onWsMessage = useCallback(
    (msg) => {
      if (msg.event?.startsWith("mission") || msg.event?.startsWith("agent")) {
        queryClient.invalidateQueries({ queryKey: ["missions"] });
      }
    },
    [queryClient]
  );
  useWebSocket(onWsMessage);

  const { data: missions } = useQuery({
    queryKey: ["missions", statusFilter],
    queryFn: () =>
      missionsAPI.list(statusFilter ? { status: statusFilter } : {}).then((r) => r.data),
  });

  const { data: allAgents } = useQuery({
    queryKey: ["agents"],
    queryFn: () => agentsAPI.list().then((r) => r.data),
  });

  const createMut = useMutation({
    mutationFn: (data) => missionsAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["missions"] });
      setShowCreate(false);
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => missionsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["missions"] });
      setEditMission(null);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => missionsAPI.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["missions"] }),
  });

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2>Mission Timeline</h2>
          <p>Manage and track all missions</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <MdAdd /> New Mission
        </button>
      </div>

      {/* Filter Bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button
          className={`btn ${statusFilter === "" ? "btn-primary" : "btn-secondary"} btn-sm`}
          onClick={() => setStatusFilter("")}
        >
          All
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            className={`btn ${statusFilter === s ? "btn-primary" : "btn-secondary"} btn-sm`}
            onClick={() => setStatusFilter(s)}
          >
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Missions Table */}
      <div className="panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {missions?.map((m) => (
              <tr key={m.id}>
                <td style={{ fontWeight: 600 }}>{m.name}</td>
                <td style={{ color: "var(--text-secondary)", maxWidth: 250, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {m.description || "—"}
                </td>
                <td><span className={`badge ${m.priority}`}>{m.priority}</span></td>
                <td>
                  <span className={`badge ${m.status}`}>
                    <span className="dot" />{m.status.replace("_", " ")}
                  </span>
                </td>
                <td style={{ color: "var(--text-muted)", fontSize: 12 }}>
                  {new Date(m.created_at).toLocaleDateString()}
                </td>
                <td>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditMission(m)} title="Edit">
                      <MdEdit />
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setAssignModal(m)} title="Assign Agents">
                      <MdPersonAdd />
                    </button>
                    {isAdmin && (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => { if (window.confirm("Delete this mission?")) deleteMut.mutate(m.id); }}
                        title="Delete"
                      >
                        <MdDelete />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {missions?.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--text-muted)", padding: 30 }}>No missions found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <MissionFormModal
          title="Create Mission"
          onClose={() => setShowCreate(false)}
          onSubmit={(data) => createMut.mutate(data)}
          loading={createMut.isPending}
        />
      )}

      {/* Edit Modal */}
      {editMission && (
        <MissionFormModal
          title="Edit Mission"
          initial={editMission}
          onClose={() => setEditMission(null)}
          onSubmit={(data) => updateMut.mutate({ id: editMission.id, data })}
          loading={updateMut.isPending}
        />
      )}

      {/* Assign Modal */}
      {assignModal && (
        <AssignModal
          mission={assignModal}
          allAgents={allAgents || []}
          onClose={() => setAssignModal(null)}
        />
      )}
    </div>
  );
}

function MissionFormModal({ title, initial, onClose, onSubmit, loading }) {
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [status, setStatus] = useState(initial?.status || "pending");
  const [priority, setPriority] = useState(initial?.priority || "medium");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ name, description, status, priority });
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="form-group">
              <label>Status</label>
              <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Priority</label>
              <select className="form-select" value={priority} onChange={(e) => setPriority(e.target.value)}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
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

function AssignModal({ mission, allAgents, onClose }) {
  const queryClient = useQueryClient();

  const { data: assigned } = useQuery({
    queryKey: ["mission-agents", mission.id],
    queryFn: () => missionsAPI.agents(mission.id).then((r) => r.data),
  });

  const assignMut = useMutation({
    mutationFn: (agentId) => missionsAPI.assign(mission.id, agentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mission-agents", mission.id] }),
  });

  const revokeMut = useMutation({
    mutationFn: (agentId) => missionsAPI.revoke(mission.id, agentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mission-agents", mission.id] }),
  });

  const assignedIds = new Set((assigned || []).map((a) => a.id));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Assign Agents to: {mission.name}</h3>
        <div style={{ maxHeight: 300, overflowY: "auto" }}>
          {allAgents.map((agent) => (
            <div
              key={agent.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 0",
                borderBottom: "1px solid var(--border-color)",
              }}
            >
              <div>
                <span style={{ fontWeight: 600 }}>{agent.name}</span>
                <span className={`badge ${agent.status}`} style={{ marginLeft: 8 }}>
                  {agent.status}
                </span>
              </div>
              {assignedIds.has(agent.id) ? (
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => revokeMut.mutate(agent.id)}
                >
                  <MdPersonRemove /> Revoke
                </button>
              ) : (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => assignMut.mutate(agent.id)}
                >
                  <MdPersonAdd /> Assign
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
