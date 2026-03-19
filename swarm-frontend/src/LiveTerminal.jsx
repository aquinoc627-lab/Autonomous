import React, { useState, useEffect, useRef } from 'react';

/**
 * LiveTerminal Component
 * Displays real-time code execution output and logs from agents.
 */
const LiveTerminal = ({ agentId, isOpen, onClose }) => {
  const [logs, setLogs] = useState([]);
  const terminalRef = useRef(null);

  useEffect(() => {
    // Auto-scroll to bottom when new logs arrive
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  if (!isOpen) return null;

  return (
    <div className="live-terminal-overlay">
      <div className="live-terminal-container">
        <div className="live-terminal-header">
          <h3>Live Terminal — Agent {agentId}</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        
        <div className="live-terminal-body" ref={terminalRef}>
          {logs.length === 0 ? (
            <div className="terminal-empty">Waiting for output...</div>
          ) : (
            logs.map((log, idx) => (
              <div key={idx} className={`terminal-line terminal-${log.type}`}>
                <span className="terminal-timestamp">[{log.timestamp}]</span>
                <span className="terminal-message">{log.message}</span>
              </div>
            ))
          )}
        </div>

        <div className="live-terminal-footer">
          <button className="terminal-btn" onClick={clearLogs}>Clear Logs</button>
        </div>
      </div>
    </div>
  );
};

export default LiveTerminal;
