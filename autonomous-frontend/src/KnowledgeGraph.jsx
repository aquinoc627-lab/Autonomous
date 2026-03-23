import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { agentsAPI, missionsAPI } from "./api";
import {
  MdAccountTree,
  MdSearch,
  MdFilterList,
  MdZoomIn,
  MdZoomOut,
  MdCenterFocusStrong,
  MdAdd,
  MdDelete,
  MdSmartToy,
  MdRocketLaunch,
  MdSecurity,
  MdBugReport,
  MdComputer,
  MdDns,
  MdVpnKey,
  MdWarning,
  MdInfo,
} from "react-icons/md";

/* ================================================================
   KNOWLEDGE GRAPH — Interactive Intel Visualization
   Renders a force-directed graph of targets, vulnerabilities,
   credentials, agents, and missions with relationship edges.
   ================================================================ */

const NODE_TYPES = {
  target:        { color: "#00f0ff", icon: "🎯", label: "Target" },
  host:          { color: "#39ff14", icon: "🖥️", label: "Host" },
  service:       { color: "#bf00ff", icon: "⚙️", label: "Service" },
  vulnerability: { color: "#ff0040", icon: "🐛", label: "Vulnerability" },
  credential:    { color: "#ffe600", icon: "🔑", label: "Credential" },
  agent:         { color: "#00f0ff", icon: "🤖", label: "Agent" },
  mission:       { color: "#ff6b00", icon: "🚀", label: "Mission" },
  tool:          { color: "#bf00ff", icon: "🔧", label: "Tool" },
};

// Sample intel data — in production this would come from scan results
const SAMPLE_NODES = [
  { id: "t1", type: "target", label: "example.com", data: { ip: "93.184.216.34", discovered: "2026-03-15" } },
  { id: "h1", type: "host", label: "93.184.216.34", data: { os: "Linux", ports: "80,443,22,8080" } },
  { id: "h2", type: "host", label: "10.0.0.5", data: { os: "Windows Server 2022", ports: "445,3389,80" } },
  { id: "h3", type: "host", label: "10.0.0.12", data: { os: "Linux", ports: "22,3306,8443" } },
  { id: "s1", type: "service", label: "Apache 2.4.51", data: { port: 80, protocol: "HTTP" } },
  { id: "s2", type: "service", label: "OpenSSH 8.9", data: { port: 22, protocol: "SSH" } },
  { id: "s3", type: "service", label: "MySQL 8.0", data: { port: 3306, protocol: "MySQL" } },
  { id: "s4", type: "service", label: "SMB", data: { port: 445, protocol: "SMB" } },
  { id: "s5", type: "service", label: "Nginx 1.21", data: { port: 8443, protocol: "HTTPS" } },
  { id: "v1", type: "vulnerability", label: "CVE-2024-1234", data: { severity: "critical", cvss: 9.8, description: "RCE in Apache mod_proxy" } },
  { id: "v2", type: "vulnerability", label: "CVE-2023-5678", data: { severity: "high", cvss: 7.5, description: "SQL Injection in login form" } },
  { id: "v3", type: "vulnerability", label: "CVE-2024-9012", data: { severity: "medium", cvss: 5.3, description: "Information disclosure via headers" } },
  { id: "v4", type: "vulnerability", label: "MS17-010", data: { severity: "critical", cvss: 9.3, description: "EternalBlue SMB RCE" } },
  { id: "c1", type: "credential", label: "admin:P@ssw0rd!", data: { source: "Hydra brute-force", service: "SSH" } },
  { id: "c2", type: "credential", label: "root:toor123", data: { source: "MySQL dump", service: "MySQL" } },
  { id: "tl1", type: "tool", label: "Nmap", data: { category: "Recon" } },
  { id: "tl2", type: "tool", label: "SQLMap", data: { category: "Web" } },
  { id: "tl3", type: "tool", label: "Metasploit", data: { category: "Exploitation" } },
  { id: "tl4", type: "tool", label: "Hydra", data: { category: "Passwords" } },
];

