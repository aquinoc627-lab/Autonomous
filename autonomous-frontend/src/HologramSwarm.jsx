import React, { useRef, useMemo } from "react";
import { Canvas, useFrame, extend } from "@react-three/fiber";
import {
  OrbitControls,
  Sphere,
  Cylinder,
  Torus,
  Billboard,
  Text,
  shaderMaterial,
} from "@react-three/drei";
import * as THREE from "three";

// ── Holographic shader (same as Hologram3D) ──────────────────────────────────
const SwarmHologramMaterial = shaderMaterial(
  {
    hologramColor: new THREE.Color("#00f0ff"),
    time: 0.0,
    opacity: 0.85,
    voiceVolume: 0.0,
    glitchIntensity: 0.06,
    cloakAlpha: 1.0,
    fadeMin: -1.0,
    fadeMax: 2.0,
  },
  /* glsl */ `
    uniform float time;
    uniform float glitchIntensity;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec2 vUv;
    varying float vY;
    float rand(float n) { return fract(sin(n) * 43758.5453123); }
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vUv = uv;
      vY = position.y;
      vec3 pos = position;
      float glitchLine = step(0.97, sin(time * 18.0 + pos.y * 80.0));
      pos.x += glitchLine * (rand(time + pos.y) - 0.5) * glitchIntensity;
      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  /* glsl */ `
    uniform vec3 hologramColor;
    uniform float time;
    uniform float opacity;
    uniform float voiceVolume;
    uniform float cloakAlpha;
    uniform float fadeMin;
    uniform float fadeMax;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec2 vUv;
    varying float vY;
    float rand(vec2 co) { return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec3 viewDir = normalize(vViewPosition);
      vec3 n = normalize(vNormal);
      float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 2.5);
      float scanline = 0.82 + 0.18 * sin(vY * 28.0 - time * 2.5);
      float noise = rand(vUv + fract(time * 0.04)) * 0.05;
      float fade = smoothstep(fadeMin, fadeMax, vY);
      float flicker = 0.95 + 0.05 * sin(time * 19.7);
      float voicePulse = 1.0 + voiceVolume * 1.5;
      float emissive = (0.65 + fresnel * 1.1) * voicePulse * flicker;
      float alpha = (0.68 + fresnel * 0.32 + noise) * opacity * fade * scanline * cloakAlpha;
      gl_FragColor = vec4(hologramColor * emissive, alpha);
    }
  `
);
extend({ SwarmHologramMaterial });

// ── Data Stream (laser link between agents) ──────────────────────────────────
function DataStream({ start, end, color }) {
  const lineRef = useRef();
  const particleRef = useRef();
  const col = useMemo(() => new THREE.Color(color), [color]);

  const points = useMemo(() => {
    const s = new THREE.Vector3(...start);
    const e = new THREE.Vector3(...end);
    const mid = s.clone().lerp(e, 0.5).add(new THREE.Vector3(0, 0.8, 0));
    const curve = new THREE.QuadraticBezierCurve3(s, mid, e);
    return curve.getPoints(40);
  }, [start, end]);

  const lineGeom = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints(points);
    return g;
  }, [points]);

  useFrame((state) => {
    if (particleRef.current) {
      const t = (state.clock.getElapsedTime() * 0.5) % 1;
      const idx = Math.floor(t * (points.length - 1));
      const pt = points[idx];
      particleRef.current.position.set(pt.x, pt.y, pt.z);
    }
    if (lineRef.current) {
      lineRef.current.material.opacity = 0.25 + Math.sin(state.clock.getElapsedTime() * 3) * 0.1;
    }
  });

  return (
    <group>
      <primitive object={new THREE.Line(lineGeom, new THREE.LineBasicMaterial({
        color: col,
        transparent: true,
        opacity: 0.3,
      }))} ref={lineRef} />
      <mesh ref={particleRef}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshBasicMaterial color={col} transparent opacity={0.9} />
      </mesh>
    </group>
  );
}

// ── Mini Hologram Agent (compact for swarm view) ─────────────────────────────
function SwarmAgentNode({ agent, position, isSelected, onClick, speakingIds }) {
  const groupRef = useRef();
  const matRef0 = useRef();
  const matRef1 = useRef();
  const hologramColor = agent?.persona?.avatar_color || "#00f0ff";
  const col = useMemo(() => new THREE.Color(hologramColor), [hologramColor]);
  const isSpeaking = speakingIds?.has(agent.id);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    groupRef.current.position.y = position[1] + Math.sin(t * 1.5 + position[0]) * 0.08;
    if (matRef0.current) {
      matRef0.current.time = t;
      matRef0.current.voiceVolume = isSpeaking ? 0.5 + Math.sin(t * 8) * 0.3 : 0;
    }
    if (matRef1.current) {
      matRef1.current.time = t;
      matRef1.current.voiceVolume = isSpeaking ? 0.5 + Math.sin(t * 8) * 0.3 : 0;
    }
    if (isSelected) {
      groupRef.current.rotation.y += 0.012;
    }
  });

  return (
    <group
      ref={groupRef}
      position={position}
      onClick={onClick}
    >
      {/* Head */}
      <Sphere args={[0.22, 24, 24]} position={[0, 0.65, 0]}>
        <swarmHologramMaterial ref={matRef0} hologramColor={col} transparent depthWrite={false} side={THREE.DoubleSide} />
      </Sphere>

      {/* Body */}
      <Cylinder args={[0.18, 0.15, 0.55, 24]} position={[0, 0.25, 0]}>
        <swarmHologramMaterial ref={matRef1} hologramColor={col} transparent depthWrite={false} side={THREE.DoubleSide} />
      </Cylinder>

      {/* Legs */}
      <Cylinder args={[0.06, 0.06, 0.35, 12]} position={[-0.1, -0.17, 0]}>
        <meshBasicMaterial color={col} transparent opacity={0.7} />
      </Cylinder>
      <Cylinder args={[0.06, 0.06, 0.35, 12]} position={[0.1, -0.17, 0]}>
        <meshBasicMaterial color={col} transparent opacity={0.7} />
      </Cylinder>

      {/* Orbital ring */}
      <Torus args={[0.45, 0.02, 12, 64]} position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <meshBasicMaterial color={col} transparent opacity={0.5} />
      </Torus>

      {/* Speaking pulse ring */}
      {isSpeaking && (
        <Sphere args={[0.5, 16, 16]} position={[0, 0.3, 0]}>
          <meshBasicMaterial color={col} transparent opacity={0.08} depthWrite={false} />
        </Sphere>
      )}

      {/* Name label */}
      <Billboard position={[0, 1.15, 0]}>
        <Text
          fontSize={0.12}
          color={hologramColor}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.008}
          outlineColor="#000000"
        >
          {agent.name}
        </Text>
      </Billboard>

      {/* Role label */}
      <Billboard position={[0, -0.55, 0]}>
        <Text
          fontSize={0.08}
          color={hologramColor}
          anchorX="center"
          anchorY="middle"
          opacity={0.7}
        >
          {agent?.persona?.personality?.split("&")[0]?.trim() || "AGENT"}
        </Text>
      </Billboard>

      {/* Selection indicator */}
      {isSelected && (
        <Torus args={[0.6, 0.03, 12, 64]} position={[0, -0.45, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <meshBasicMaterial color={col} transparent opacity={0.9} />
        </Torus>
      )}
    </group>
  );
}

// ── Persona type helpers ──────────────────────────────────────────────────────
function isCommanderPersona(agent) {
  const p = agent?.persona?.personality?.toLowerCase() || "";
  return p.includes("commander") || p.includes("strategic");
}

function isObserverPersona(agent) {
  const p = agent?.persona?.personality?.toLowerCase() || "";
  return p.includes("observer") || p.includes("observant");
}

function circularPosition(index, total, radius) {
  const angle = (index / Math.max(total, 1)) * Math.PI * 2;
  return [Math.cos(angle) * radius, 0, Math.sin(angle) * radius];
}

// ── Formation layout ──────────────────────────────────────────────────────────
function getSwarmPosition(agent, index, total, allAgents) {
  if (isCommanderPersona(agent)) {
    // Commanders in the center, slightly elevated
    const cmdAgents = allAgents.filter(isCommanderPersona);
    const cmdIdx = cmdAgents.findIndex((a) => a.id === agent.id);
    return [cmdIdx * 1.5 - ((cmdAgents.length - 1) * 0.75), 0.5, 0];
  }

  if (isObserverPersona(agent)) {
    // Observers orbit the perimeter
    const obsAgents = allAgents.filter(isObserverPersona);
    const obsIdx = obsAgents.findIndex((a) => a.id === agent.id);
    return circularPosition(obsIdx, obsAgents.length, 4.5);
  }

  // Other agents arranged in a middle ring
  const otherAgents = allAgents.filter((a) => !isCommanderPersona(a) && !isObserverPersona(a));
  const othIdx = otherAgents.findIndex((a) => a.id === agent.id);
  return circularPosition(othIdx, otherAgents.length, 2.8);
}

// ── War Room Floor Grid ───────────────────────────────────────────────────────
function FloorGrid({ color }) {
  const gridRef = useRef();
  const col = useMemo(() => new THREE.Color(color), [color]);

  useFrame((state) => {
    if (gridRef.current) {
      gridRef.current.material.opacity = 0.12 + Math.sin(state.clock.getElapsedTime() * 0.5) * 0.03;
    }
  });

  return (
    <mesh ref={gridRef} position={[0, -1.0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[18, 18, 20, 20]} />
      <meshBasicMaterial color={col} transparent opacity={0.12} wireframe />
    </mesh>
  );
}

// ── 3D Scene content ──────────────────────────────────────────────────────────
function WarRoomScene({ agents, selectedId, onSelect, speakingIds, showDataStreams }) {
  const positions = useMemo(() => {
    if (!agents?.length) return [];
    return agents.map((agent, i) => getSwarmPosition(agent, i, agents.length, agents));
  }, [agents]);

  // Build data stream connections (commanders ↔ closest non-commanders)
  const streams = useMemo(() => {
    if (!showDataStreams || !agents?.length) return [];
    const result = [];
    const cmdIndices = agents
      .map((a, i) => ({ a, i }))
      .filter(({ a }) => isCommanderPersona(a))
      .map(({ i }) => i);

    agents.forEach((agent, i) => {
      if (!isCommanderPersona(agent) && cmdIndices.length > 0) {
        // Connect each non-commander to the nearest commander
        const nearestCmd = cmdIndices[i % cmdIndices.length];
        result.push({ from: i, to: nearestCmd, color: agent?.persona?.avatar_color || "#00f0ff" });
      }
    });
    return result;
  }, [agents, showDataStreams]);

  if (!agents?.length) {
    return (
      <Billboard position={[0, 0, 0]}>
        <Text fontSize={0.4} color="#00f0ff" anchorX="center" anchorY="middle">
          No Agents Deployed
        </Text>
      </Billboard>
    );
  }

  return (
    <>
      <FloorGrid color="#00f0ff" />

      {/* Ambient center ring */}
      <Torus args={[2.0, 0.02, 16, 128]} position={[0, -0.95, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <meshBasicMaterial color="#00f0ff" transparent opacity={0.25} />
      </Torus>
      <Torus args={[4.2, 0.02, 16, 128]} position={[0, -0.95, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <meshBasicMaterial color="#00f0ff" transparent opacity={0.15} />
      </Torus>

      {/* Data stream connections */}
      {streams.map((s, i) => (
        <DataStream
          key={i}
          start={[positions[s.from][0], positions[s.from][1] + 0.3, positions[s.from][2]]}
          end={[positions[s.to][0], positions[s.to][1] + 0.3, positions[s.to][2]]}
          color={s.color}
        />
      ))}

      {/* Agent nodes */}
      {agents.map((agent, i) => (
        <SwarmAgentNode
          key={agent.id}
          agent={agent}
          position={positions[i]}
          isSelected={selectedId === agent.id}
          onClick={() => onSelect(agent)}
          speakingIds={speakingIds}
        />
      ))}
    </>
  );
}

/**
 * HologramSwarm — Holographic War Room showing all agents in formation
 */
export default function HologramSwarm({
  agents = [],
  selectedAgent,
  onSelectAgent,
  speakingIds,
  showDataStreams = true,
  height = 500,
}) {
  return (
    <div style={{ width: "100%", height, borderRadius: "8px", overflow: "hidden", background: "rgba(0,0,0,0.4)" }}>
      <Canvas camera={{ position: [0, 6, 10], fov: 50 }}>
        <ambientLight intensity={0.2} />
        <pointLight position={[0, 8, 0]} intensity={1.5} color="#00f0ff" />
        <pointLight position={[-8, 2, -8]} intensity={0.5} color="#bf00ff" />
        <pointLight position={[8, 2, 8]} intensity={0.5} color="#39ff14" />

        <WarRoomScene
          agents={agents}
          selectedId={selectedAgent?.id}
          onSelect={onSelectAgent}
          speakingIds={speakingIds}
          showDataStreams={showDataStreams}
        />

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={4}
          maxDistance={20}
          autoRotate
          autoRotateSpeed={0.4}
        />
      </Canvas>
    </div>
  );
}
