import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { playbooksAPI, agentsAPI } from "./api";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";
import {
  MdPlaylistPlay,
  MdPlayArrow,
  MdPause,
  MdStop,
  MdSkipNext,
  MdCheckCircle,
  MdCancel,
  MdWarning,
  MdSecurity,
  MdTimer,
  MdSearch,
  MdFilterList,
  MdExpandMore,
  MdExpandLess,
  MdSmartToy,
  MdGavel,
  MdInfo,
  MdDangerous,
  MdRocketLaunch,
} from "react-icons/md";

/* ================================================================
   CONSTANTS
   ================================================================ */
const DIFFICULTY_META = {
  beginner:     { color: "#39ff14", label: "Beginner", bg: "rgba(57,255,20,0.1)" },
  intermediate: { color: "#00f0ff", label: "Intermediate", bg: "rgba(0,240,255,0.1)" },
  advanced:     { color: "#ff6b00", label: "Advanced", bg: "rgba(255,107,0,0.1)" },
  expert:       { color: "#ff0040", label: "Expert", bg: "rgba(255,0,64,0.1)" },
};

const GATE_META = {
  auto:        { icon: <MdPlayArrow />, color: "#39ff14", label: "Auto" },
  manual:      { icon: <MdPause />, color: "#ffe600", label: "Manual Gate" },
  conditional: { icon: <MdFilterList />, color: "#00f0ff", label: "Conditional" },
};

const SEVERITY_META = {
  info:    { icon: <MdInfo />, color: "#00f0ff" },
  warning: { icon: <MdWarning />, color: "#ffe600" },
  danger:  { icon: <MdDangerous />, color: "#ff0040" },
};

const formatTime = (seconds) => {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
};

/* ================================================================
   PLAYBOOK CARD
   ================================================================ */
