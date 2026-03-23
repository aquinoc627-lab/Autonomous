import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { toolsAPI } from "./api";
import {
  MdTerminal,
  MdContentCopy,
  MdDeleteSweep,
  MdPlayArrow,
  MdSecurity,
  MdSmartToy,
  MdInfo,
} from "react-icons/md";

/* ================================================================
   TERMINAL PAGE — Full-screen interactive terminal
   ================================================================ */

const WELCOME_BANNER = [
  "",
  "  ╔══════════════════════════════════════════════════════════╗",
  "  ║                                                          ║",
  "  ║    ████████╗██╗  ██╗███████╗██╗  ██╗██╗██╗   ██╗███████╗║",
  "  ║    ╚══██╔══╝██║  ██║██╔════╝██║  ██║██║██║   ██║██╔════╝║",
  "  ║       ██║   ███████║█████╗  ███████║██║██║   ██║█████╗  ║",
  "  ║       ██║   ██╔══██║██╔══╝  ██╔══██║██║╚██╗ ██╔╝██╔══╝  ║",
  "  ║       ██║   ██║  ██║███████╗██║  ██║██║ ╚████╔╝ ███████╗║",
  "  ║       ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚══════╝║",
  "  ║                                                          ║",
  "  ║             Autonomous Intelligence Terminal             ║",
  "  ║                    v2.0 — Autonomous                     ║",
  "  ╚══════════════════════════════════════════════════════════╝",
  "",
  "  Type 'help' for available commands. Type 'tools' to list arsenal.",
  "",
];

const HELP_TEXT = [
  "",
  "  ┌─────────────────────────────────────────────────────────┐",
  "  │                    AVAILABLE COMMANDS                    │",
  "  ├─────────────────────────────────────────────────────────┤",
  "  │  help              Show this help message               │",
  "  │  tools             List all available tools             │",
  "  │  tools <category>  List tools in a category             │",
  "  │  info <tool_id>    Show detailed info about a tool      │",
  "  │  run <tool_id>     Generate command for a tool          │",
  "  │  stats             Show tool arsenal statistics         │",
  "  │  clear             Clear the terminal                   │",
  "  │  banner            Show the welcome banner              │",
  "  │  whoami            Show current user info               │",
  "  │  uptime            Show system uptime                   │",
  "  │  history           Show command history                 │",
  "  └─────────────────────────────────────────────────────────┘",
  "",
];

