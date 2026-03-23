import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { agentsAPI } from "./api";
import { Hologram3DCanvas } from "./Hologram3D";
import { useToast } from "./ToastContext";
import { MdAdd, MdSave, MdRefresh } from "react-icons/md";

const PERSONA_PRESETS = {
  analytical: {
    avatar_color: "#00f0ff",
    icon: "brain",
    personality: "Analytical & Methodical",
    voice_style: "neutral",
  },
  stealth: {
    avatar_color: "#39ff14",
    icon: "crosshair",
    personality: "Stealthy & Precise",
    voice_style: "calm",
  },
  aggressive: {
    avatar_color: "#ff006e",
    icon: "bolt",
    personality: "Aggressive & Adaptive",
    voice_style: "assertive",
  },
  observer: {
    avatar_color: "#a0aec0",
    icon: "eye",
    personality: "Observant & Cautious",
    voice_style: "neutral",
  },
  commander: {
    avatar_color: "#ffd700",
    icon: "shield",
    personality: "Strategic & Commanding",
    voice_style: "assertive",
  },
};

const VOICE_STYLES = ["neutral", "assertive", "calm", "urgent"];
const ICONS = ["brain", "shield", "eye", "bolt", "crosshair", "satellite"];

export default function AgentLab() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "idle",
    persona: PERSONA_PRESETS.analytical,
  });

  const [previewAgent, setPreviewAgent] = useState({
    id: "preview",
    name: "New Agent",
    persona: PERSONA_PRESETS.analytical,
  });

  const createMutation = useMutation({
    mutationFn: (data) => agentsAPI.create(data),
    onSuccess: () => {
      addToast("Agent deployed to Autonomous!", "success");
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      setFormData({
        name: "",
        description: "",
        status: "idle",
        persona: PERSONA_PRESETS.analytical,
      });
    },
    onError: (error) => {
      addToast(`Failed to deploy agent: ${error.message}`, "error");
    },
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setPreviewAgent((prev) => ({
      ...prev,
      name: name === "name" ? value : prev.name,
    }));
  };

  const handlePersonaChange = (key, value) => {
    const updated = { ...formData.persona, [key]: value };
    setFormData((prev) => ({
      ...prev,
      persona: updated,
    }));
    setPreviewAgent((prev) => ({
      ...prev,
      persona: updated,
    }));
  };

  const applyPreset = (preset) => {
    setFormData((prev) => ({
      ...prev,
      persona: PERSONA_PRESETS[preset],
    }));
    setPreviewAgent((prev) => ({
      ...prev,
      persona: PERSONA_PRESETS[preset],
    }));
  };

  const handleDeploy = () => {
    if (!formData.name.trim()) {
      addToast("Agent name is required", "warning");
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <div className="agent-lab-container">
      <div className="page-header">
        <h2>Agent Lab</h2>
        <p>Design and deploy new agents to your Autonomous platform</p>
      </div>

      <div className="lab-grid">
        {/* Left: Form */}
        <div className="lab-form-section panel">
          <div className="panel-header">
            <h3>Agent Configuration</h3>
          </div>

          <div className="form-group">
            <label>Agent Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g., Sentinel Alpha"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="What is this agent's purpose?"
              className="form-input"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>Persona Preset</label>
            <div className="preset-buttons">
              {Object.keys(PERSONA_PRESETS).map((preset) => (
                <button
                  key={preset}
                  className={`preset-btn ${
                    formData.persona === PERSONA_PRESETS[preset] ? "active" : ""
                  }`}
                  onClick={() => applyPreset(preset)}
                >
                  {preset.charAt(0).toUpperCase() + preset.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Hologram Color</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="color"
                value={formData.persona.avatar_color}
                onChange={(e) => handlePersonaChange("avatar_color", e.target.value)}
                className="color-picker"
              />
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {formData.persona.avatar_color}
              </span>
            </div>
          </div>

          <div className="form-group">
            <label>Icon</label>
            <select
              value={formData.persona.icon}
              onChange={(e) => handlePersonaChange("icon", e.target.value)}
              className="form-input"
            >
              {ICONS.map((icon) => (
                <option key={icon} value={icon}>
                  {icon.charAt(0).toUpperCase() + icon.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Personality</label>
            <input
              type="text"
              value={formData.persona.personality}
              onChange={(e) => handlePersonaChange("personality", e.target.value)}
              className="form-input"
              placeholder="e.g., Analytical & Methodical"
            />
          </div>

          <div className="form-group">
            <label>Voice Style</label>
            <select
              value={formData.persona.voice_style}
              onChange={(e) => handlePersonaChange("voice_style", e.target.value)}
              className="form-input"
            >
              {VOICE_STYLES.map((style) => (
                <option key={style} value={style}>
                  {style.charAt(0).toUpperCase() + style.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
            <button
              className="btn btn-primary"
              onClick={handleDeploy}
              disabled={createMutation.isPending}
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <MdSave /> {createMutation.isPending ? "Deploying..." : "Deploy to Autonomous"}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setFormData({
                  name: "",
                  description: "",
                  status: "idle",
                  persona: PERSONA_PRESETS.analytical,
                });
                setPreviewAgent({
                  id: "preview",
                  name: "New Agent",
                  persona: PERSONA_PRESETS.analytical,
                });
              }}
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <MdRefresh /> Reset
            </button>
          </div>
        </div>

        {/* Right: 3D Preview */}
        <div className="lab-preview-section panel">
          <div className="panel-header">
            <h3>Hologram Preview</h3>
          </div>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
            <Hologram3DCanvas
              agent={previewAgent}
              animationState="idle"
              size={350}
            />
          </div>
          <div style={{ marginTop: 16, textAlign: "center", color: "var(--text-secondary)", fontSize: 12 }}>
            <p>Personality: {formData.persona.personality}</p>
            <p>Voice: {formData.persona.voice_style}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
