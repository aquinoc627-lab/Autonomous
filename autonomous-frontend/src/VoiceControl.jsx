import React, { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useVoiceEngine, parseVoiceCommand } from "./useVoiceEngine";
import { useToast } from "./ToastContext";
import { autonomousAPI, agentsAPI, missionsAPI } from "./api";
import { MdMic, MdMicOff } from "react-icons/md";

export default function VoiceControl() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const {
    isListening,
    transcript,
    isSpeaking,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  } = useVoiceEngine();

  // Process voice commands when transcription is complete
  useEffect(() => {
    if (transcript && !isListening) {
      handleVoiceCommand(transcript);
    }
  }, [transcript, isListening]);

  const handleVoiceCommand = useCallback(
    async (text) => {
      const command = parseVoiceCommand(text);

      try {
        switch (command.type) {
          case "agent_status":
            handleAgentStatus(command.agent);
            break;

          case "assign_mission":
            await handleAssignMission(command.mission, command.agent);
            break;

          case "navigate":
            navigate(`/${command.page === "autonomous" ? "" : command.page}`);
            speak(`Navigating to ${command.page}`);
            addToast({
              type: "info",
              title: "Voice Command",
              message: `Navigating to ${command.page}`,
            });
            break;

          case "toggle_autonomous":
            await handleToggleAutonomous(command.enabled);
            break;

          case "clear_notifications":
            speak("Clearing notifications");
            addToast({
              type: "info",
              title: "Voice Command",
              message: "Notifications cleared",
            });
            break;

          case "help":
            speak(
              "Available commands: Status of agent name, Assign mission name to agent name, Show missions agents banter or analytics, Enable or disable autonomous mode, Clear notifications"
            );
            break;

          case "unknown":
            speak("Sorry, I didn't understand that command. Please try again.");
            addToast({
              type: "warning",
              title: "Voice Command",
              message: `Unrecognized command: "${text}"`,
            });
            break;

          default:
            break;
        }
      } catch (error) {
        console.error("Error handling voice command:", error);
        speak("An error occurred while processing your command");
        addToast({
          type: "error",
          title: "Voice Command Error",
          message: error.message,
        });
      }
    },
    [navigate, speak, addToast]
  );

  const handleAgentStatus = async (agentName) => {
    try {
      const res = await agentsAPI.list();
      const agent = res.data.find(
        (a) => a.name.toLowerCase() === agentName.toLowerCase()
      );

      if (agent) {
        const statusMessage = `Agent ${agent.name} is currently ${agent.status}. ${
          agent.description || ""
        }`;
        speak(statusMessage);
        addToast({
          type: "info",
          title: "Agent Status",
          message: statusMessage,
        });
      } else {
        speak(`Agent ${agentName} not found`);
        addToast({
          type: "warning",
          title: "Agent Not Found",
          message: `Could not find agent named ${agentName}`,
        });
      }
    } catch (error) {
      console.error("Error fetching agent status:", error);
      speak("Error fetching agent status");
    }
  };

  const handleAssignMission = async (missionName, agentName) => {
    try {
      const missionsRes = await missionsAPI.list();
      const mission = missionsRes.data.find(
        (m) => m.name.toLowerCase() === missionName.toLowerCase()
      );

      const agentsRes = await agentsAPI.list();
      const agent = agentsRes.data.find(
        (a) => a.name.toLowerCase() === agentName.toLowerCase()
      );

      if (!mission) {
        speak(`Mission ${missionName} not found`);
        return;
      }

      if (!agent) {
        speak(`Agent ${agentName} not found`);
        return;
      }

      // Assign mission to agent
      await agentsAPI.assignMission(agent.id, mission.id);

      const message = `Mission ${mission.name} assigned to ${agent.name}`;
      speak(message);
      addToast({
        type: "success",
        title: "Mission Assigned",
        message,
      });
    } catch (error) {
      console.error("Error assigning mission:", error);
      speak("Error assigning mission");
    }
  };

  const handleToggleAutonomous = async (enabled) => {
    try {
      await autonomousAPI.toggle(enabled);
      const message = `Agent Brain is now ${enabled ? "online" : "offline"}`;
      speak(message);
      addToast({
        type: enabled ? "success" : "warning",
        title: "Autonomous Mode",
        message,
      });
    } catch (error) {
      console.error("Error toggling autonomous mode:", error);
      speak("Error toggling autonomous mode");
    }
  };

  return (
    <div className="voice-control-widget">
      <button
        className={`voice-control-btn ${isListening ? "listening" : ""} ${
          isSpeaking ? "speaking" : ""
        }`}
        onClick={isListening ? stopListening : startListening}
        title={isListening ? "Stop listening" : "Start listening"}
      >
        {isListening ? <MdMicOff size={20} /> : <MdMic size={20} />}
      </button>

      {isListening && (
        <div className="voice-control-status">
          <span className="listening-dot" />
          Listening...
        </div>
      )}

      {isSpeaking && (
        <div className="voice-control-status speaking">
          <span className="speaking-dot" />
          Speaking...
        </div>
      )}

      {transcript && (
        <div className="voice-control-transcript">
          You said: "{transcript}"
        </div>
      )}
    </div>
  );
}