export default function Terminal() {
  const { user } = useAuth();
  const [lines, setLines] = useState([...WELCOME_BANNER]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  const termRef = useRef(null);
  const inputRef = useRef(null);
  const startTime = useRef(Date.now());

  const scrollToBottom = useCallback(() => {
    if (termRef.current) {
      termRef.current.scrollTop = termRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [lines, scrollToBottom]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const addLines = useCallback((newLines) => {
    setLines((prev) => [...prev, ...newLines]);
  }, []);

  const addLine = useCallback((line) => {
    setLines((prev) => [...prev, line]);
  }, []);

  const handleCommand = useCallback(
    async (cmd) => {
      const trimmed = cmd.trim();
      if (!trimmed) return;

      setHistory((prev) => [...prev, trimmed]);
      setHistoryIdx(-1);
      addLine(`  \x1b[36mautonomous@${user?.username || "operator"}\x1b[0m:\x1b[33m~\x1b[0m$ ${trimmed}`);

      const parts = trimmed.split(/\s+/);
      const command = parts[0].toLowerCase();
      const args = parts.slice(1);

      setIsProcessing(true);

      try {
        switch (command) {
          case "help":
            addLines(HELP_TEXT);
            break;

          case "clear":
            setLines([]);
            break;

          case "banner":
            addLines(WELCOME_BANNER);
            break;

          case "whoami":
            addLines([
              "",
              `  User:  ${user?.username || "unknown"}`,
              `  Role:  ${user?.role || "unknown"}`,
              `  Auth:  JWT Token Active`,
              "",
            ]);
            break;

          case "uptime": {
            const elapsed = Math.floor((Date.now() - startTime.current) / 1000);
            const h = Math.floor(elapsed / 3600);
            const m = Math.floor((elapsed % 3600) / 60);
            const s = elapsed % 60;
            addLines([
              "",
              `  Session uptime: ${h}h ${m}m ${s}s`,
              `  Started: ${new Date(startTime.current).toLocaleString()}`,
              "",
            ]);
            break;
          }

          case "history":
            if (history.length === 0) {
              addLine("  No command history.");
            } else {
              addLine("");
              history.forEach((h, i) => addLine(`  ${i + 1}  ${h}`));
              addLine("");
            }
            break;

          case "tools": {
            try {
              const category = args[0] || null;
              const params = category ? { category } : {};
              const res = await toolsAPI.list(params);
              const tools = res.data.tools || res.data;
              if (!tools || tools.length === 0) {
                addLine("  No tools found.");
              } else {
                addLine("");
                addLine(`  ┌──────────────────┬──────────────────┬──────────┬──────────┐`);
                addLine(`  │ ID               │ Name             │ Category │ Severity │`);
                addLine(`  ├──────────────────┼──────────────────┼──────────┼──────────┤`);
                tools.forEach((t) => {
                  const id = (t.id || "").padEnd(16).slice(0, 16);
                  const name = (t.name || "").padEnd(16).slice(0, 16);
                  const cat = (t.category || "").padEnd(8).slice(0, 8);
                  const sev = (t.severity || "info").padEnd(8).slice(0, 8);
                  addLine(`  │ ${id} │ ${name} │ ${cat} │ ${sev} │`);
                });
                addLine(`  └──────────────────┴──────────────────┴──────────┴──────────┘`);
                addLine(`  Total: ${tools.length} tools`);
                addLine("");
              }
            } catch (err) {
              addLine(`  [ERROR] Failed to fetch tools: ${err.message}`);
            }
            break;
          }

          case "info": {
            if (!args[0]) {
              addLine("  Usage: info <tool_id>");
              break;
            }
            try {
              const res = await toolsAPI.get(args[0]);
              const t = res.data;
              addLines([
                "",
                `  ╔═══ ${t.name} ═══`,
                `  ║ ID:          ${t.id}`,
                `  ║ Category:    ${t.category}`,
                `  ║ Severity:    ${t.severity}`,
                `  ║ Description: ${t.description}`,
                `  ║ OS Support:  ${(t.os_support || []).join(", ")}`,
                `  ║ Website:     ${t.website || "N/A"}`,
                `  ╚═══════════════════`,
                "",
              ]);
              if (t.parameters && t.parameters.length > 0) {
                addLine("  Parameters:");
                t.parameters.forEach((p) => {
                  addLine(`    - ${p.name} (${p.type}${p.required ? ", required" : ""}): ${p.description || ""}`);
                });
                addLine("");
              }
            } catch (err) {
              addLine(`  [ERROR] Tool not found: ${args[0]}`);
            }
            break;
          }

          case "run": {
            if (!args[0]) {
              addLine("  Usage: run <tool_id> [param=value ...]");
              break;
            }
            try {
              const params = {};
              args.slice(1).forEach((a) => {
                const [k, ...v] = a.split("=");
                if (k && v.length) params[k] = v.join("=");
              });
              const res = await toolsAPI.generate({
                tool_id: args[0],
                parameters: params,
                target_os: "linux",
              });
              const data = res.data;
              if (data.status === "requires_confirmation") {
                addLines([
                  "",
                  `  ⚠  CONFIRMATION REQUIRED`,
                  `  This tool requires admin confirmation before execution.`,
                  `  Confirmation code: ${data.confirmation_code || "N/A"}`,
                  "",
                ]);
              } else if (data.command) {
                addLines([
                  "",
                  `  Generated command:`,
                  `  $ ${data.command}`,
                  "",
                ]);
              } else {
                addLine(`  [INFO] ${JSON.stringify(data)}`);
              }
            } catch (err) {
              const detail = err.response?.data?.detail || err.message;
              addLine(`  [ERROR] ${detail}`);
            }
            break;
          }

          case "stats": {
            try {
              const res = await toolsAPI.stats();
              const s = res.data;
              addLines([
                "",
                `  ┌─── Tool Arsenal Stats ───┐`,
                `  │ Total Tools:    ${s.total_tools || 0}`,
                `  │ Categories:     ${s.total_categories || 0}`,
                `  │ Linux Tools:    ${s.os_breakdown?.linux || 0}`,
                `  │ Windows Tools:  ${s.os_breakdown?.windows || 0}`,
                `  │ Android Tools:  ${s.os_breakdown?.android || 0}`,
                `  └──────────────────────────┘`,
                "",
              ]);
            } catch (err) {
              addLine(`  [ERROR] Failed to fetch stats: ${err.message}`);
            }
            break;
          }

          default:
            addLine(`  Command not found: ${command}. Type 'help' for available commands.`);
        }
      } catch (err) {
        addLine(`  [ERROR] ${err.message}`);
      }

      setIsProcessing(false);
    },
    [user, history, addLine, addLines]
  );

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !isProcessing) {
      handleCommand(input);
      setInput("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length > 0) {
        const newIdx = historyIdx < history.length - 1 ? historyIdx + 1 : historyIdx;
        setHistoryIdx(newIdx);
        setInput(history[history.length - 1 - newIdx] || "");
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIdx > 0) {
        const newIdx = historyIdx - 1;
        setHistoryIdx(newIdx);
        setInput(history[history.length - 1 - newIdx] || "");
      } else {
        setHistoryIdx(-1);
        setInput("");
      }
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
    }
  };

  const handleCopy = () => {
    const text = lines.join("\n");
    navigator.clipboard.writeText(text);
  };

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2>
            <MdTerminal style={{ verticalAlign: "middle", marginRight: 8, color: "var(--neon-green)" }} />
            Terminal
          </h2>
          <p>Interactive command interface &mdash; execute tools, query arsenal, and monitor output</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={handleCopy} title="Copy output">
            <MdContentCopy /> Copy
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setLines([])} title="Clear terminal">
            <MdDeleteSweep /> Clear
          </button>
        </div>
      </div>

      <div
        className="panel terminal-fullpage"
        onClick={() => inputRef.current?.focus()}
        style={{
          background: "#0a0a0a",
          border: "1px solid rgba(0,240,255,0.15)",
          borderRadius: "var(--radius-lg)",
          padding: 0,
          overflow: "hidden",
          minHeight: "calc(100vh - 280px)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Terminal Header Bar */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8, padding: "8px 16px",
          background: "rgba(0,240,255,0.04)", borderBottom: "1px solid rgba(0,240,255,0.1)",
        }}>
          <div style={{ display: "flex", gap: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#ff5f57" }} />
            <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#febc2e" }} />
            <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#28c840" }} />
          </div>
          <span style={{ flex: 1, textAlign: "center", fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            Autonomous Terminal — {user?.username || "operator"}@autonomous
          </span>
          <div style={{ display: "flex", gap: 8, fontSize: 11, color: "var(--text-muted)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <MdSmartToy style={{ fontSize: 14 }} /> AI Ready
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <MdSecurity style={{ fontSize: 14, color: "var(--neon-green)" }} /> Secure
            </span>
          </div>
        </div>

        {/* Terminal Output */}
        <div
          ref={termRef}
          style={{
            flex: 1, overflowY: "auto", padding: "12px 16px",
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
            fontSize: 13, lineHeight: 1.6, color: "#e0e0e0",
            minHeight: 400,
          }}
        >
          {lines.map((line, idx) => (
            <div key={idx} style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
              {line.includes("[ERROR]") ? (
                <span style={{ color: "#ff0040" }}>{line}</span>
              ) : line.includes("[INFO]") ? (
                <span style={{ color: "#00f0ff" }}>{line}</span>
              ) : line.includes("⚠") || line.includes("CONFIRMATION") ? (
                <span style={{ color: "#ffe600" }}>{line}</span>
              ) : line.includes("$") && line.includes("autonomous@") ? (
                <span>
                  <span style={{ color: "#00f0ff" }}>{line.split("$")[0]}$</span>
                  <span style={{ color: "#e0e0e0" }}>{line.split("$").slice(1).join("$")}</span>
                </span>
              ) : line.includes("═") || line.includes("║") || line.includes("╔") || line.includes("╚") || line.includes("╗") || line.includes("╝") ? (
                <span style={{ color: "#00f0ff" }}>{line}</span>
              ) : line.includes("┌") || line.includes("└") || line.includes("├") || line.includes("│") ? (
                <span style={{ color: "rgba(0,240,255,0.6)" }}>{line}</span>
              ) : (
                <span>{line}</span>
              )}
            </div>
          ))}

          {/* Input Line */}
          <div style={{ display: "flex", alignItems: "center", marginTop: 4 }}>
            <span style={{ color: "#00f0ff", marginRight: 4 }}>
              autonomous@{user?.username || "operator"}
            </span>
            <span style={{ color: "#ffe600", marginRight: 4 }}>:</span>
            <span style={{ color: "#ffe600", marginRight: 8 }}>~$</span>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isProcessing}
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                color: "#e0e0e0", fontFamily: "inherit", fontSize: "inherit",
                caretColor: "var(--neon-cyan)",
              }}
              autoFocus
              spellCheck={false}
              autoComplete="off"
            />
            {isProcessing && (
              <span style={{ color: "var(--neon-cyan)", fontSize: 12, animation: "statusPulse 1s infinite" }}>
                processing...
              </span>
            )}
          </div>
        </div>

        {/* Terminal Footer */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "6px 16px", background: "rgba(0,240,255,0.04)",
          borderTop: "1px solid rgba(0,240,255,0.1)", fontSize: 11, color: "var(--text-muted)",
        }}>
          <span>Lines: {lines.length} | History: {history.length}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span><MdInfo style={{ fontSize: 13, verticalAlign: "middle" }} /> Ctrl+L to clear</span>
            <span>↑↓ for history</span>
          </span>
        </div>
      </div>
    </div>
  );
}
