import React, { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { analyticsAPI, agentsAPI, missionsAPI } from "./api";
import { useWebSocket } from "./useWebSocket";
import {
  MdSmartToy,
  MdRocketLaunch,
  MdChat,
  MdPeople,
} from "react-icons/md";

export default function SwarmView() {
  const queryClient = useQueryClient();

  const onWsMessage = useCallback(
    (msg) => {
      if (msg.event) {
        queryClient.invalidateQueries({ queryKey: ["overview"] });
        queryClient.invalidateQueries({ queryKey: ["agents"] });
        queryClient.invalidateQueries({ queryKey: ["missions"] });
      }
    },
    [queryClient]
  );

  const { connected } = useWebSocket(onWsMessage);

  const { data: overview } = useQuery({
    queryKey: ["overview"],
    queryFn: () => analyticsAPI.overview().then((r) => r.data),
    refetchInterval: 15000,
  });

  const { data: agents } = useQuery({
    queryKey: ["agents"],
    queryFn: () => agentsAPI.list().then((r) => r.data),
  });

  const { data: missions } = useQuery({
    queryKey: ["missions"],
    queryFn: () => missionsAPI.list().then((r) => r.data),
  });

  const totals = overview?.totals || {};

  return (
    <div>
      <div className="page-header">
        <h2>Swarm View</h2>
        <p>
          Real-time overview of agents and missions&nbsp;
          <span className="ws-indicator">
            <span className={`ws-dot ${connected ? "connected" : ""}`} />
            {connected ? "Live" : "Reconnecting..."}
          </span>
        </p>
      </div>

      {/* Stat Cards */}
      <div className="panel-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon cyan"><MdSmartToy /></div>
          <div>
            <div className="stat-value">{totals.agents || 0}</div>
            <div className="stat-label">Total Agents</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><MdRocketLaunch /></div>
          <div>
            <div className="stat-value">{totals.missions || 0}</div>
            <div className="stat-label">Total Missions</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple"><MdChat /></div>
          <div>
            <div className="stat-value">{totals.banter || 0}</div>
            <div className="stat-label">Banter Messages</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><MdPeople /></div>
          <div>
            <div className="stat-value">{totals.users || 0}</div>
            <div className="stat-label">Users</div>
          </div>
        </div>
      </div>

      {/* Status Panels */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Agents Panel */}
        <div className="panel">
          <div className="panel-header">
            <h3>Agent Status</h3>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {agents?.map((a) => (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  <td>
                    <span className={`badge ${a.status}`}>
                      <span className="dot" />
                      {a.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Missions Panel */}
        <div className="panel">
          <div className="panel-header">
            <h3>Mission Status</h3>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Priority</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {missions?.map((m) => (
                <tr key={m.id}>
                  <td>{m.name}</td>
                  <td>
                    <span className={`badge ${m.priority}`}>
                      {m.priority}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${m.status}`}>
                      <span className="dot" />
                      {m.status.replace("_", " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
