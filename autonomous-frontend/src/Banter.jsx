import React, { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { banterAPI, missionsAPI, agentsAPI } from "./api";
import { useWebSocket } from "./useWebSocket";
import { useVoiceEngine } from "./useVoiceEngine";
import { AgentAvatarInline } from "./AgentAvatar";
import { MdSend, MdVolumeUp } from "react-icons/md";

const MSG_TYPES = ["chat", "system", "alert", "status_update"];

export default function Banter() {
  const queryClient = useQueryClient();
  const feedRef = useRef(null);
  const [missionFilter, setMissionFilter] = useState("");
  const [agentFilter, setAgentFilter] = useState("");
  const [message, setMessage] = useState("");
  const [msgType, setMsgType] = useState("chat");
  const [speakingMsgId, setSpeakingMsgId] = useState(null);
  const { speak, stopSpeaking } = useVoiceEngine();

  const onWsMessage = useCallback(
    (msg) => {
      if (msg.event === "banter_created" || msg.event === "banter_deleted") {
        queryClient.invalidateQueries({ queryKey: ["banter"] });
      }
    },
    [queryClient]
  );

  const { connected } = useWebSocket(onWsMessage);

  const { data: banterMsgs } = useQuery({
    queryKey: ["banter", missionFilter, agentFilter],
    queryFn: () => {
      const params = { limit: 100 };
      if (missionFilter) params.mission_id = missionFilter;
      if (agentFilter) params.agent_id = agentFilter;
      return banterAPI.list(params).then((r) => r.data);
    },
    refetchInterval: 5000,
  });

  const { data: missions } = useQuery({
    queryKey: ["missions-list"],
    queryFn: () => missionsAPI.list().then((r) => r.data),
  });

  const { data: agents } = useQuery({
    queryKey: ["agents-list"],
    queryFn: () => agentsAPI.list().then((r) => r.data),
  });

  // Build agent lookup by ID for avatars
  const agentMap = useMemo(() => {
    const map = {};
    if (agents) {
      for (const a of agents) {
        map[a.id] = a;
      }
    }
    return map;
  }, [agents]);

  const sendMut = useMutation({
    mutationFn: (data) => banterAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banter"] });
      setMessage("");
    },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [banterMsgs]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    const payload = {
      message: message.trim(),
      message_type: msgType,
    };
    if (missionFilter) payload.mission_id = missionFilter;
    if (agentFilter) payload.agent_id = agentFilter;
    sendMut.mutate(payload);
  };

  // Reverse for chronological display (API returns newest first)
  const sortedMsgs = [...(banterMsgs || [])].reverse();

  // Determine which messages are "recent" (within last 10 seconds) for speaking animation
  const recentCutoff = Date.now() - 10000;

  const handleSpeak = (msgId, text, persona) => {
    if (speakingMsgId === msgId) {
      stopSpeaking();
      setSpeakingMsgId(null);
    } else {
      speak(text, persona || "Analytical & Thorough");
      setSpeakingMsgId(msgId);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Banter Panel</h2>
        <p>
          Real-time communication feed&nbsp;
          <span className="ws-indicator">
            <span className={`ws-dot ${connected ? "connected" : ""}`} />
            {connected ? "Live" : "Reconnecting..."}
          </span>
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexDirection: window.innerWidth <= 480 ? "column" : "row" }}>
        <div className="form-group" style={{ margin: 0, flex: 1 }}>
          <label>Filter by Mission</label>
          <select className="form-select" value={missionFilter} onChange={(e) => setMissionFilter(e.target.value)}>
            <option value="">All Missions</option>
            {missions?.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ margin: 0, flex: 1 }}>
          <label>Filter by Agent</label>
          <select className="form-select" value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)}>
            <option value="">All Agents</option>
            {agents?.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Chat Panel */}
      <div className="panel" style={{ display: "flex", flexDirection: "column", height: window.innerWidth <= 480 ? "calc(100vh - 320px)" : "calc(100vh - 280px)", padding: 0 }}>
        {/* Feed */}
        <div className="banter-feed" ref={feedRef}>
          {sortedMsgs.length === 0 && (
            <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 40 }}>
              No messages yet. Start the conversation!
            </div>
          )}
          {sortedMsgs.map((b) => {
            const linkedAgent = b.agent_id ? agentMap[b.agent_id] : null;
            const isRecent = new Date(b.created_at).getTime() > recentCutoff;

            return (
              <div key={b.id} className={`banter-msg ${b.message_type}`}>
                <div className="banter-msg-with-avatar">
                  {/* Agent avatar or system icon */}
                  {linkedAgent ? (
                    <AgentAvatarInline
                      agent={linkedAgent}
                      size={30}
                      speaking={isRecent}
                    />
                  ) : (
                    <div style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      background: b.message_type === "system" ? "rgba(0,240,255,0.1)" : "rgba(255,255,255,0.05)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                      color: b.message_type === "system" ? "var(--neon-cyan)" : "var(--text-muted)",
                      flexShrink: 0,
                      border: `1px solid ${b.message_type === "alert" ? "var(--neon-red)" : "var(--border-color)"}`,
                    }}>
                      {b.message_type === "system" ? "S" : b.message_type === "alert" ? "!" : "U"}
                    </div>
                  )}

                  <div className="msg-content">
                    <div className="msg-header">
                      <span className="msg-sender" style={{ color: linkedAgent?.persona?.avatar_color || "var(--text-secondary)" }}>
                        {linkedAgent ? linkedAgent.name : (b.sender_id ? b.sender_id.slice(0, 8) : "System")}
                      </span>
                      {linkedAgent && (
                        <span style={{ fontSize: 10, color: "var(--text-muted)", fontStyle: "italic" }}>
                          {linkedAgent.persona?.personality || ""}
                        </span>
                      )}
                      <span className={`badge ${b.message_type}`} style={{ fontSize: 10, padding: "1px 6px" }}>
                        {b.message_type}
                      </span>
                      {linkedAgent && (
                        <button
                          className={`msg-speak-btn ${speakingMsgId === b.id ? "active" : ""}`}
                          onClick={() => handleSpeak(b.id, b.message, linkedAgent.persona?.personality)}
                          title="Hear this message"
                        >
                          <MdVolumeUp size={14} />
                        </button>
                      )}
                      <span className="msg-time">
                        {new Date(b.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="msg-text">{b.message}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Compose */}
        <form className="banter-compose" onSubmit={handleSend}>
          <select
            className="form-select"
            value={msgType}
            onChange={(e) => setMsgType(e.target.value)}
            style={{ width: 130, flex: "none" }}
          >
            {MSG_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <input
            className="form-input"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button className="btn btn-primary" type="submit" disabled={sendMut.isPending}>
            <MdSend />
          </button>
        </form>
      </div>
    </div>
  );
}
