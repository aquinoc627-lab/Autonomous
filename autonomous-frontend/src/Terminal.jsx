import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Text, OrbitControls, Environment } from "@react-three/drei";
import * as THREE from "three";
import { useAuth } from "./AuthContext";
import { toolsAPI } from "./api";
import { MdTerminal, MdContentCopy, MdDeleteSweep, MdSearch } from "react-icons/md";
import "./FluidTerminal.css";

/* ================================================================
   3D TERMINAL TEXT LINE COMPONENT
   ================================================================ */
const TextLine = ({ text, index, totalLines, color = "#00f0ff", isInput = false }) => {
  const meshRef = useRef();
  
  // Calculate target position based on index (newest at bottom, oldest flowing up/back)
  // Reverse index so 0 is the newest line at the bottom
  const reverseIdx = totalLines - 1 - index;
  
  const targetY = -2 + reverseIdx * 0.4;
  const targetZ = reverseIdx * -0.5;
  const opacity = Math.max(0, 1 - reverseIdx * 0.05);
  
  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    // Smoothly interpolate position
    meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, delta * 5);
    meshRef.current.position.z = THREE.MathUtils.lerp(meshRef.current.position.z, targetZ, delta * 5);
    
    // Slight wavy motion for older lines (Fluidity)
    if (!isInput && reverseIdx > 0) {
      meshRef.current.position.x = Math.sin(state.clock.elapsedTime * 0.5 + index) * (reverseIdx * 0.05);
    }
  });

  return (
    <Text
      ref={meshRef}
      position={[0, -2, 0]}
      fontSize={0.25}
      color={color}
      anchorX="left"
      anchorY="middle"
      font="/fonts/FiraCode-Regular.ttf" // Assuming standard monospace font
      characters="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;':,./<>?`~ \n"
      maxWidth={15}
      lineHeight={1.2}
      fillOpacity={opacity}
    >
      {text}
      <meshBasicMaterial transparent opacity={opacity} color={color} />
    </Text>
  );
};

/* ================================================================
   FLUID PARTICLE BACKGROUND
   ================================================================ */
const FluidParticles = ({ active, count = 2000 }) => {
  const pointsRef = useRef();
  
  const particles = useMemo(() => {
    const temp = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      temp[i * 3] = (Math.random() - 0.5) * 20; // x
      temp[i * 3 + 1] = (Math.random() - 0.5) * 20; // y
      temp[i * 3 + 2] = (Math.random() - 0.5) * 20 - 5; // z
    }
    return temp;
  }, [count]);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    
    const positions = pointsRef.current.geometry.attributes.position.array;
    
    for (let i = 0; i < count; i++) {
      let i3 = i * 3;
      // Flow upwards and towards the user
      positions[i3 + 1] += delta * (active ? 2 : 0.2); // y speeds up when active
      positions[i3 + 2] += delta * (active ? 1 : 0.1); // z speeds up
      
      // Reset if out of bounds
      if (positions[i3 + 1] > 10) positions[i3 + 1] = -10;
      if (positions[i3 + 2] > 5) positions[i3 + 2] = -20;
      
      // Wavy X motion
      positions[i3] += Math.sin(state.clock.elapsedTime + i) * delta * 0.5;
    }
    
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    pointsRef.current.rotation.y += delta * 0.05;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particles.length / 3}
          array={particles}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#00f0ff" transparent opacity={0.4} blending={THREE.AdditiveBlending} />
    </points>
  );
};

/* ================================================================
   MAIN FLUID TERMINAL COMPONENT
   ================================================================ */
export default function FluidTerminal() {
  const { user } = useAuth();
  const [lines, setLines] = useState([
    { text: "Initializing Nexus Semantic Terminal...", color: "#00f0ff" },
    { text: "Establishing quantum entanglement links... SUCCESS", color: "#39ff14" },
    { text: "Awaiting input stream.", color: "rgba(255,255,255,0.5)" }
  ]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef(null);

  const addLine = useCallback((text, color = "#e0e6ed") => {
    setLines((prev) => [...prev, { text, color }]);
  }, []);

  const handleCommand = async (cmd) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    addLine(`> ${trimmed}`, "#fff");
    setIsProcessing(true);

    if (trimmed.toLowerCase() === "clear") {
      setLines([]);
      setIsProcessing(false);
      return;
    }

    try {
      // Basic mock for terminal commands
      if (trimmed.toLowerCase() === "help") {
        addLine("Available Nexus Commands:", "#00f0ff");
        addLine("  tools - List arsenal", "#00f0ff");
        addLine("  clear - Reset data stream", "#00f0ff");
        addLine("  scan <ip> - Initiate recon", "#00f0ff");
      } else if (trimmed.toLowerCase() === "tools") {
        const res = await toolsAPI.list({});
        const tools = res.data.tools || res.data;
        addLine(`Found ${tools.length} tools in arsenal.`, "#39ff14");
      } else {
        addLine(`Command unacknowledged: ${trimmed}`, "#ff0040");
      }
    } catch (err) {
      addLine(`[ERROR] Fluid matrix failure: ${err.message}`, "#ff0040");
    }

    setIsProcessing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !isProcessing) {
      handleCommand(input);
      setInput("");
    }
  };

  // Keep input focused
  useEffect(() => {
    const focusInput = () => inputRef.current?.focus();
    window.addEventListener("click", focusInput);
    return () => window.removeEventListener("click", focusInput);
  }, []);

  return (
    <div className="fluid-terminal-wrapper">
      {/* 3D Canvas Background & Flowing Text */}
      <div className="fluid-canvas-container">
        <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
          <ambientLight intensity={0.5} />
          <FluidParticles active={isProcessing} count={3000} />
          
          <group position={[-6, 0, 0]}>
            {lines.map((line, idx) => (
              <TextLine 
                key={idx} 
                text={line.text} 
                index={idx} 
                totalLines={lines.length} 
                color={line.color} 
              />
            ))}
            
            {/* The active input line floating in 3D */}
            <TextLine 
              text={`> ${input}${isProcessing ? " █" : "_"}`} 
              index={lines.length} 
              totalLines={lines.length + 1} 
              color="#ffe600" 
              isInput={true}
            />
          </group>
        </Canvas>
      </div>

      {/* Invisible HTML Input to capture typing */}
      <input
        ref={inputRef}
        className="hidden-terminal-input"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isProcessing}
        autoFocus
        spellCheck={false}
      />

      {/* Terminal UI Overlay (Header/Footer) */}
      <div className="fluid-terminal-overlay">
        <div className="fluid-header">
          <div className="fluid-header-left">
            <MdTerminal className="fluid-icon" />
            <h2>Nexus Semantic Terminal</h2>
          </div>
          <div className="fluid-header-right">
            <div className={`status-dot ${isProcessing ? "processing" : "idle"}`} />
            <span>{isProcessing ? "QUANTUM SYNC..." : "AWAITING COMMAND"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
