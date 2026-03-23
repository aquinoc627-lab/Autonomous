import React, { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toolsAPI, agentsAPI } from "./api";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";
import "./ToolArsenal.css";
import {
  MdSearch,
  MdFilterList,
  MdSecurity,
  MdTerminal,
  MdContentCopy,
  MdWarning,
  MdDangerous,
  MdInfo,
  MdCheckCircle,
  MdClose,
  MdExpandMore,
  MdExpandLess,
  MdComputer,
  MdPhoneAndroid,
  MdDesktopWindows,
  MdSmartToy,
  MdPlayArrow,
  MdLink,
  MdSpeed,
} from "react-icons/md";
import {
  FaLinux,
  FaWindows,
  FaAndroid,
} from "react-icons/fa";

/* ================================================================
   CATEGORY ICONS & COLORS
   ================================================================ */
const CATEGORY_META = {
  Recon:               { icon: "🔍", color: "#00f0ff", label: "Recon" },
  Web:                 { icon: "🌐", color: "#bf00ff", label: "Web" },
  Exploitation:        { icon: "💥", color: "#ff0040", label: "Exploitation" },
  Passwords:           { icon: "🔑", color: "#ff6b00", label: "Passwords" },
  OSINT:               { icon: "🕵️", color: "#39ff14", label: "OSINT" },
  Wireless:            { icon: "📡", color: "#ffe600", label: "Wireless" },
  Network:             { icon: "🔗", color: "#00f0ff", label: "Network" },
  "Post-Exploitation": { icon: "🎯", color: "#ff006e", label: "Post-Exploit" },
  Darknet:             { icon: "🌑", color: "#8892a4", label: "Darknet" },
  "AI Ops":            { icon: "🤖", color: "#bf00ff", label: "AI Ops" },
};

const SEVERITY_META = {
  info:    { icon: <MdInfo />, color: "#00f0ff", label: "Info", bg: "rgba(0,240,255,0.1)" },
  warning: { icon: <MdWarning />, color: "#ffe600", label: "Warning", bg: "rgba(255,230,0,0.1)" },
  danger:  { icon: <MdDangerous />, color: "#ff0040", label: "Danger", bg: "rgba(255,0,64,0.1)" },
};

const OS_META = {
  linux:   { icon: <FaLinux />, label: "Linux", color: "#39ff14" },
  windows: { icon: <FaWindows />, label: "Windows", color: "#00f0ff" },
  android: { icon: <FaAndroid />, label: "Android", color: "#ffe600" },
};

/* ================================================================
   TOOL CARD COMPONENT
   ================================================================ */