const SAMPLE_EDGES = [
  { from: "t1", to: "h1", label: "resolves_to" },
  { from: "t1", to: "h2", label: "internal_host" },
  { from: "t1", to: "h3", label: "internal_host" },
  { from: "h1", to: "s1", label: "runs" },
  { from: "h1", to: "s2", label: "runs" },
  { from: "h2", to: "s4", label: "runs" },
  { from: "h3", to: "s3", label: "runs" },
  { from: "h3", to: "s5", label: "runs" },
  { from: "s1", to: "v1", label: "vulnerable_to" },
  { from: "s1", to: "v3", label: "vulnerable_to" },
  { from: "s3", to: "v2", label: "vulnerable_to" },
  { from: "s4", to: "v4", label: "vulnerable_to" },
  { from: "s2", to: "c1", label: "credential_found" },
  { from: "s3", to: "c2", label: "credential_found" },
  { from: "tl1", to: "h1", label: "scanned" },
  { from: "tl1", to: "h2", label: "scanned" },
  { from: "tl1", to: "h3", label: "scanned" },
  { from: "tl2", to: "v2", label: "discovered" },
  { from: "tl3", to: "v4", label: "exploited" },
  { from: "tl4", to: "c1", label: "cracked" },
];

/* ================================================================
   CANVAS GRAPH RENDERER
   ================================================================ */
