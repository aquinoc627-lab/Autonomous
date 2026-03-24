import React, { useState, useRef } from "react";
import { osintAPI } from "./api";
import {
  MdSearch,
  MdPerson,
  MdOpenInNew,
  MdCheckCircle,
  MdErrorOutline,
  MdDownload,
} from "react-icons/md";

/* ================================================================
   OSINT — Username & Identity Tracking (Sherlock)
   ================================================================ */
export default function Osint() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const { data } = await osintAPI.sherlock(trimmed);
      if (data.status === "error") {
        setError(data.message);
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(
        err?.response?.data?.detail || "Failed to connect to the backend."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!result?.results?.length) return;
    const rows = [
      ["Platform", "Profile URL"],
      ...result.results.map((r) => [r.site, r.url]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sherlock_${result.target}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: "24px 32px", maxWidth: 900 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2
          style={{
            color: "var(--neon-cyan)",
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 22,
            marginBottom: 6,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <MdPerson size={26} /> Username &amp; Identity Tracking
        </h2>
        <p style={{ color: "var(--text-muted, #8892a4)", fontSize: 14 }}>
          Deploy Sherlock to hunt down a username across 300+ platforms. All
          scans are logged for audit purposes.
        </p>
      </div>

      {/* Search Form */}
      <form
        onSubmit={handleSearch}
        style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}
      >
        <input
          ref={inputRef}
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter target username..."
          maxLength={64}
          disabled={loading}
          style={{
            flex: "1 1 260px",
            padding: "10px 14px",
            background: "rgba(0,0,0,0.4)",
            color: "var(--neon-cyan)",
            border: "1px solid rgba(0,240,255,0.3)",
            borderRadius: 6,
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 14,
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={loading || !username.trim()}
          style={{
            padding: "10px 24px",
            background: loading
              ? "rgba(0,240,255,0.05)"
              : "rgba(0,240,255,0.12)",
            color: "var(--neon-cyan)",
            border: "1px solid var(--neon-cyan)",
            borderRadius: 6,
            cursor: loading || !username.trim() ? "not-allowed" : "pointer",
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            gap: 6,
            opacity: loading || !username.trim() ? 0.6 : 1,
            transition: "background 0.2s",
          }}
        >
          <MdSearch size={18} />
          {loading ? "Scanning…" : "Initiate Hunt"}
        </button>
      </form>

      {/* Loading State */}
      {loading && (
        <div
          style={{
            color: "var(--neon-cyan)",
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 14,
            padding: "16px",
            background: "rgba(0,240,255,0.05)",
            border: "1px solid rgba(0,240,255,0.15)",
            borderRadius: 8,
            marginBottom: 16,
          }}
        >
          ⠋ Running deep scan for <strong>{username.trim()}</strong> across
          300+ platforms. This may take a moment…
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            padding: "14px 16px",
            background: "rgba(255,0,60,0.08)",
            border: "1px solid rgba(255,0,60,0.3)",
            borderRadius: 8,
            color: "var(--neon-red, #ff003c)",
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 14,
          }}
        >
          <MdErrorOutline size={20} style={{ marginTop: 1, flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Results */}
      {result && (
        <div>
          {/* Summary */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 16,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                color:
                  result.accounts_found > 0
                    ? "var(--neon-green, #39ff14)"
                    : "var(--text-muted, #8892a4)",
                fontFamily: "var(--font-mono, monospace)",
                fontSize: 14,
              }}
            >
              <MdCheckCircle size={18} />
              Scan complete —{" "}
              <strong style={{ color: "var(--neon-cyan)" }}>
                {result.accounts_found}
              </strong>{" "}
              account{result.accounts_found !== 1 ? "s" : ""} found for{" "}
              <strong style={{ color: "var(--neon-cyan)" }}>
                {result.target}
              </strong>
            </div>

            {result.accounts_found > 0 && (
              <button
                onClick={handleExportCSV}
                style={{
                  marginLeft: "auto",
                  padding: "6px 14px",
                  background: "rgba(57,255,20,0.08)",
                  color: "var(--neon-green, #39ff14)",
                  border: "1px solid rgba(57,255,20,0.3)",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <MdDownload size={14} /> Export CSV
              </button>
            )}
          </div>

          {/* Table */}
          {result.accounts_found > 0 ? (
            <div
              style={{
                border: "1px solid rgba(0,240,255,0.15)",
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: 13,
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: "rgba(0,240,255,0.06)",
                      borderBottom: "1px solid rgba(0,240,255,0.15)",
                    }}
                  >
                    <th
                      style={{
                        padding: "10px 16px",
                        textAlign: "left",
                        color: "var(--neon-cyan)",
                        fontWeight: 600,
                        width: "30%",
                      }}
                    >
                      Platform
                    </th>
                    <th
                      style={{
                        padding: "10px 16px",
                        textAlign: "left",
                        color: "var(--neon-cyan)",
                        fontWeight: 600,
                      }}
                    >
                      Profile URL
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.results.map((res, i) => (
                    <tr
                      key={res.site}
                      style={{
                        borderBottom:
                          i < result.results.length - 1
                            ? "1px solid rgba(255,255,255,0.05)"
                            : "none",
                        background:
                          i % 2 === 0
                            ? "transparent"
                            : "rgba(255,255,255,0.02)",
                      }}
                    >
                      <td
                        style={{
                          padding: "9px 16px",
                          color: "var(--neon-cyan)",
                        }}
                      >
                        {res.site}
                      </td>
                      <td style={{ padding: "9px 16px" }}>
                        <a
                          href={res.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "var(--text-secondary, #e0e6ed)",
                            textDecoration: "none",
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                          }}
                          onMouseOver={(e) =>
                            (e.currentTarget.style.color =
                              "var(--neon-cyan)")
                          }
                          onMouseOut={(e) =>
                            (e.currentTarget.style.color =
                              "var(--text-secondary, #e0e6ed)")
                          }
                        >
                          {res.url}
                          <MdOpenInNew size={12} style={{ flexShrink: 0 }} />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div
              style={{
                padding: "24px",
                textAlign: "center",
                color: "var(--text-muted, #8892a4)",
                fontFamily: "var(--font-mono, monospace)",
                fontSize: 14,
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 8,
              }}
            >
              No accounts found for <strong>{result.target}</strong> on any
              tracked platform.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
