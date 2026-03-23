import React, { useRef, useMemo } from "react";
import { Canvas, useFrame, useThree, extend } from "@react-three/fiber";
import {
  OrbitControls,
  Sphere,
  Cylinder,
  Torus,
  Billboard,
  Text,
  Sparkles,
  shaderMaterial,
} from "@react-three/drei";
import * as THREE from "three";

// ── Custom Holographic Shader ────────────────────────────────────────────────
const HologramMaterial = shaderMaterial(
  {
    hologramColor: new THREE.Color("#00f0ff"),
    time: 0.0,
    opacity: 0.9,
    voiceVolume: 0.0,
    glitchIntensity: 0.08,
    cloakAlpha: 1.0,
    fadeMin: -1.2,
    fadeMax: 2.5,
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
extend({ HologramMaterial });

// ── Persona helpers ──────────────────────────────────────────────────────────
function getPersonaType(agent) {
  const p = agent?.persona?.personality?.toLowerCase() || "";
  if (p.includes("stealth")) return "stealth";
  if (p.includes("analytical")) return "analytical";
  if (p.includes("commander") || p.includes("strategic")) return "commander";
  if (p.includes("observer") || p.includes("observant")) return "observer";
  if (p.includes("aggressive")) return "aggressive";
  return "default";
}

// ── Glitch intensity constants ───────────────────────────────────────────────
const GLITCH_INTENSITY_NORMAL = 0.08;
const GLITCH_INTENSITY_OFFLINE = 0.4;
const GLITCH_INTENSITY_PROCESSING = 0.25;

// ── Floating Holographic UI Panel ────────────────────────────────────────────
function HologramPanel({ position, color, label, orbitRadius, orbitSpeed, orbitOffset }) {
  const groupRef = useRef();
  const col = useMemo(() => new THREE.Color(color), [color]);
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime() * orbitSpeed + orbitOffset;
    groupRef.current.position.x = Math.cos(t) * orbitRadius;
    groupRef.current.position.z = Math.sin(t) * orbitRadius;
    groupRef.current.rotation.y = -t;
  });
  return (
    <group ref={groupRef} position={position}>
      <mesh>
        <planeGeometry args={[0.65, 0.42]} />
        <meshBasicMaterial color={col} transparent opacity={0.12} side={THREE.DoubleSide} />
      </mesh>
      <mesh>
        <planeGeometry args={[0.65, 0.42]} />
        <meshBasicMaterial color={col} transparent opacity={0.7} wireframe />
      </mesh>
      <Billboard>
        <Text fontSize={0.07} color={color} anchorX="center" anchorY="middle" position={[0, 0, 0.02]}>
          {label}
        </Text>
      </Billboard>
    </group>
  );
}

