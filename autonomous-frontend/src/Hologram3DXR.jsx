import React, { useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { createXRStore, XR, Interactive } from '@react-three/xr';
import { MdViewInAr, MdVolumeUp, MdPsychology, MdClose } from "react-icons/md";

// Create the XR store for AR
const store = createXRStore({
  depthSensing: true,
  handTracking: true,
  hitTest: true
});

/**
 * HologramCharacterXR - 3D hologram character optimized for AR/WebXR
 */
const HologramCharacterXR = ({ agent, scale = 1, animationState = 'idle' }) => {
  const groupRef = useRef();
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (groupRef.current) {
      // Gentle floating animation
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
      
      // Rotation based on animation state
      if (animationState === 'speaking') {
        groupRef.current.rotation.y += 0.01;
      } else if (animationState === 'thinking') {
        groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 2) * 0.1;
      }
    }
  });

  const personaColor = agent?.persona?.color || '#00ff88';

  return (
    <group ref={groupRef} scale={scale}>
      {/* Main hologram body */}
      <mesh
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <icosahedronGeometry args={[1, 4]} />
        <meshStandardMaterial
          color={personaColor}
          emissive={personaColor}
          emissiveIntensity={hovered ? 1.5 : 0.8}
          metalness={0.8}
          roughness={0.2}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Glowing aura */}
      <mesh scale={1.3}>
        <icosahedronGeometry args={[1, 4]} />
        <meshBasicMaterial
          color={personaColor}
          transparent
          opacity={0.2}
          wireframe
        />
      </mesh>

      {/* Orbiting icon (simplified) */}
      <mesh position={[1.5, 0, 0]}>
        <boxGeometry args={[0.3, 0.3, 0.3]} />
        <meshStandardMaterial
          color={personaColor}
          emissive={personaColor}
          emissiveIntensity={1}
        />
      </mesh>

      {/* Data stream effect */}
      {animationState === 'thinking' && (
        <mesh>
          <torusGeometry args={[1.5, 0.05, 16, 100]} />
          <meshBasicMaterial
            color={personaColor}
            transparent
            opacity={0.5}
            wireframe
          />
        </mesh>
      )}
    </group>
  );
};

/**
 * ARHologramViewer - Main AR experience component
 */
const ARHologramViewer = ({ agent, onClose }) => {
  const [animationState, setAnimationState] = useState('idle');

  const handleSpeak = () => {
    setAnimationState('speaking');
    setTimeout(() => setAnimationState('idle'), 3000);
  };

  const handleThink = () => {
    setAnimationState('thinking');
    setTimeout(() => setAnimationState('idle'), 2000);
  };

  return (
    <div className="ar-container">
      {/* AR Viewport */}
      <div className="ar-canvas">
        <button 
          className="btn btn-primary btn-view-ar" 
          onClick={() => store.enterAR()}
          style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1000 }}
        >
          <MdViewInAr /> Initialize AR Projection
        </button>

        <XR store={store}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          
          <Interactive>
            <HologramCharacterXR
              agent={agent}
              scale={0.5}
              animationState={animationState}
            />
          </Interactive>
        </XR>
      </div>

      {/* AR Overlay UI */}
      <div className="ar-overlay">
        <button className="btn-speak" onClick={handleSpeak}>
          <MdVolumeUp /> Speak
        </button>
        <button className="btn-think" onClick={handleThink}>
          <MdPsychology /> Think
        </button>
        <button className="btn-exit" onClick={onClose}>
          <MdClose /> Exit
        </button>
      </div>

      {/* Agent Info */}
      <div className="ar-agent-info">
        <strong>{agent?.name}</strong>
        <div>{agent?.persona?.personality}</div>
        <div>Status: {agent?.status}</div>
      </div>

      {/* AR Status */}
      <div className="ar-status">
        <span className="indicator"></span>
        HOLOGRAPHIC LINK ACTIVE
      </div>
    </div>
  );
};

export default ARHologramViewer;
