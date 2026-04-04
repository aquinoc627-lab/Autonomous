import React, { useState, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { 
  OrbitControls, 
  Text, 
  MeshTransmissionMaterial,
  Sparkles,
  Float
} from '@react-three/drei';
import * as THREE from 'three';
import { MdOutlineAcUnit, MdAutoFixHigh } from 'react-icons/md';

/* ================================================================
   SHOR'S DECRYPTION ENGINE (Qubit Matrix)
   ================================================================ */

const QubitMatrix = ({ active, onDecrypted }) => {
  const groupRef = useRef();
  const spheresRef = useRef([]);
  const arrowsRef = useRef([]);
  const progressRef = useRef(0);
  
  // Create a 5x5 grid of Qubits
  const size = 5;
  const spacing = 1.5;
  const totalQubits = size * size;

  // Initialize refs array
  if (spheresRef.current.length !== totalQubits) {
    spheresRef.current = Array(totalQubits).fill().map((_, i) => spheresRef.current[i] || React.createRef());
    arrowsRef.current = Array(totalQubits).fill().map((_, i) => arrowsRef.current[i] || React.createRef());
  }

  useFrame((state, delta) => {
    if (!active) {
      progressRef.current = 0;
      return;
    }
    
    // Simulate quantum algorithm progress (collapsing probability waves)
    if (progressRef.current < 1) {
      progressRef.current += delta * 0.2;
    } else if (progressRef.current >= 1 && onDecrypted) {
      onDecrypted();
      progressRef.current = 1.01; // trigger once
    }

    const t = state.clock.elapsedTime;
    const currentProgress = Math.min(1, progressRef.current);

    // Animate each Qubit
    spheresRef.current.forEach((ref, i) => {
      if (!ref.current || !arrowsRef.current[i].current) return;
      
      const x = i % size;
      const z = Math.floor(i / size);
      
      // The closer to currentProgress=1, the more aligned the qubits become
      const chaos = 1 - currentProgress;
      
      // Rotation targets
      const targetRotX = currentProgress >= 1 ? Math.PI / 2 : Math.sin(t * 2 + i) * Math.PI * chaos;
      const targetRotY = currentProgress >= 1 ? 0 : Math.cos(t * 3 + x) * Math.PI * chaos;
      const targetRotZ = currentProgress >= 1 ? 0 : Math.sin(t * 1.5 + z) * Math.PI * chaos;

      arrowsRef.current[i].current.rotation.x = THREE.MathUtils.lerp(arrowsRef.current[i].current.rotation.x, targetRotX, 0.1);
      arrowsRef.current[i].current.rotation.y = THREE.MathUtils.lerp(arrowsRef.current[i].current.rotation.y, targetRotY, 0.1);
      arrowsRef.current[i].current.rotation.z = THREE.MathUtils.lerp(arrowsRef.current[i].current.rotation.z, targetRotZ, 0.1);
      
      // Color shifts from chaotic purple to aligned cyan
      const r = THREE.MathUtils.lerp(0.8, 0, currentProgress);
      const g = THREE.MathUtils.lerp(0, 1, currentProgress);
      const b = THREE.MathUtils.lerp(1, 1, currentProgress);
      ref.current.material.color.setRGB(r, g, b);
      ref.current.material.emissive.setRGB(r*0.5, g*0.5, b*0.5);
    });
  });

  return (
    <group ref={groupRef} position={[-(size * spacing) / 2 + spacing/2, 0, -(size * spacing) / 2 + spacing/2]}>
      {Array.from({ length: totalQubits }).map((_, i) => {
        const x = (i % size) * spacing;
        const z = Math.floor(i / size) * spacing;
        return (
          <group key={i} position={[x, 0, z]}>
            {/* Bloch Sphere Outline */}
            <mesh ref={spheresRef.current[i]}>
              <sphereGeometry args={[0.5, 16, 16]} />
              <meshStandardMaterial wireframe color="#c000ff" emissive="#5000aa" transparent opacity={0.3} />
            </mesh>
            {/* Inner State Vector (Arrow) */}
            <group ref={arrowsRef.current[i]}>
              <mesh position={[0, 0.25, 0]}>
                <cylinderGeometry args={[0.02, 0.02, 0.5]} />
                <meshBasicMaterial color="#fff" />
              </mesh>
              <mesh position={[0, 0.5, 0]}>
                <coneGeometry args={[0.08, 0.2, 8]} />
                <meshBasicMaterial color="#fff" />
              </mesh>
            </group>
          </group>
        );
      })}
    </group>
  );
};

/* ================================================================
   HNDL CRYO-VAULT
   ================================================================ */

const CryoVault = ({ active, decrypted, onDecrypted }) => {
  const progressRef = useRef(0);

  useFrame((state, delta) => {
    if (!active) {
      progressRef.current = 0;
      return;
    }
    if (decrypted) return;
    
    if (progressRef.current < 1) {
      progressRef.current += delta * 0.3;
    } else if (progressRef.current >= 1 && onDecrypted) {
      onDecrypted();
      progressRef.current = 1.01;
    }
  });

  return (
    <group position={[0, -1, 0]}>
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 5, 0]} intensity={2} color={decrypted ? "#00f0ff" : "#4080ff"} />
      
      {/* Encrypted Data Packets */}
      {Array.from({ length: 12 }).map((_, i) => (
        <Float key={i} speed={decrypted ? 3 : 1} rotationIntensity={decrypted ? 2 : 0.5} floatIntensity={decrypted ? 2 : 0.5} position={[
          (Math.random() - 0.5) * 10,
          Math.random() * 4,
          (Math.random() - 0.5) * 6 - 2
        ]}>
          <group>
            {/* Inner Data Core */}
            <mesh>
              <boxGeometry args={[0.6, 0.6, 0.6]} />
              <meshStandardMaterial 
                color={decrypted ? "#00f0ff" : "#ff0040"} 
                emissive={decrypted ? "#00f0ff" : "#ff0040"}
                emissiveIntensity={decrypted ? 1 : 0.2}
              />
            </mesh>
            
            {/* Outer Cryo-Ice Shell */}
            {!decrypted && (
              <mesh>
                <boxGeometry args={[1, 1, 1]} />
                <MeshTransmissionMaterial 
                  backside
                  thickness={0.5}
                  roughness={0.2}
                  transmission={1}
                  ior={1.5}
                  color="#cceeff"
                />
              </mesh>
            )}
          </group>
        </Float>
      ))}

      {/* Cryo Atmosphere */}
      {!decrypted && <Sparkles count={500} scale={12} size={2} color="#88ccff" speed={0.2} opacity={0.5} />}
      
      {/* Platform */}
      <mesh position={[0, -1, -2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#051020" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Grid Lines */}
      <gridHelper args={[20, 20, '#00f0ff', '#002040']} position={[0, -0.99, -2]} />
    </group>
  );
};

/* ================================================================
   MAIN QUANTUM CYBER WARFARE DASHBOARD
   ================================================================ */

export default function QuantumWarfare() {
  const [view, setView] = useState("shor"); // 'shor' or 'hndl'
  const [active, setActive] = useState(false);
  const [decrypted, setDecrypted] = useState(false);
  const [log, setLog] = useState([]);

  const addLog = (msg) => setLog(prev => [msg, ...prev].slice(0, 5));

  const handleStart = () => {
    setActive(true);
    setDecrypted(false);
    setLog([]);
    
    if (view === "shor") {
      addLog("Initializing Shor's Algorithm...");
      addLog("Mapping prime factorization matrix...");
      addLog("Applying Quantum Fourier Transform...");
    } else {
      addLog("Accessing HNDL Cryo-Vault...");
      addLog("Isolating TLS 1.3 captured packets...");
      addLog("Spinning up Post-Quantum decryption module...");
    }
  };

  const handleDecrypted = () => {
    setDecrypted(true);
    if (view === "shor") {
      addLog("Wave function collapsed. Prime factors isolated.");
      addLog("RSA-4096 Key Compromised.");
      addLog("Extracting plaintext payload: SUCCESS");
    } else {
      addLog("Quantum brute-force complete.");
      addLog("Ice shielding shattered.");
      addLog("12 historical packet captures decrypted in 0.4 seconds.");
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
      
      {/* UI Controls */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '16px', background: 'rgba(0, 240, 255, 0.05)', border: '1px solid rgba(0, 240, 255, 0.2)', borderRadius: '12px' }}>
        <h3 style={{ color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', marginRight: '24px' }}>
          <MdAutoFixHigh style={{ color: 'var(--neon-cyan)' }} /> Quantum Vanguard
        </h3>
        
        <button 
          className={`btn ${view === "shor" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => { setView("shor"); setActive(false); setDecrypted(false); setLog([]); }}
        >
          Shor's Decryption Engine
        </button>
        <button 
          className={`btn ${view === "hndl" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => { setView("hndl"); setActive(false); setDecrypted(false); setLog([]); }}
        >
          <MdOutlineAcUnit /> HNDL Cryo-Vault
        </button>
        
        <div style={{ flex: 1 }} />
        
        <button 
          className="btn" 
          onClick={handleStart}
          disabled={active && !decrypted}
          style={{ background: active ? (decrypted ? 'var(--neon-green)' : 'var(--neon-yellow)') : '#ff0040', color: '#000', fontWeight: 'bold', border: 'none', padding: '10px 24px' }}
        >
          {active ? (decrypted ? 'OPERATION COMPLETE' : 'QUANTUM SYNCING...') : 'INITIALIZE SIMULATION'}
        </button>
      </div>

      {/* Main 3D Viewport */}
      <div style={{ flex: 1, position: 'relative', background: '#02050a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
        
        {/* Real-time Log Overlay */}
        <div style={{ position: 'absolute', bottom: 24, left: 24, zIndex: 10, width: '400px', pointerEvents: 'none' }}>
          {log.map((msg, i) => (
            <div key={i} style={{ 
              color: i === 0 && decrypted ? 'var(--neon-green)' : 'var(--neon-cyan)', 
              fontFamily: 'Fira Code, monospace', 
              fontSize: '0.9rem', 
              marginBottom: '8px',
              textShadow: '0 0 5px rgba(0,240,255,0.5)',
              opacity: 1 - (i * 0.2)
            }}>
              {`> ${msg}`}
            </div>
          ))}
          {decrypted && view === "shor" && (
            <div style={{ marginTop: 16, padding: 16, background: 'rgba(57, 255, 20, 0.1)', border: '1px solid var(--neon-green)', borderRadius: 8, color: '#fff', fontFamily: 'Fira Code' }}>
              <strong style={{ color: 'var(--neon-green)' }}>[DECRYPTED PAYLOAD]</strong><br/>
              username: admin_root<br/>
              password: hunter2_qkd_bypass
            </div>
          )}
        </div>

        <Canvas camera={{ position: [0, 6, 8], fov: 45 }}>
          <color attach="background" args={['#02050a']} />
          <OrbitControls makeDefault enablePan={false} maxPolarAngle={Math.PI / 2 - 0.1} />
          
          {view === "shor" ? (
            <QubitMatrix active={active} onDecrypted={handleDecrypted} />
          ) : (
            <CryoVault active={active} decrypted={decrypted} onDecrypted={handleDecrypted} />
          )}
        </Canvas>
      </div>
    </div>
  );
}