// ── Persona-based Accessory ──────────────────────────────────────────────────
function PersonaAccessory({ personaType, color }) {
  const col = useMemo(() => new THREE.Color(color), [color]);
  const datapadRef = useRef();
  const visorRef = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (datapadRef.current) {
      datapadRef.current.rotation.y = Math.sin(t * 0.8) * 0.3;
      datapadRef.current.position.y = 0.6 + Math.sin(t * 1.2) * 0.05;
    }
    if (visorRef.current) {
      visorRef.current.material.opacity = 0.5 + Math.sin(t * 3) * 0.2;
    }
  });

  if (personaType === "analytical") {
    return (
      <group ref={datapadRef} position={[0.7, 0.6, 0.1]}>
        <mesh>
          <boxGeometry args={[0.35, 0.25, 0.03]} />
          <meshBasicMaterial color={col} transparent opacity={0.3} />
        </mesh>
        <mesh>
          <boxGeometry args={[0.35, 0.25, 0.03]} />
          <meshBasicMaterial color={col} transparent opacity={0.8} wireframe />
        </mesh>
      </group>
    );
  }

  if (personaType === "stealth") {
    return (
      <mesh ref={visorRef} position={[0, 1.25, 0.35]} rotation={[0.1, 0, 0]}>
        <boxGeometry args={[0.6, 0.1, 0.04]} />
        <meshBasicMaterial color={col} transparent opacity={0.7} />
      </mesh>
    );
  }

  if (personaType === "commander") {
    return (
      <Torus args={[0.35, 0.03, 16, 64]} position={[0, 1.65, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <meshBasicMaterial color={col} transparent opacity={0.9} />
      </Torus>
    );
  }

  if (personaType === "observer") {
    return (
      <Torus args={[0.18, 0.025, 16, 64]} position={[0.38, 1.22, 0.25]} rotation={[0.3, -0.5, 0.1]}>
        <meshBasicMaterial color={col} transparent opacity={0.85} />
      </Torus>
    );
  }

  if (personaType === "aggressive") {
    return (
      <>
        <mesh position={[-0.5, 0.85, 0]}>
          <boxGeometry args={[0.2, 0.15, 0.15]} />
          <meshBasicMaterial color={col} transparent opacity={0.8} />
        </mesh>
        <mesh position={[0.5, 0.85, 0]}>
          <boxGeometry args={[0.2, 0.15, 0.15]} />
          <meshBasicMaterial color={col} transparent opacity={0.8} />
        </mesh>
      </>
    );
  }

  return null;
}

// ── Level-based Orbital Rings ────────────────────────────────────────────────
function LevelRings({ level, color }) {
  const ringCount = level >= 10 ? 3 : level >= 5 ? 2 : 1;
  const col = useMemo(() => new THREE.Color(color), [color]);
  const ring1Ref = useRef();
  const ring2Ref = useRef();
  const ring3Ref = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (ring1Ref.current) ring1Ref.current.rotation.y = t * 0.9;
    if (ring2Ref.current) {
      ring2Ref.current.rotation.x = t * 0.7;
      ring2Ref.current.rotation.z = t * 0.3;
    }
    if (ring3Ref.current) {
      ring3Ref.current.rotation.y = -t * 0.5;
      ring3Ref.current.rotation.x = t * 0.4;
    }
  });

  return (
    <group position={[0, 0.5, 0]}>
      <Torus
        ref={ring1Ref}
        args={[0.85, 0.03, 16, 100]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <meshBasicMaterial color={col} transparent opacity={0.5} />
      </Torus>
      {ringCount >= 2 && (
        <Torus ref={ring2Ref} args={[0.85, 0.025, 16, 100]}>
          <meshBasicMaterial color={col} transparent opacity={0.4} />
        </Torus>
      )}
      {ringCount >= 3 && (
        <Torus
          ref={ring3Ref}
          args={[0.85, 0.02, 16, 100]}
          rotation={[0, 0, Math.PI / 3]}
        >
          <meshBasicMaterial color={col} transparent opacity={0.35} />
        </Torus>
      )}
    </group>
  );
}