function PlaybookCard({ playbook, onSelect, isSelected }) {
  const diff = DIFFICULTY_META[playbook.difficulty] || DIFFICULTY_META.beginner;
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`panel playbook-card ${isSelected ? "playbook-card-selected" : ""}`}
      style={{ cursor: "pointer", marginBottom: 12, borderColor: isSelected ? "var(--neon-cyan)" : undefined }}
    >
      {/* Header */}
      <div
        className="playbook-card-header"
        onClick={() => onSelect(playbook)}
        style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <MdPlaylistPlay style={{ fontSize: 22, color: "var(--neon-cyan)" }} />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              {playbook.name}
            </h3>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 10px", lineHeight: 1.5 }}>
            {playbook.description}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <span
              className="badge"
              style={{ background: diff.bg, color: diff.color }}
            >
              {diff.label}
            </span>
            <span className="badge" style={{ background: "rgba(0,240,255,0.08)", color: "var(--neon-cyan)" }}>
              {playbook.category}
            </span>
            <span style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
              <MdTimer /> {formatTime(playbook.estimated_total_time)}
            </span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {playbook.steps.length} steps
            </span>
            {playbook.requires_admin && (
              <span className="badge" style={{ background: "rgba(255,0,64,0.1)", color: "#ff0040" }}>
                <MdSecurity style={{ fontSize: 12 }} /> Admin Only
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Expand Steps Toggle */}
      <button
        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        style={{
          background: "none", border: "none", color: "var(--text-muted)",
          cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
          fontSize: 12, padding: "8px 0 0", width: "100%",
        }}
      >
        {expanded ? <MdExpandLess /> : <MdExpandMore />}
        {expanded ? "Hide Steps" : "View Steps"}
      </button>

      {/* Steps List */}
      {expanded && (
        <div style={{ marginTop: 12 }}>
          {playbook.steps.map((step, idx) => {
            const gate = GATE_META[step.gate] || GATE_META.auto;
            const sev = SEVERITY_META[step.severity] || SEVERITY_META.info;
            return (
              <div
                key={idx}
                style={{
                  display: "flex", gap: 12, padding: "10px 0",
                  borderTop: idx > 0 ? "1px solid var(--border-color)" : "none",
                  alignItems: "flex-start",
                }}
              >
                {/* Step Number */}
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: "rgba(0,240,255,0.1)", color: "var(--neon-cyan)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, flexShrink: 0,
                }}>
                  {step.step_number}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)" }}>
                      {step.tool_name}
                    </span>
                    <span style={{ fontSize: 11, color: sev.color, display: "flex", alignItems: "center", gap: 2 }}>
                      {sev.icon} {step.severity}
                    </span>
                    <span style={{
                      fontSize: 10, color: gate.color, display: "flex", alignItems: "center", gap: 2,
                      padding: "1px 6px", borderRadius: 4, border: `1px solid ${gate.color}30`,
                    }}>
                      {gate.icon} {gate.label}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>
                    {step.description}
                  </p>
                  {step.gate_description && (
                    <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "4px 0 0", fontStyle: "italic" }}>
                      Gate: {step.gate_description}
                    </p>
                  )}
                </div>
                <span style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                  ~{formatTime(step.estimated_duration)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Tags */}
      {playbook.tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 10 }}>
          {playbook.tags.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: 10, padding: "2px 8px", borderRadius: 4,
                background: "var(--bg-input)", color: "var(--text-muted)",
                border: "1px solid var(--border-color)",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================================================================
   EXECUTION PANEL
   ================================================================ */
function ExecutionPanel({ execution, playbook, onStepAction, isActioning }) {
  if (!execution || !playbook) return null;

  const progress = execution.total_steps > 0
    ? Math.round(((execution.current_step - 1 + (execution.status === "completed" ? 1 : 0)) / execution.total_steps) * 100)
    : 0;

  return (
    <div className="panel" style={{ marginBottom: 16, borderColor: "var(--neon-cyan)", borderStyle: "dashed" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--neon-cyan)", margin: 0 }}>
          <MdRocketLaunch style={{ verticalAlign: "middle", marginRight: 6 }} />
          Execution: {execution.playbook_name}
        </h3>
        <span className={`badge ${execution.status}`}>
          <span className="dot" />
          {execution.status}
        </span>
      </div>

      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 12 }}>
        Target: <strong style={{ color: "var(--neon-cyan)" }}>{execution.target}</strong>
        &nbsp;&bull;&nbsp; Step {execution.current_step} of {execution.total_steps}
      </div>

      {/* Progress Bar */}
      <div style={{
        height: 6, background: "var(--bg-input)", borderRadius: 3, marginBottom: 16, overflow: "hidden",
      }}>
        <div style={{
          height: "100%", width: `${progress}%`, borderRadius: 3,
          background: execution.status === "completed" ? "var(--neon-green)" :
                      execution.status === "failed" || execution.status === "cancelled" ? "var(--neon-red)" :
                      "var(--neon-cyan)",
          transition: "width 0.5s ease",
          boxShadow: `0 0 8px ${execution.status === "completed" ? "var(--neon-green)" : "var(--neon-cyan)"}`,
        }} />
      </div>

      {/* Steps Timeline */}
      {playbook.steps.map((step, idx) => {
        const stepNum = idx + 1;
        const result = execution.step_results.find((r) => r.step === stepNum);
        const isCurrent = stepNum === execution.current_step && execution.status !== "completed";
        const isPast = result != null;
        const isFuture = !isPast && !isCurrent;

        return (
          <div
            key={idx}
            style={{
              display: "flex", gap: 12, padding: "10px 12px", marginBottom: 4,
              borderRadius: "var(--radius)",
              background: isCurrent ? "rgba(0,240,255,0.05)" : "transparent",
              border: isCurrent ? "1px dashed rgba(0,240,255,0.3)" : "1px solid transparent",
              opacity: isFuture ? 0.5 : 1,
            }}
          >
            <div style={{
              width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
              background: isPast
                ? result.status === "skipped" ? "rgba(255,230,0,0.15)" : "rgba(57,255,20,0.15)"
                : isCurrent ? "rgba(0,240,255,0.15)" : "rgba(90,101,119,0.15)",
              color: isPast
                ? result.status === "skipped" ? "var(--neon-yellow)" : "var(--neon-green)"
                : isCurrent ? "var(--neon-cyan)" : "var(--text-muted)",
            }}>
              {isPast ? (result.status === "skipped" ? <MdSkipNext /> : <MdCheckCircle />) :
               isCurrent ? stepNum : stepNum}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: isCurrent ? "var(--neon-cyan)" : "var(--text-primary)" }}>
                {step.tool_name}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{step.description}</div>
              {isCurrent && step.gate === "manual" && execution.status === "paused" && (
                <div style={{ marginTop: 8, padding: "8px 12px", background: "rgba(255,230,0,0.08)", borderRadius: "var(--radius)", border: "1px dashed rgba(255,230,0,0.3)" }}>
                  <div style={{ fontSize: 12, color: "var(--neon-yellow)", marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}>
                    <MdGavel /> {step.gate_description}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => onStepAction("approve")}
                      disabled={isActioning}
                      style={{ display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <MdCheckCircle /> Approve & Execute
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => onStepAction("skip")}
                      disabled={isActioning}
                      style={{ display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <MdSkipNext /> Skip
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => onStepAction("abort")}
                      disabled={isActioning}
                      style={{ display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <MdStop /> Abort
                    </button>
                  </div>
                </div>
              )}
              {isCurrent && step.gate !== "manual" && execution.status === "running" && (
                <div style={{ marginTop: 6, fontSize: 11, color: "var(--neon-green)", display: "flex", alignItems: "center", gap: 4 }}>
                  <MdPlayArrow /> Running automatically...
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => onStepAction("approve")}
                    disabled={isActioning}
                    style={{ marginLeft: 8, fontSize: 11, padding: "2px 8px" }}
                  >
                    Next Step
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ================================================================
   MAIN PLAYBOOKS PAGE
   ================================================================ */
export default function Playbooks() {
  const { isAdmin } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [selectedPlaybook, setSelectedPlaybook] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [targetInput, setTargetInput] = useState("");
  const [activeExecution, setActiveExecution] = useState(null);

  const { data: playbookData } = useQuery({
    queryKey: ["playbooks"],
    queryFn: () => playbooksAPI.list().then((r) => r.data),
  });

  const { data: categories } = useQuery({
    queryKey: ["playbook-categories"],
    queryFn: () => playbooksAPI.categories().then((r) => r.data),
  });

  const { data: stats } = useQuery({
    queryKey: ["playbook-stats"],
    queryFn: () => playbooksAPI.stats().then((r) => r.data),
  });

  const { data: agents } = useQuery({
    queryKey: ["agents"],
    queryFn: () => agentsAPI.list().then((r) => r.data),
  });

  const playbooks = playbookData?.playbooks || [];

  const filteredPlaybooks = useMemo(() => {
    let result = playbooks;
    if (selectedCategory !== "All") {
      result = result.filter((p) => p.category === selectedCategory);
    }
    if (selectedDifficulty !== "all") {
      result = result.filter((p) => p.difficulty === selectedDifficulty);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.tags.some((t) => t.includes(q))
      );
    }
    return result;
  }, [playbooks, selectedCategory, selectedDifficulty, searchQuery]);

  const executeMut = useMutation({
    mutationFn: (data) => playbooksAPI.execute(data),
    onSuccess: (res) => {
      setActiveExecution(res.data);
      addToast("Playbook execution started!", "success");
    },
    onError: (err) => {
      addToast(err.response?.data?.detail || "Failed to start playbook", "error");
    },
  });

  const stepMut = useMutation({
    mutationFn: ({ execId, action }) => playbooksAPI.stepAction(execId, action),
    onSuccess: (res) => {
      setActiveExecution(res.data);
      if (res.data.status === "completed") {
        addToast("Playbook execution completed!", "success");
      } else if (res.data.status === "cancelled") {
        addToast("Playbook execution aborted.", "warning");
      }
    },
    onError: (err) => {
      addToast(err.response?.data?.detail || "Step action failed", "error");
    },
  });

  const handleExecute = () => {
    if (!selectedPlaybook || !targetInput.trim()) {
      addToast("Please select a playbook and enter a target.", "warning");
      return;
    }
    executeMut.mutate({
      playbook_id: selectedPlaybook.id,
      target: targetInput.trim(),
    });
  };

  const handleStepAction = (action) => {
    if (!activeExecution) return;
    stepMut.mutate({ execId: activeExecution.execution_id, action });
  };

  return (
    <div>
      <div className="page-header">
        <h2>
          <MdPlaylistPlay style={{ verticalAlign: "middle", marginRight: 8, color: "var(--neon-cyan)" }} />
          Playbooks
        </h2>
        <p>
          Pre-built autonomous attack chains &mdash; {stats?.total_playbooks || 0} playbooks,{" "}
          {stats?.total_steps || 0} total steps
        </p>
      </div>

      {/* Stats */}
      <div className="panel-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-icon cyan"><MdPlaylistPlay /></div>
          <div>
            <div className="stat-value">{stats?.total_playbooks || 0}</div>
            <div className="stat-label">Playbooks</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><MdCheckCircle /></div>
          <div>
            <div className="stat-value">{stats?.total_steps || 0}</div>
            <div className="stat-label">Total Steps</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><MdRocketLaunch /></div>
          <div>
            <div className="stat-value">{stats?.active_executions || 0}</div>
            <div className="stat-label">Active Runs</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple"><MdSecurity /></div>
          <div>
            <div className="stat-value">{Object.keys(stats?.categories || {}).length}</div>
            <div className="stat-label">Categories</div>
          </div>
        </div>
      </div>

      {/* Active Execution */}
      {activeExecution && activeExecution.status !== "completed" && activeExecution.status !== "cancelled" && (
        <ExecutionPanel
          execution={activeExecution}
          playbook={playbooks.find((p) => p.id === activeExecution.playbook_id)}
          onStepAction={handleStepAction}
          isActioning={stepMut.isPending}
        />
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 250px", position: "relative" }}>
          <MdSearch style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            className="form-input"
            placeholder="Search playbooks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
        </div>
        <select
          className="form-select"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{ flex: "0 0 180px" }}
        >
          <option value="All">All Categories</option>
          {(categories || []).map((cat) => (
            <option key={cat.name} value={cat.name}>
              {cat.name} ({cat.count})
            </option>
          ))}
        </select>
        <select
          className="form-select"
          value={selectedDifficulty}
          onChange={(e) => setSelectedDifficulty(e.target.value)}
          style={{ flex: "0 0 160px" }}
        >
          <option value="all">All Levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
          <option value="expert">Expert</option>
        </select>
      </div>

      {/* Launch Panel */}
      {selectedPlaybook && (
        <div className="panel" style={{ marginBottom: 16, borderColor: "var(--neon-cyan)" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--neon-cyan)", marginBottom: 12 }}>
            <MdRocketLaunch style={{ verticalAlign: "middle", marginRight: 6 }} />
            Launch: {selectedPlaybook.name}
          </h3>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div className="form-group" style={{ flex: "1 1 300px", margin: 0 }}>
              <label>Target (IP, domain, or URL)</label>
              <input
                className="form-input"
                placeholder="e.g., 192.168.1.0/24 or example.com"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={handleExecute}
              disabled={executeMut.isPending || !targetInput.trim()}
              style={{ display: "flex", alignItems: "center", gap: 6, height: 42 }}
            >
              <MdPlayArrow /> {executeMut.isPending ? "Starting..." : "Execute Playbook"}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setSelectedPlaybook(null)}
              style={{ height: 42 }}
            >
              <MdCancel /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Playbook List */}
      {filteredPlaybooks.length === 0 ? (
        <div className="panel" style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
          No playbooks match your filters.
        </div>
      ) : (
        filteredPlaybooks.map((pb) => (
          <PlaybookCard
            key={pb.id}
            playbook={pb}
            onSelect={setSelectedPlaybook}
            isSelected={selectedPlaybook?.id === pb.id}
          />
        ))
      )}
    </div>
  );
}