function ToolCard({ tool, onSelect, isSelected, onQuickLaunch }) {
  const sev = SEVERITY_META[tool.severity] || SEVERITY_META.info;
  const cat = CATEGORY_META[tool.category] || { icon: "🔧", color: "#888" };

  const handleQuickLaunch = (e) => {
    e.stopPropagation();
    if (onQuickLaunch) onQuickLaunch(tool);
  };

  return (
    <div
      className={`tool-card ${isSelected ? "tool-card-selected" : ""}`}
      onClick={() => onSelect(tool)}
      style={{ "--card-accent": cat.color }}
    >
      <div className="tool-card-header">
        <span className="tool-card-category-icon">{cat.icon}</span>
        <div className="tool-card-title-group">
          <h4 className="tool-card-name">{tool.name}</h4>
          <span className="tool-card-id">#{tool.id}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {!tool.requires_confirmation && (
            <button
              className="tool-quick-launch-btn"
              onClick={handleQuickLaunch}
              title="Quick Launch with defaults"
            >
              <MdPlayArrow />
            </button>
          )}
          <div
            className="tool-card-severity"
            style={{ background: sev.bg, color: sev.color }}
            title={`Severity: ${sev.label}`}
          >
            {sev.icon}
            <span>{sev.label}</span>
          </div>
        </div>
      </div>

      <p className="tool-card-desc">{tool.description}</p>

      <div className="tool-card-footer">
        <div className="tool-card-os-list">
          {tool.os_support.map((os) => {
            const osMeta = OS_META[os];
            return (
              <span
                key={os}
                className="tool-card-os-badge"
                style={{ color: osMeta?.color }}
                title={osMeta?.label}
              >
                {osMeta?.icon}
              </span>
            );
          })}
        </div>
        <div className="tool-card-tags">
          {(tool.tags || []).slice(0, 3).map((tag) => (
            <span key={tag} className="tool-card-tag">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {tool.requires_confirmation && (
        <div className="tool-card-confirm-badge" title="Requires confirmation before execution">
          <MdSecurity /> Confirmation Required
        </div>
      )}
    </div>
  );
}

/* ================================================================
   TOOL DETAIL PANEL (Right side)
   ================================================================ */
function ToolDetailPanel({ tool, onClose, agents }) {
  const { isAdmin } = useAuth();
  const { addToast } = useToast();
  const [targetOS, setTargetOS] = useState(tool.os_support[0] || "linux");
  const [params, setParams] = useState({});
  const [generatedCmd, setGeneratedCmd] = useState(null);
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState("");

  const sev = SEVERITY_META[tool.severity] || SEVERITY_META.info;
  const cat = CATEGORY_META[tool.category] || { icon: "🔧", color: "#888" };

  const generateMut = useMutation({
    mutationFn: () => toolsAPI.generate(tool.id, targetOS, params),
    onSuccess: (res) => {
      const data = res.data;
      if (data.status === "requires_confirmation") {
        setNeedsConfirm(true);
        setGeneratedCmd(null);
        addToast("This tool requires admin confirmation before execution.", "warning");
      } else {
        setGeneratedCmd(data.command);
        setNeedsConfirm(false);
        addToast("Command generated successfully!", "success");
      }
    },
    onError: (err) => {
      addToast(err.response?.data?.detail || "Failed to generate command", "error");
    },
  });

  const confirmMut = useMutation({
    mutationFn: () => toolsAPI.confirm(tool.id, targetOS, params),
    onSuccess: (res) => {
      setGeneratedCmd(res.data.command);
      setNeedsConfirm(false);
      addToast("Dangerous tool confirmed and command generated!", "success");
    },
    onError: (err) => {
      addToast(err.response?.data?.detail || "Confirmation failed", "error");
    },
  });

  const handleParamChange = (name, value) => {
    setParams((prev) => ({ ...prev, [name]: value }));
  };

  const copyCommand = () => {
    if (generatedCmd) {
      navigator.clipboard.writeText(generatedCmd);
      addToast("Command copied to clipboard!", "info");
    }
  };

  const handleGenerate = () => {
    setGeneratedCmd(null);
    setNeedsConfirm(false);
    generateMut.mutate();
  };

  return (
    <div className="tool-detail-panel">
      {/* Header */}
      <div className="tool-detail-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 28 }}>{cat.icon}</span>
          <div>
            <h3 style={{ color: "var(--text-primary)", margin: 0 }}>{tool.name}</h3>
            <span style={{ fontSize: 12, color: cat.color }}>{tool.category}</span>
          </div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={onClose}>
          <MdClose />
        </button>
      </div>

      {/* Description */}
      <p style={{ color: "var(--text-secondary)", fontSize: 13, margin: "12px 0" }}>
        {tool.description}
      </p>

      {/* Severity & Confirmation */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <div
          className="tool-detail-badge"
          style={{ background: sev.bg, color: sev.color }}
        >
          {sev.icon} {sev.label} Severity
        </div>
        {tool.requires_confirmation && (
          <div
            className="tool-detail-badge"
            style={{ background: "rgba(255,0,64,0.1)", color: "#ff0040" }}
          >
            <MdSecurity /> Admin Confirm
          </div>
        )}
        {tool.estimated_duration > 0 && (
          <div
            className="tool-detail-badge"
            style={{ background: "rgba(0,240,255,0.1)", color: "#00f0ff" }}
          >
            <MdSpeed /> ~{tool.estimated_duration}s
          </div>
        )}
      </div>

      {/* OS Selection */}
      <div className="form-group">
        <label>Target Environment</label>
        <div className="tool-os-selector">
          {tool.os_support.map((os) => {
            const osMeta = OS_META[os];
            return (
              <button
                key={os}
                className={`tool-os-btn ${targetOS === os ? "active" : ""}`}
                onClick={() => setTargetOS(os)}
                style={{
                  "--os-color": osMeta?.color,
                }}
              >
                {osMeta?.icon} {osMeta?.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Parameters */}
      <div className="tool-params-section">
        <h4 style={{ color: "var(--text-primary)", fontSize: 14, marginBottom: 12 }}>
          <MdFilterList style={{ verticalAlign: "middle" }} /> Parameters
        </h4>
        {(tool.params || []).map((p) => (
          <div className="form-group" key={p.name}>
            <label>
              {p.label}
              {p.required && <span style={{ color: "#ff0040" }}> *</span>}
            </label>
            {p.type === "select" ? (
              <select
                className="form-select"
                value={params[p.name] || ""}
                onChange={(e) => handleParamChange(p.name, e.target.value)}
              >
                <option value="">-- Select --</option>
                {(p.options || []).map((opt) => {
                  const parts = opt.split(":");
                  return (
                    <option key={opt} value={parts[0]}>
                      {parts.length > 1 ? parts[1] : parts[0]}
                    </option>
                  );
                })}
              </select>
            ) : p.type === "checkbox" ? (
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={params[p.name] === "true"}
                  onChange={(e) =>
                    handleParamChange(p.name, e.target.checked ? "true" : "false")
                  }
                  style={{ accentColor: "var(--neon-cyan)" }}
                />
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                  {p.help_text || "Enable"}
                </span>
              </label>
            ) : (
              <input
                className="form-input"
                type={p.type === "number" ? "number" : "text"}
                placeholder={p.placeholder || ""}
                value={params[p.name] || ""}
                onChange={(e) => handleParamChange(p.name, e.target.value)}
              />
            )}
            {p.help_text && p.type !== "checkbox" && (
              <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2, display: "block" }}>
                {p.help_text}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Assign to Agent (optional) */}
      {agents && agents.length > 0 && (
        <div className="form-group">
          <label><MdSmartToy style={{ verticalAlign: "middle" }} /> Assign to Agent (optional)</label>
          <select
            className="form-select"
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
          >
            <option value="">-- No Agent --</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.status})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Generate Button */}
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button
          className="btn btn-primary"
          onClick={handleGenerate}
          disabled={generateMut.isPending}
          style={{ flex: 1 }}
        >
          <MdTerminal /> {generateMut.isPending ? "Generating..." : "Generate Command"}
        </button>
      </div>

      {/* Confirmation Gate */}
      {needsConfirm && isAdmin && (
        <div className="tool-confirm-gate">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <MdDangerous style={{ color: "#ff0040", fontSize: 20 }} />
            <span style={{ color: "#ff0040", fontWeight: 600 }}>
              Dangerous Tool — Admin Confirmation Required
            </span>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: 12, marginBottom: 12 }}>
            This tool has severity level <strong style={{ color: "#ff0040" }}>DANGER</strong>.
            Executing it may have significant impact. Confirm only if you have proper authorization.
          </p>
          <button
            className="btn btn-danger"
            onClick={() => confirmMut.mutate()}
            disabled={confirmMut.isPending}
            style={{ width: "100%" }}
          >
            <MdSecurity /> {confirmMut.isPending ? "Confirming..." : "CONFIRM EXECUTION"}
          </button>
        </div>
      )}

      {needsConfirm && !isAdmin && (
        <div className="tool-confirm-gate">
          <p style={{ color: "#ff0040", fontSize: 13 }}>
            <MdSecurity style={{ verticalAlign: "middle" }} /> Only admin users can confirm dangerous tool executions.
          </p>
        </div>
      )}

      {/* Generated Command Output */}
      {generatedCmd && (
        <div className="tool-command-output">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ color: "var(--neon-green)", fontSize: 13, fontWeight: 600 }}>
              <MdCheckCircle style={{ verticalAlign: "middle" }} /> Command Generated
            </span>
            <button className="btn btn-secondary btn-sm" onClick={copyCommand}>
              <MdContentCopy /> Copy
            </button>
          </div>
          <pre className="tool-command-pre">
            <code>{generatedCmd}</code>
          </pre>
        </div>
      )}

      {/* Documentation Link */}
      {tool.documentation && (
        <a
          href={tool.documentation}
          target="_blank"
          rel="noopener noreferrer"
          className="tool-doc-link"
        >
          <MdLink /> Official Documentation
        </a>
      )}

      {/* Install Command */}
      {tool.install_commands && tool.install_commands[targetOS] && (
        <div style={{ marginTop: 12 }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Install ({OS_META[targetOS]?.label}):
          </span>
          <pre className="tool-install-pre">
            <code>{tool.install_commands[targetOS]}</code>
          </pre>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   MAIN TOOL ARSENAL PAGE
   ================================================================ */
export default function ToolArsenal() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedOS, setSelectedOS] = useState("all");
  const [selectedSeverity, setSelectedSeverity] = useState("all");
  const [selectedTool, setSelectedTool] = useState(null);
  const [viewMode, setViewMode] = useState("grid"); // grid | list

  // Fetch all tools
  const { data: categories, isLoading: catLoading } = useQuery({
    queryKey: ["tool-categories"],
    queryFn: () => toolsAPI.categories().then((r) => r.data),
  });

  // Fetch tool stats
  const { data: stats } = useQuery({
    queryKey: ["tool-stats"],
    queryFn: () => toolsAPI.stats().then((r) => r.data),
  });

  // Fetch agents for assignment
  const { data: agents } = useQuery({
    queryKey: ["agents"],
    queryFn: () => agentsAPI.list().then((r) => r.data),
  });

  // Fetch full tool detail when selected
  const { data: toolDetail } = useQuery({
    queryKey: ["tool-detail", selectedTool?.id],
    queryFn: () => toolsAPI.get(selectedTool.id).then((r) => r.data),
    enabled: !!selectedTool,
  });

  // Search
  const { data: searchResults } = useQuery({
    queryKey: ["tool-search", searchQuery],
    queryFn: () => toolsAPI.search(searchQuery).then((r) => r.data),
    enabled: searchQuery.length >= 2,
  });

  // Flatten all tools from categories
  const allTools = useMemo(() => {
    if (!categories) return [];
    return categories.flatMap((cat) => cat.tools || []);
  }, [categories]);

  // Apply filters
  const filteredTools = useMemo(() => {
    let tools = searchQuery.length >= 2 && searchResults ? searchResults : allTools;

    if (selectedCategory !== "All") {
      tools = tools.filter((t) => t.category === selectedCategory);
    }
    if (selectedOS !== "all") {
      tools = tools.filter((t) => t.os_support.includes(selectedOS));
    }
    if (selectedSeverity !== "all") {
      tools = tools.filter((t) => t.severity === selectedSeverity);
    }

    return tools;
  }, [allTools, searchResults, searchQuery, selectedCategory, selectedOS, selectedSeverity]);

  const handleSelectTool = useCallback((tool) => {
    setSelectedTool((prev) => (prev?.id === tool.id ? null : tool));
  }, []);

  const handleQuickLaunch = useCallback(async (tool) => {
    try {
      const res = await toolsAPI.generate(tool.id, tool.os_support[0] || "linux", {});
      const data = res.data;
      if (data.command) {
        await navigator.clipboard.writeText(data.command);
        // Use a simple alert-style notification since we don't have addToast here
        const event = new CustomEvent("autonomous-toast", {
          detail: { message: `Quick Launch: ${tool.name} command copied!`, type: "success" },
        });
        window.dispatchEvent(event);
      }
    } catch (err) {
      console.error("Quick launch failed:", err);
    }
  }, []);

  if (catLoading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--neon-cyan)" }}>
        Loading Tool Arsenal...
      </div>
    );
  }

  return (
    <div className="tool-arsenal-page">
      {/* Page Header */}
      <div className="page-header">
        <h2>
          <MdSecurity style={{ verticalAlign: "middle", marginRight: 8, color: "var(--neon-cyan)" }} />
          Tool Arsenal
        </h2>
        <p>
          {stats?.total_tools || 0} cybersecurity tools across {stats?.total_categories || 0} categories
        </p>
      </div>

      {/* Stats Bar */}
      <div className="tool-stats-bar">
        <div className="tool-stat-chip">
          <FaLinux style={{ color: "#39ff14" }} />
          <span>{stats?.os_support?.linux || 0} Linux</span>
        </div>
        <div className="tool-stat-chip">
          <FaWindows style={{ color: "#00f0ff" }} />
          <span>{stats?.os_support?.windows || 0} Windows</span>
        </div>
        <div className="tool-stat-chip">
          <FaAndroid style={{ color: "#ffe600" }} />
          <span>{stats?.os_support?.android || 0} Android</span>
        </div>
        <div className="tool-stat-chip" style={{ borderColor: "rgba(0,240,255,0.2)" }}>
          <MdInfo style={{ color: "#00f0ff" }} />
          <span>{stats?.severity_breakdown?.info || 0} Info</span>
        </div>
        <div className="tool-stat-chip" style={{ borderColor: "rgba(255,230,0,0.2)" }}>
          <MdWarning style={{ color: "#ffe600" }} />
          <span>{stats?.severity_breakdown?.warning || 0} Warning</span>
        </div>
        <div className="tool-stat-chip" style={{ borderColor: "rgba(255,0,64,0.2)" }}>
          <MdDangerous style={{ color: "#ff0040" }} />
          <span>{stats?.severity_breakdown?.danger || 0} Danger</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="tool-filters-bar">
        {/* Search */}
        <div className="tool-search-box">
          <MdSearch className="tool-search-icon" />
          <input
            className="form-input"
            placeholder="Search tools by name, description, or tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
        </div>

        {/* Category Filter */}
        <div className="tool-filter-group">
          <select
            className="form-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="All">All Categories</option>
            {(categories || []).map((cat) => (
              <option key={cat.name} value={cat.name}>
                {CATEGORY_META[cat.name]?.icon || "🔧"} {cat.name} ({cat.tool_count})
              </option>
            ))}
          </select>
        </div>

        {/* OS Filter */}
        <div className="tool-filter-group">
          <select
            className="form-select"
            value={selectedOS}
            onChange={(e) => setSelectedOS(e.target.value)}
          >
            <option value="all">All OS</option>
            <option value="linux">🐧 Linux</option>
            <option value="windows">🪟 Windows</option>
            <option value="android">🤖 Android</option>
          </select>
        </div>

        {/* Severity Filter */}
        <div className="tool-filter-group">
          <select
            className="form-select"
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
          >
            <option value="all">All Severity</option>
            <option value="info">ℹ️ Info</option>
            <option value="warning">⚠️ Warning</option>
            <option value="danger">🔴 Danger</option>
          </select>
        </div>
      </div>

      {/* Category Pills */}
      <div className="tool-category-pills">
        <button
          className={`tool-cat-pill ${selectedCategory === "All" ? "active" : ""}`}
          onClick={() => setSelectedCategory("All")}
        >
          All ({allTools.length})
        </button>
        {(categories || []).map((cat) => {
          const meta = CATEGORY_META[cat.name] || { icon: "🔧", color: "#888" };
          return (
            <button
              key={cat.name}
              className={`tool-cat-pill ${selectedCategory === cat.name ? "active" : ""}`}
              onClick={() => setSelectedCategory(cat.name)}
              style={{ "--pill-color": meta.color }}
            >
              {meta.icon} {meta.label || cat.name} ({cat.tool_count})
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="tool-main-area">
        {/* Tool Grid */}
        <div className={`tool-grid ${selectedTool ? "tool-grid-with-detail" : ""}`}>
          {filteredTools.length === 0 ? (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
              No tools match your filters.
            </div>
          ) : (
            filteredTools.map((tool) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                onSelect={handleSelectTool}
                isSelected={selectedTool?.id === tool.id}
                onQuickLaunch={handleQuickLaunch}
              />
            ))
          )}
        </div>

        {/* Detail Panel */}
        {selectedTool && toolDetail && (
          <ToolDetailPanel
            tool={toolDetail}
            onClose={() => setSelectedTool(null)}
            agents={agents}
          />
        )}
      </div>
    </div>
  );
}
