import React, { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sphere, Cylinder, Torus } from "@react-three/drei";
import * as THREE from "three";

/**
 * 3D Hologram Character Component
 * Renders a stylized humanoid hologram with animation states
 */
function HologramCharacter({ agent, animationState = "idle", scale = 1 }) {
  const groupRef = useRef();
  const headRef = useRef();
  const bodyRef = useRef();
  const scanlineRef = useRef();

  const hologramColor = agent?.persona?.avatar_color || "#00f0ff";
  const colorObj = new THREE.Color(hologramColor);

  // Animation loop
  useFrame((state) => {
    if (!groupRef.current) return;

    const time = state.clock.getElapsedTime();

    // Idle breathing animation
    if (animationState === "idle") {
      groupRef.current.position.y = Math.sin(time * 1.5) * 0.1;
      if (bodyRef.current) {
        bodyRef.current.scale.y = 1 + Math.sin(time * 1.5) * 0.05;
      }
    }

    // Speaking animation
    if (animationState === "speaking") {
      groupRef.current.position.y = Math.sin(time * 3) * 0.15;
      if (headRef.current) {
        headRef.current.rotation.z = Math.sin(time * 2) * 0.1;
      }
    }

    // Thinking animation
    if (animationState === "thinking") {
      groupRef.current.rotation.y += 0.01;
      if (scanlineRef.current) {
        scanlineRef.current.material.opacity = 0.3 + Math.sin(time * 5) * 0.2;
      }
    }

    // Offline de-rez effect
    if (animationState === "offline") {
      groupRef.current.scale.x = 1 + Math.sin(time * 10) * 0.02;
      groupRef.current.scale.z = 1 + Math.cos(time * 10) * 0.02;
    }

    // Continuous rotation for visual interest
    groupRef.current.rotation.y += 0.002;
  });

  return (
    <group ref={groupRef} scale={scale}>
      {/* Head */}
      <Sphere
        ref={headRef}
        args={[0.4, 32, 32]}
        position={[0, 1.2, 0]}
        castShadow
      >
        <meshStandardMaterial
          color={colorObj}
          emissive={colorObj}
          emissiveIntensity={0.8}
          wireframe={false}
        />
      </Sphere>

      {/* Body */}
      <Cylinder
        ref={bodyRef}
        args={[0.3, 0.25, 1, 32]}
        position={[0, 0.5, 0]}
        castShadow
      >
        <meshStandardMaterial
          color={colorObj}
          emissive={colorObj}
          emissiveIntensity={0.6}
        />
      </Cylinder>

      {/* Legs */}
      <Cylinder args={[0.1, 0.1, 0.6, 16]} position={[-0.15, -0.3, 0]}>
        <meshStandardMaterial
          color={colorObj}
          emissive={colorObj}
          emissiveIntensity={0.5}
        />
      </Cylinder>
      <Cylinder args={[0.1, 0.1, 0.6, 16]} position={[0.15, -0.3, 0]}>
        <meshStandardMaterial
          color={colorObj}
          emissive={colorObj}
          emissiveIntensity={0.5}
        />
      </Cylinder>

      {/* Orbiting Icon Ring */}
      <Torus args={[0.8, 0.05, 16, 100]} position={[0, 0.5, 0]}>
        <meshStandardMaterial
          color={colorObj}
          emissive={colorObj}
          emissiveIntensity={0.4}
        />
      </Torus>

      {/* Scanline overlay */}
      <mesh ref={scanlineRef} position={[0, 0.5, 0.5]}>
        <planeGeometry args={[2, 2]} />
        <meshBasicMaterial
          color={colorObj}
          opacity={0.1}
          transparent
          wireframe
        />
      </mesh>
    </group>
  );
}

/**
 * 3D Canvas Wrapper for Hologram Display
 */
export function Hologram3DCanvas({ agent, animationState = "idle", size = 300 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "8px", overflow: "hidden" }}>
      <Canvas camera={{ position: [0, 0, 3], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#00f0ff" />

        <HologramCharacter agent={agent} animationState={animationState} scale={1} />

        <OrbitControls autoRotate autoRotateSpeed={2} />
      </Canvas>
    </div>
  );
}

export default HologramCharacter;