function GraphCanvas({ nodes, edges, selectedNode, onSelectNode, zoom, offset }) {
  const canvasRef = useRef(null);
  const [positions, setPositions] = useState({});
  const animRef = useRef(null);
  const velocities = useRef({});

  // Initialize positions in a circular layout
  useEffect(() => {
    const pos = {};
    const vel = {};
    const cx = 400;
    const cy = 300;
    const radius = 220;
    nodes.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / nodes.length;
      pos[node.id] = {
        x: cx + radius * Math.cos(angle) + (Math.random() - 0.5) * 40,
        y: cy + radius * Math.sin(angle) + (Math.random() - 0.5) * 40,
      };
      vel[node.id] = { vx: 0, vy: 0 };
    });
    setPositions(pos);
    velocities.current = vel;
  }, [nodes]);

  // Force-directed simulation
  useEffect(() => {
    if (Object.keys(positions).length === 0) return;

    let running = true;
    let iteration = 0;
    const maxIterations = 200;

    const simulate = () => {
      if (!running || iteration >= maxIterations) return;
      iteration++;

      const pos = { ...positions };
      const vel = velocities.current;
      const damping = 0.85;
      const repulsion = 3000;
      const attraction = 0.005;
      const idealLength = 120;

      // Repulsion between all nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i].id;
          const b = nodes[j].id;
          if (!pos[a] || !pos[b]) continue;
          const dx = pos[a].x - pos[b].x;
          const dy = pos[a].y - pos[b].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = repulsion / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          if (vel[a]) { vel[a].vx += fx; vel[a].vy += fy; }
          if (vel[b]) { vel[b].vx -= fx; vel[b].vy -= fy; }
        }
      }

      // Attraction along edges
      edges.forEach((edge) => {
        const a = edge.from;
        const b = edge.to;
        if (!pos[a] || !pos[b]) return;
        const dx = pos[b].x - pos[a].x;
        const dy = pos[b].y - pos[a].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = attraction * (dist - idealLength);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        if (vel[a]) { vel[a].vx += fx; vel[a].vy += fy; }
        if (vel[b]) { vel[b].vx -= fx; vel[b].vy -= fy; }
      });

      // Apply velocities
      nodes.forEach((node) => {
        if (!vel[node.id] || !pos[node.id]) return;
        vel[node.id].vx *= damping;
        vel[node.id].vy *= damping;
        pos[node.id].x += vel[node.id].vx;
        pos[node.id].y += vel[node.id].vy;
        // Keep in bounds
        pos[node.id].x = Math.max(40, Math.min(760, pos[node.id].x));
        pos[node.id].y = Math.max(40, Math.min(560, pos[node.id].y));
      });

      setPositions({ ...pos });
      animRef.current = requestAnimationFrame(simulate);
    };

    animRef.current = requestAnimationFrame(simulate);
    return () => {
      running = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [nodes.length]); // Only re-run when node count changes

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(zoom, zoom);

    // Draw edges
    edges.forEach((edge) => {
      const from = positions[edge.from];
      const to = positions[edge.to];
      if (!from || !to) return;

      const isHighlighted =
        selectedNode && (edge.from === selectedNode || edge.to === selectedNode);

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.strokeStyle = isHighlighted
        ? "rgba(0, 240, 255, 0.6)"
        : "rgba(90, 101, 119, 0.2)";
      ctx.lineWidth = isHighlighted ? 2 : 1;
      ctx.stroke();

      // Edge label
      if (isHighlighted) {
        const mx = (from.x + to.x) / 2;
        const my = (from.y + to.y) / 2;
        ctx.font = "9px monospace";
        ctx.fillStyle = "rgba(0, 240, 255, 0.6)";
        ctx.textAlign = "center";
        ctx.fillText(edge.label, mx, my - 4);
      }
    });

    // Draw nodes
    nodes.forEach((node) => {
      const pos = positions[node.id];
      if (!pos) return;

      const meta = NODE_TYPES[node.type] || NODE_TYPES.target;
      const isSelected = selectedNode === node.id;
      const isConnected =
        selectedNode &&
        edges.some(
          (e) =>
            (e.from === selectedNode && e.to === node.id) ||
            (e.to === selectedNode && e.from === node.id)
        );
      const dimmed = selectedNode && !isSelected && !isConnected;

      // Node circle
      const radius = isSelected ? 22 : 18;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = dimmed
        ? "rgba(20, 22, 30, 0.6)"
        : `${meta.color}15`;
      ctx.fill();
      ctx.strokeStyle = dimmed
        ? "rgba(90, 101, 119, 0.2)"
        : isSelected
        ? meta.color
        : `${meta.color}60`;
      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      ctx.stroke();

      // Glow for selected
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius + 4, 0, Math.PI * 2);
        ctx.strokeStyle = `${meta.color}30`;
        ctx.lineWidth = 4;
        ctx.stroke();
      }

      // Icon
      ctx.font = `${isSelected ? 16 : 14}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(meta.icon, pos.x, pos.y);

      // Label
      ctx.font = `${isSelected ? "bold " : ""}10px monospace`;
      ctx.fillStyle = dimmed ? "rgba(90,101,119,0.4)" : "#e0e0e0";
      ctx.textAlign = "center";
      ctx.fillText(
        node.label.length > 18 ? node.label.slice(0, 16) + "..." : node.label,
        pos.x,
        pos.y + radius + 12
      );
    });

    ctx.restore();
  }, [positions, edges, nodes, selectedNode, zoom, offset]);

  const handleClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - offset.x) / zoom;
    const y = (e.clientY - rect.top - offset.y) / zoom;

    let clicked = null;
    nodes.forEach((node) => {
      const pos = positions[node.id];
      if (!pos) return;
      const dist = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2);
      if (dist < 22) clicked = node.id;
    });
    onSelectNode(clicked);
  };

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      onClick={handleClick}
      style={{
        width: "100%",
        height: "100%",
        cursor: "crosshair",
        background: "radial-gradient(ellipse at center, rgba(0,240,255,0.02) 0%, transparent 70%)",
      }}
    />
  );
}

/* ================================================================
   NODE DETAIL PANEL
   ================================================================ */
function NodeDetail({ node, edges, allNodes }) {
  if (!node) return null;
  const meta = NODE_TYPES[node.type] || NODE_TYPES.target;

  const connections = edges
    .filter((e) => e.from === node.id || e.to === node.id)
    .map((e) => {
      const otherId = e.from === node.id ? e.to : e.from;
      const otherNode = allNodes.find((n) => n.id === otherId);
      return { edge: e, node: otherNode };
    })
    .filter((c) => c.node);

  return (
    <div className="panel" style={{ borderColor: meta.color, borderWidth: 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 28 }}>{meta.icon}</span>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, color: "var(--text-primary)" }}>{node.label}</h3>
          <span style={{ fontSize: 12, color: meta.color, fontWeight: 600 }}>{meta.label}</span>
        </div>
      </div>

      {/* Node Data */}
      {node.data && Object.keys(node.data).length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {Object.entries(node.data).map(([key, value]) => (
            <div key={key} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid var(--border-color)" }}>
              <span style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "capitalize" }}>{key}</span>
              <span style={{
                fontSize: 12, fontWeight: 600,
                color: key === "severity"
                  ? value === "critical" ? "#ff0040" : value === "high" ? "#ff6b00" : "#ffe600"
                  : "var(--text-primary)",
              }}>
                {String(value)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Connections */}
      <h4 style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>
        Connections ({connections.length})
      </h4>
      <div style={{ maxHeight: 200, overflowY: "auto" }}>
        {connections.map((c, idx) => {
          const cMeta = NODE_TYPES[c.node.type] || NODE_TYPES.target;
          return (
            <div
              key={idx}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "6px 0",
                borderBottom: "1px solid var(--border-color)",
              }}
            >
              <span style={{ fontSize: 14 }}>{cMeta.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: "var(--text-primary)" }}>{c.node.label}</div>
                <div style={{ fontSize: 10, color: cMeta.color }}>{c.edge.label}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================
   MAIN KNOWLEDGE GRAPH PAGE
   ================================================================ */
export default function KnowledgeGraph() {
  const [selectedNode, setSelectedNode] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [offset] = useState({ x: 0, y: 0 });
  const [filterType, setFilterType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Merge sample data with live agents/missions
  const { data: agents } = useQuery({
    queryKey: ["agents"],
    queryFn: () => agentsAPI.list().then((r) => r.data),
  });

  const { data: missions } = useQuery({
    queryKey: ["missions"],
    queryFn: () => missionsAPI.list().then((r) => r.data),
  });

  const allNodes = useMemo(() => {
    let nodes = [...SAMPLE_NODES];
    // Add live agents
    if (agents && Array.isArray(agents)) {
      agents.forEach((a) => {
        nodes.push({
          id: `agent-${a.id}`,
          type: "agent",
          label: a.name,
          data: { status: a.status, personality: a.personality || "N/A" },
        });
      });
    }
    // Add live missions
    const missionList = missions?.missions || missions || [];
    if (Array.isArray(missionList)) {
      missionList.forEach((m) => {
        nodes.push({
          id: `mission-${m.id}`,
          type: "mission",
          label: m.name,
          data: { status: m.status, priority: m.priority || "medium" },
        });
      });
    }
    return nodes;
  }, [agents, missions]);

  const allEdges = useMemo(() => {
    let edgeList = [...SAMPLE_EDGES];
    // Connect agents to missions
    const missionList = missions?.missions || missions || [];
    if (agents && Array.isArray(agents) && Array.isArray(missionList)) {
      agents.forEach((a) => {
        if (a.missions) {
          a.missions.forEach((m) => {
            edgeList.push({
              from: `agent-${a.id}`,
              to: `mission-${m.id || m}`,
              label: "assigned_to",
            });
          });
        }
      });
    }
    return edgeList;
  }, [agents, missions]);

  const filteredNodes = useMemo(() => {
    let nodes = allNodes;
    if (filterType !== "all") {
      nodes = nodes.filter((n) => n.type === filterType);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      nodes = nodes.filter((n) => n.label.toLowerCase().includes(q));
    }
    return nodes;
  }, [allNodes, filterType, searchQuery]);

  const filteredEdges = useMemo(() => {
    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    return allEdges.filter((e) => nodeIds.has(e.from) && nodeIds.has(e.to));
  }, [filteredNodes, allEdges]);

  const selectedNodeObj = allNodes.find((n) => n.id === selectedNode);

  // Stats
  const typeCounts = useMemo(() => {
    const counts = {};
    allNodes.forEach((n) => {
      counts[n.type] = (counts[n.type] || 0) + 1;
    });
    return counts;
  }, [allNodes]);

  return (
    <div>
      <div className="page-header">
        <h2>
          <MdAccountTree style={{ verticalAlign: "middle", marginRight: 8, color: "var(--neon-cyan)" }} />
          Intel Graph
        </h2>
        <p>
          Interactive knowledge graph &mdash; {allNodes.length} nodes, {allEdges.length} relationships
        </p>
      </div>

      {/* Stats */}
      <div className="panel-grid" style={{ marginBottom: 16 }}>
        {Object.entries(NODE_TYPES).map(([type, meta]) => (
          <div
            key={type}
            className="stat-card"
            style={{ cursor: "pointer", borderColor: filterType === type ? meta.color : undefined }}
            onClick={() => setFilterType(filterType === type ? "all" : type)}
          >
            <div className="stat-icon" style={{ background: `${meta.color}15`, color: meta.color }}>
              <span style={{ fontSize: 20 }}>{meta.icon}</span>
            </div>
            <div>
              <div className="stat-value">{typeCounts[type] || 0}</div>
              <div className="stat-label">{meta.label}s</div>
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: "1 1 250px", position: "relative" }}>
          <MdSearch style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            className="form-input"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
        </div>
        <select
          className="form-select"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{ flex: "0 0 160px" }}
        >
          <option value="all">All Types</option>
          {Object.entries(NODE_TYPES).map(([type, meta]) => (
            <option key={type} value={type}>{meta.icon} {meta.label}</option>
          ))}
        </select>
        <div style={{ display: "flex", gap: 4 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setZoom((z) => Math.min(z + 0.2, 3))}>
            <MdZoomIn />
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setZoom((z) => Math.max(z - 0.2, 0.3))}>
            <MdZoomOut />
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => { setZoom(1); setSelectedNode(null); }}>
            <MdCenterFocusStrong /> Reset
          </button>
        </div>
      </div>

      {/* Graph + Detail */}
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <div
          className="panel"
          style={{
            flex: 1,
            padding: 0,
            overflow: "hidden",
            minHeight: 500,
            position: "relative",
            background: "#0a0c14",
          }}
        >
          {/* Grid overlay */}
          <div style={{
            position: "absolute", inset: 0, opacity: 0.03,
            backgroundImage: "linear-gradient(rgba(0,240,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            pointerEvents: "none",
          }} />

          <GraphCanvas
            nodes={filteredNodes}
            edges={filteredEdges}
            selectedNode={selectedNode}
            onSelectNode={setSelectedNode}
            zoom={zoom}
            offset={offset}
          />

          {/* Legend */}
          <div style={{
            position: "absolute", bottom: 12, left: 12, display: "flex", flexWrap: "wrap", gap: 8,
            background: "rgba(10,12,20,0.85)", padding: "8px 12px", borderRadius: "var(--radius)",
            border: "1px solid var(--border-color)",
          }}>
            {Object.entries(NODE_TYPES).map(([type, meta]) => (
              <span key={type} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: meta.color }}>
                {meta.icon} {meta.label}
              </span>
            ))}
          </div>
        </div>

        {/* Detail Panel */}
        {selectedNodeObj && (
          <div style={{ width: 300, flexShrink: 0 }}>
            <NodeDetail node={selectedNodeObj} edges={allEdges} allNodes={allNodes} />
          </div>
        )}
      </div>
    </div>
  );
}
