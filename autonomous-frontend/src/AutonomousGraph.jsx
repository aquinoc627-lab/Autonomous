import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { agentsAPI, missionsAPI } from "./api";
import { AgentAvatarInline } from "./AgentAvatar";

export default function AutonomousGraph() {
  const { data: agents } = useQuery({
    queryKey: ["agents-list"],
    queryFn: () => agentsAPI.list().then((r) => r.data),
  });

  const { data: missions } = useQuery({
    queryKey: ["missions-list-all"],
    queryFn: () => missionsAPI.list({ parent_id: "all" }).then((r) => r.data),
  });

  // Build a map of agents for easy lookup
  const agentMap = useMemo(() => {
    const map = {};
    if (agents) {
      agents.forEach((a) => (map[a.id] = a));
    }
    return map;
  }, [agents]);

  // Filter sub-tasks and top-level missions
  const topLevelMissions = useMemo(() => {
    return missions?.filter((m) => !m.parent_id) || [];
  }, [missions]);

  const subTasks = useMemo(() => {
    return missions?.filter((m) => m.parent_id) || [];
  }, [missions]);

  return (
    <div className="autonomous-graph-container">
      <div className="page-header">
        <h2>Autonomous Collaboration</h2>
        <p>Visualizing agent relationships and task delegations</p>
      </div>

      <div className="panel" style={{ minHeight: "500px" }}>
        <div className="autonomous-graph-legend">
          <div className="legend-item">
            <span className="legend-dot mission" /> Mission
          </div>
          <div className="legend-item">
            <span className="legend-dot subtask" /> Sub-task
          </div>
          <div className="legend-item">
            <span className="legend-dot agent" /> Agent
          </div>
        </div>

        <div className="autonomous-graph-content">
          {topLevelMissions.map((mission) => (
            <div key={mission.id} className="mission-tree">
              <div className="mission-node">
                <div className="node-icon mission">M</div>
                <div className="node-info">
                  <div className="node-name">{mission.name}</div>
                  <div className={`node-status ${mission.status}`}>{mission.status}</div>
                </div>
              </div>

              <div className="subtask-container">
                {subTasks
                  .filter((st) => st.parent_id === mission.id)
                  .map((subtask) => (
                    <div key={subtask.id} className="subtask-branch">
                      <div className="branch-line" />
                      <div className="subtask-node">
                        <div className="node-icon subtask">S</div>
                        <div className="node-info">
                          <div className="node-name">{subtask.name}</div>
                          <div className={`node-status ${subtask.status}`}>{subtask.status}</div>
                        </div>
                        
                        {/* Show assigned agent if any */}
                        {subtask.agent_id && agentMap[subtask.agent_id] && (
                          <div className="assigned-agent-tag">
                            <AgentAvatarInline agent={agentMap[subtask.agent_id]} size={20} />
                            <span>{agentMap[subtask.agent_id].name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                
                {subTasks.filter((st) => st.parent_id === mission.id).length === 0 && (
                  <div className="no-subtasks">No active delegations</div>
                )}
              </div>
            </div>
          ))}

          {topLevelMissions.length === 0 && (
            <div className="empty-graph">
              <p>No active missions to visualize.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
