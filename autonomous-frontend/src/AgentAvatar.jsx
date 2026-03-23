/**
 * Autonomous — Animated Agent Avatar
 *
 * A fully animated SVG-based avatar that visualizes each agent's:
 *   - Unique persona (color, icon, personality)
 *   - Status (active pulse, idle dim, error flash, offline gray)
 *   - Speaking state (animated waveform mouth when agent has recent banter)
 *   - Listening state (animated signal arcs when receiving data)
 *
 * Props:
 *   agent      — Agent object with { name, status, persona }
 *   size       — Diameter in px (default: 64)
 *   speaking   — Boolean: show speaking animation
 *   listening  — Boolean: show listening animation
 *   showLabel  — Boolean: show name + personality below avatar
 *   onClick    — Optional click handler
 */

import React from "react";

// Default persona if none set
const DEFAULT_PERSONA = {
  avatar_color: "#00f0ff",
  icon: "shield",
  personality: "Unknown",
  voice_style: "neutral",
};

// Icon SVG paths keyed by persona icon name
const ICON_PATHS = {
  shield:
    "M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z",
  crosshair:
    "M12 2a10 10 0 100 20 10 10 0 000-20zm1 17.93A8 8 0 0019.93 13H17v-2h2.93A8 8 0 0013 4.07V7h-2V4.07A8 8 0 004.07 11H7v2H4.07A8 8 0 0011 19.93V17h2v2.93zM12 15a3 3 0 110-6 3 3 0 010 6z",
  eye:
    "M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17a5 5 0 110-10 5 5 0 010 10zm0-8a3 3 0 100 6 3 3 0 000-6z",
  brain:
    "M12 2a7 7 0 00-4.6 12.3A4.98 4.98 0 005 18c0 2.21 3.13 4 7 4s7-1.79 7-4a4.98 4.98 0 00-2.4-3.7A7 7 0 0012 2zm0 2a5 5 0 014.33 7.5l-.58 1A3 3 0 0117 15c0 .83-2.24 2-5 2s-5-1.17-5-2a3 3 0 011.25-2.5l-.58-1A5 5 0 0112 4z",
  bolt:
    "M11 21h-1l1-7H7.5c-.88 0-.33-.75-.31-.78C8.48 10.94 10.42 7.54 13.01 3h1l-1 7h3.51c.4 0 .62.19.4.66C12.97 17.55 11 21 11 21z",
  satellite:
    "M6.05 8.05a7 7 0 009.9 0l1.41 1.41a9 9 0 01-12.73 0l1.42-1.41zm2.83-2.83a3 3 0 014.24 0l1.42 1.41a5 5 0 01-7.07 0l1.41-1.41zM12 18l4-8H8l4 8z",
};