// ── Projector Base (pedestal + light cone) ───────────────────────────────────
function ProjectorBase({ color }) {
  const col = useMemo(() => new THREE.Color(color), [color]);
  const coneRef = useRef();
  const ringRef = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (coneRef.current) {
      coneRef.current.material.opacity = 0.05 + Math.sin(t * 2) * 0.02;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = t * 1.5;
    }
  });

  return (
    <group position={[0, -1.85, 0]}>
      {/* Pedestal */}
      <Cylinder args={[0.35, 0.5, 0.2, 32]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#1a1f2e" emissive={col} emissiveIntensity={0.2} metalness={0.8} roughness={0.2} />
      </Cylinder>
      {/* Emissive ring on top of pedestal */}
      <Torus ref={ringRef} args={[0.33, 0.025, 16, 64]} position={[0, 0.11, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <meshBasicMaterial color={col} transparent opacity={0.85} />
      </Torus>
      {/* Volumetric light cone projecting upward */}
      <mesh ref={coneRef} position={[0, 0.95, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.6, 1.9, 32, 1, true]} />
        <meshBasicMaterial color={col} transparent opacity={0.07} side={THREE.BackSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

// ── Spatial Subtitle ─────────────────────────────────────────────────────────
function SpatialSubtitle({ text, color }) {
  if (!text) return null;
  return (
    <Billboard position={[0, 2.4, 0]}>
      <Text
        fontSize={0.18}
        color={color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.01}
        outlineColor="#000000"
        maxWidth={3}
      >
        {text}
      </Text>
    </Billboard>
  );
}

// ── Head Look-At (mouse tracking) ────────────────────────────────────────────
function LookAtHead({ headRef }) {
  const { pointer, camera } = useThree();
  const _target = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    if (!headRef.current) return;
    _target.set(pointer.x * 2.5, pointer.y * 1.5, 2.5);
    _target.unproject(camera);
    headRef.current.lookAt(_target);
  });

  return null;
}

// ── Main Hologram Character ──────────────────────────────────────────────────
function HologramCharacter({
  agent,
  animationState = "idle",
  scale = 1,
  voiceVolume = 0,
  subtitle = "",
  level = 1,
  showProjector = true,
  lookAtMouse = false,
}) {
  const groupRef = useRef();
  const headRef = useRef();
  const bodyRef = useRef();
  const rightArmRef = useRef();
  const leftArmRef = useRef();
  const materialRefs = useRef([]);

  const hologramColor = agent?.persona?.avatar_color || "#00f0ff";
  const colorObj = useMemo(() => new THREE.Color(hologramColor), [hologramColor]);
  const personaType = useMemo(() => getPersonaType(agent), [agent]);
  const isStealth = personaType === "stealth";
  const cloakAlpha = isStealth ? 0.35 : 1.0;
  const auraIntensity = level >= 10 ? 1.4 : level >= 5 ? 1.0 : 0.7;

  // Shared uniform updater
  const updateMaterials = (time, volume) => {
    materialRefs.current.filter(Boolean).forEach((mat) => {
      mat.time = time;
      mat.voiceVolume = volume;
    });
  };

  useFrame((state) => {
    if (!groupRef.current) return;
    const time = state.clock.getElapsedTime();

    // Idle — gentle floating breath
    if (animationState === "idle") {
      groupRef.current.position.y = Math.sin(time * 1.5) * 0.08;
      if (bodyRef.current) bodyRef.current.scale.y = 1 + Math.sin(time * 1.5) * 0.04;
    }

    // Speaking — animated bounce + voice pulse
    if (animationState === "speaking") {
      groupRef.current.position.y = Math.sin(time * 3.5) * 0.12;
      if (headRef.current) headRef.current.rotation.z = Math.sin(time * 2.5) * 0.08;
    }

    // Thinking — slow spin + tilt
    if (animationState === "thinking") {
      groupRef.current.rotation.y += 0.008;
      if (headRef.current) headRef.current.rotation.z = Math.sin(time * 1.2) * 0.15;
    }

    // Offline — glitch flicker
    if (animationState === "offline") {
      groupRef.current.scale.x = 1 + Math.sin(time * 12) * 0.025;
      groupRef.current.scale.z = 1 + Math.cos(time * 12) * 0.025;
      materialRefs.current.filter(Boolean).forEach((mat) => { mat.glitchIntensity = GLITCH_INTENSITY_OFFLINE; });
    } else {
      materialRefs.current.filter(Boolean).forEach((mat) => { mat.glitchIntensity = GLITCH_INTENSITY_NORMAL; });
    }

    // Waving gesture — right arm waves
    if (animationState === "waving") {
      if (rightArmRef.current) {
        rightArmRef.current.rotation.z = Math.sin(time * 6) * 0.9 - 0.6;
      }
    } else if (rightArmRef.current) {
      rightArmRef.current.rotation.z = 0;
    }

    // Pointing gesture — right arm extends forward
    if (animationState === "pointing") {
      if (rightArmRef.current) {
        rightArmRef.current.rotation.z = -0.5;
        rightArmRef.current.rotation.x = -0.4;
      }
    }

    // Processing — extra glitch
    if (animationState === "processing") {
      materialRefs.current.filter(Boolean).forEach((mat) => { mat.glitchIntensity = GLITCH_INTENSITY_PROCESSING; });
    }

    updateMaterials(time, voiceVolume);

    // Continuous slow rotation
    if (animationState !== "thinking") {
      groupRef.current.rotation.y += 0.0015;
    }
  });

  // Helper to register a material ref
  const registerMat = (index) => (mat) => {
    materialRefs.current[index] = mat;
  };

  const showUIPanels = animationState === "thinking" || animationState === "processing";
  const showParticles = animationState === "processing";

  return (
    <group ref={groupRef} scale={scale}>
      {/* Head */}
      <Sphere ref={headRef} args={[0.4, 32, 32]} position={[0, 1.22, 0]}>
        <hologramMaterial
          ref={registerMat(0)}
          hologramColor={colorObj}
          cloakAlpha={cloakAlpha}
          opacity={0.9}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </Sphere>

      {/* Body */}
      <Cylinder ref={bodyRef} args={[0.3, 0.26, 1, 32]} position={[0, 0.5, 0]}>
        <hologramMaterial
          ref={registerMat(1)}
          hologramColor={colorObj}
          cloakAlpha={cloakAlpha}
          opacity={0.85}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </Cylinder>

      {/* Right arm */}
      <group ref={rightArmRef} position={[0.38, 0.85, 0]}>
        <Cylinder args={[0.08, 0.07, 0.55, 12]} rotation={[0, 0, -0.2]} position={[0.08, -0.27, 0]}>
          <hologramMaterial
            ref={registerMat(2)}
            hologramColor={colorObj}
            cloakAlpha={cloakAlpha}
            opacity={0.8}
            transparent
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </Cylinder>
      </group>

      {/* Left arm */}
      <group ref={leftArmRef} position={[-0.38, 0.85, 0]}>
        <Cylinder args={[0.08, 0.07, 0.55, 12]} rotation={[0, 0, 0.2]} position={[-0.08, -0.27, 0]}>
          <hologramMaterial
            ref={registerMat(3)}
            hologramColor={colorObj}
            cloakAlpha={cloakAlpha}
            opacity={0.8}
            transparent
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </Cylinder>
      </group>

      {/* Left leg */}
      <Cylinder args={[0.09, 0.09, 0.62, 16]} position={[-0.15, -0.32, 0]}>
        <hologramMaterial
          ref={registerMat(4)}
          hologramColor={colorObj}
          cloakAlpha={cloakAlpha}
          opacity={0.8}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </Cylinder>

      {/* Right leg */}
      <Cylinder args={[0.09, 0.09, 0.62, 16]} position={[0.15, -0.32, 0]}>
        <hologramMaterial
          ref={registerMat(5)}
          hologramColor={colorObj}
          cloakAlpha={cloakAlpha}
          opacity={0.8}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </Cylinder>

      {/* Level-based orbital rings */}
      <LevelRings level={level} color={hologramColor} />

      {/* Persona-specific accessories */}
      <PersonaAccessory personaType={personaType} color={hologramColor} />

      {/* Floating UI panels when thinking/processing */}
      {showUIPanels && (
        <>
          <HologramPanel
            position={[0, 0.7, 0]}
            color={hologramColor}
            label="PROCESSING..."
            orbitRadius={1.0}
            orbitSpeed={0.7}
            orbitOffset={0}
          />
          <HologramPanel
            position={[0, 0.5, 0]}
            color={hologramColor}
            label="ANALYZING DATA"
            orbitRadius={1.0}
            orbitSpeed={0.7}
            orbitOffset={Math.PI * 0.66}
          />
          <HologramPanel
            position={[0, 0.3, 0]}
            color={hologramColor}
            label="TOOL: ACTIVE"
            orbitRadius={1.0}
            orbitSpeed={0.7}
            orbitOffset={Math.PI * 1.33}
          />
        </>
      )}

      {/* Particle / sparkle effect for processing state */}
      {showParticles && (
        <Sparkles
          count={60}
          scale={2.5}
          size={2}
          speed={0.5}
          opacity={0.7}
          color={hologramColor}
          position={[0, 0.5, 0]}
        />
      )}

      {/* Aura glow mesh (level-scaled) */}
      <Sphere args={[0.55, 16, 16]} position={[0, 0.5, 0]}>
        <meshBasicMaterial color={colorObj} transparent opacity={0.04 * auraIntensity} depthWrite={false} />
      </Sphere>

      {/* Spatial subtitle */}
      <SpatialSubtitle text={subtitle} color={hologramColor} />

      {/* Mouse look-at for head */}
      {lookAtMouse && <LookAtHead headRef={headRef} />}

      {/* Projector base */}
      {showProjector && <ProjectorBase color={hologramColor} />}
    </group>
  );
}

/**
 * 3D Canvas Wrapper for Hologram Display
 */
export function Hologram3DCanvas({
  agent,
  animationState = "idle",
  size = 300,
  voiceVolume = 0,
  subtitle = "",
  level = 1,
  showProjector = true,
  lookAtMouse = false,
}) {
  return (
    <div style={{ width: size, height: size, borderRadius: "8px", overflow: "hidden" }}>
      <Canvas camera={{ position: [0, 1, 4], fov: 45 }}>
        <ambientLight intensity={0.3} />
        <pointLight position={[5, 8, 5]} intensity={1.2} color="#ffffff" />
        <pointLight position={[-5, -3, -5]} intensity={0.6} color={agent?.persona?.avatar_color || "#00f0ff"} />

        <HologramCharacter
          agent={agent}
          animationState={animationState}
          scale={1}
          voiceVolume={voiceVolume}
          subtitle={subtitle}
          level={level}
          showProjector={showProjector}
          lookAtMouse={lookAtMouse}
        />

        <OrbitControls
          autoRotate={animationState === "idle"}
          autoRotateSpeed={1.5}
          enableDamping
          dampingFactor={0.05}
          minDistance={2}
          maxDistance={8}
        />
      </Canvas>
    </div>
  );
}

export default HologramCharacter;