export default function AgentAvatar({
  agent,
  size = 64,
  speaking = false,
  listening = false,
  showLabel = false,
  onClick,
}) {
  const persona = agent?.persona || DEFAULT_PERSONA;
  const color = persona.avatar_color || DEFAULT_PERSONA.avatar_color;
  const icon = persona.icon || DEFAULT_PERSONA.icon;
  const status = agent?.status || "offline";

  const r = size / 2;
  const iconSize = size * 0.4;

  // Status-based visual modifiers
  const statusConfig = {
    active: { opacity: 1, glowIntensity: 1, pulseAnim: "avatar-pulse 2s ease-in-out infinite" },
    idle: { opacity: 0.7, glowIntensity: 0.4, pulseAnim: "avatar-breathe 4s ease-in-out infinite" },
    offline: { opacity: 0.35, glowIntensity: 0, pulseAnim: "none" },
    error: { opacity: 0.9, glowIntensity: 0.8, pulseAnim: "avatar-error-flash 1s ease-in-out infinite" },
  };

  const cfg = statusConfig[status] || statusConfig.offline;

  return (
    <div
      className="agent-avatar-wrapper"
      style={{ width: size, textAlign: "center", cursor: onClick ? "pointer" : "default" }}
      onClick={onClick}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="agent-avatar-svg"
        style={{ opacity: cfg.opacity }}
      >
        <defs>
          {/* Glow filter */}
          <filter id={`glow-${agent?.id}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={3 * cfg.glowIntensity} result="blur" />
            <feFlood floodColor={color} floodOpacity={0.6 * cfg.glowIntensity} />
            <feComposite in2="blur" operator="in" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Radial gradient for the orb */}
          <radialGradient id={`grad-${agent?.id}`} cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.05" />
          </radialGradient>
        </defs>

        {/* Outer ring — status pulse */}
        <circle
          cx={r}
          cy={r}
          r={r - 2}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeOpacity="0.5"
          style={{ animation: cfg.pulseAnim }}
        />

        {/* Inner orb */}
        <circle
          cx={r}
          cy={r}
          r={r - 6}
          fill={`url(#grad-${agent?.id})`}
          stroke={color}
          strokeWidth="1"
          strokeOpacity="0.8"
          filter={`url(#glow-${agent?.id})`}
        />

        {/* Persona icon */}
        <g transform={`translate(${r - iconSize / 2}, ${r - iconSize / 2}) scale(${iconSize / 24})`}>
          <path d={ICON_PATHS[icon] || ICON_PATHS.shield} fill={color} fillOpacity="0.9" />
        </g>

        {/* Speaking animation — waveform bars at bottom */}
        {speaking && (
          <g className="speaking-bars">
            {[0, 1, 2, 3, 4].map((i) => {
              const barW = size * 0.04;
              const gap = size * 0.06;
              const totalW = 5 * barW + 4 * gap;
              const x = r - totalW / 2 + i * (barW + gap);
              const maxH = size * 0.18;
              const y = size - 6;
              return (
                <rect
                  key={i}
                  x={x}
                  y={y - maxH / 2}
                  width={barW}
                  height={maxH}
                  rx={barW / 2}
                  fill={color}
                  fillOpacity="0.9"
                  style={{
                    animation: `speak-bar 0.4s ease-in-out ${i * 0.08}s infinite alternate`,
                    transformOrigin: `${x + barW / 2}px ${y}px`,
                  }}
                />
              );
            })}
          </g>
        )}

        {/* Listening animation — signal arcs on the sides */}
        {listening && (
          <g className="listening-arcs">
            {[1, 2, 3].map((i) => {
              const arcR = r * 0.5 + i * (size * 0.1);
              return (
                <React.Fragment key={i}>
                  {/* Left ear arc */}
                  <path
                    d={`M ${r - arcR * 0.7} ${r - arcR * 0.5} A ${arcR} ${arcR} 0 0 0 ${r - arcR * 0.7} ${r + arcR * 0.5}`}
                    fill="none"
                    stroke={color}
                    strokeWidth="1.5"
                    strokeOpacity={0.8 / i}
                    strokeLinecap="round"
                    style={{
                      animation: `listen-arc 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }}
                  />
                  {/* Right ear arc */}
                  <path
                    d={`M ${r + arcR * 0.7} ${r - arcR * 0.5} A ${arcR} ${arcR} 0 0 1 ${r + arcR * 0.7} ${r + arcR * 0.5}`}
                    fill="none"
                    stroke={color}
                    strokeWidth="1.5"
                    strokeOpacity={0.8 / i}
                    strokeLinecap="round"
                    style={{
                      animation: `listen-arc 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }}
                  />
                </React.Fragment>
              );
            })}
          </g>
        )}

        {/* Status dot */}
        <circle
          cx={size - 8}
          cy={size - 8}
          r={4}
          fill={
            status === "active"
              ? "#39ff14"
              : status === "idle"
              ? "#ffe600"
              : status === "error"
              ? "#ff0040"
              : "#5a6577"
          }
          stroke="#0a0e17"
          strokeWidth="2"
        />
      </svg>

      {/* Label below avatar */}
      {showLabel && (
        <div className="agent-avatar-label">
          <div className="agent-avatar-name" style={{ color }}>
            {agent?.name || "Unknown"}
          </div>
          <div className="agent-avatar-personality">
            {persona.personality}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact inline avatar for use in chat messages and table rows.
 */
export function AgentAvatarInline({ agent, size = 28, speaking = false }) {
  const persona = agent?.persona || DEFAULT_PERSONA;
  const color = persona.avatar_color || DEFAULT_PERSONA.avatar_color;
  const icon = persona.icon || DEFAULT_PERSONA.icon;
  const status = agent?.status || "offline";
  const r = size / 2;
  const iconSize = size * 0.45;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="agent-avatar-inline"
      style={{ verticalAlign: "middle", flexShrink: 0 }}
    >
      <circle
        cx={r}
        cy={r}
        r={r - 1}
        fill={color}
        fillOpacity="0.15"
        stroke={color}
        strokeWidth="1"
        strokeOpacity={status === "offline" ? 0.3 : 0.7}
      />
      <g transform={`translate(${r - iconSize / 2}, ${r - iconSize / 2}) scale(${iconSize / 24})`}>
        <path
          d={ICON_PATHS[icon] || ICON_PATHS.shield}
          fill={color}
          fillOpacity={status === "offline" ? 0.4 : 0.85}
        />
      </g>
      {speaking && (
        <g>
          {[0, 1, 2].map((i) => {
            const barW = 1.5;
            const gap = 2;
            const totalW = 3 * barW + 2 * gap;
            const x = r - totalW / 2 + i * (barW + gap);
            return (
              <rect
                key={i}
                x={x}
                y={size - 5}
                width={barW}
                height={3}
                rx={0.5}
                fill={color}
                style={{
                  animation: `speak-bar 0.35s ease-in-out ${i * 0.07}s infinite alternate`,
                  transformOrigin: `${x + barW / 2}px ${size - 3}px`,
                }}
              />
            );
          })}
        </g>
      )}
    </svg>
  );
}
