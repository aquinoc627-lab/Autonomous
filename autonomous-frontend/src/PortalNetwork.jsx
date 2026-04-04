import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  useCursor, 
  MeshPortalMaterial, 
  Text, 
  Environment, 
  Sphere, 
  Box, 
  Float, 
  Line,
  OrbitControls
} from '@react-three/drei';
import * as THREE from 'three';
import { MdOutlinePublic } from 'react-icons/md';

/* ================================================================
   INNER PORTAL SCENES (What you see inside the target)
   ================================================================ */

// Scene inside an exploited database server
const DatabaseScene = () => {
  return (
    <group>
      <color attach="background" args={['#0a0000']} />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#ff0040" />
      {/* Floating data blocks representing tables/records */}
      {Array.from({ length: 40 }).map((_, i) => (
        <Float key={i} speed={2} rotationIntensity={2} floatIntensity={2} position={[
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 8 - 2
        ]}>
          <Box args={[0.5, 0.1, 0.8]}>
            <meshStandardMaterial color="#ff0040" wireframe />
          </Box>
        </Float>
      ))}
      <Text position={[0, 0, -5]} fontSize={1} color="#ff0040" font="/fonts/FiraCode-Regular.ttf">
        DB_ROOT_ACCESS
      </Text>
    </group>
  );
};

// Scene inside a vulnerable web server
const WebServerScene = () => {
  return (
    <group>
      <color attach="background" args={['#000a0a']} />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#00f0ff" />
      {/* Directory structure representation */}
      <group position={[0, -1, -3]}>
        <Box args={[4, 0.2, 4]} position={[0, -0.5, 0]}>
          <meshStandardMaterial color="#00f0ff" transparent opacity={0.2} />
        </Box>
        <Box args={[1, 2, 1]} position={[-1, 0.5, -1]}>
          <meshStandardMaterial color="#00f0ff" wireframe />
        </Box>
        <Box args={[1, 3, 1]} position={[1, 1, 0]}>
          <meshStandardMaterial color="#00f0ff" wireframe />
        </Box>
      </group>
      <Text position={[0, 2, -4]} fontSize={0.8} color="#00f0ff">
        /var/www/html (RCE Active)
      </Text>
    </group>
  );
};

// Scene inside a compromised IoT gateway
const IoTGatewayScene = () => {
  return (
    <group>
      <color attach="background" args={['#0a0a00']} />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#ffe600" />
      {/* Network mesh representation */}
      {Array.from({ length: 15 }).map((_, i) => (
        <Sphere key={i} args={[0.2, 8, 8]} position={[
          Math.sin(i) * 3,
          Math.cos(i * 2) * 2,
          Math.sin(i * 3) * -3 - 2
        ]}>
          <meshStandardMaterial color="#ffe600" />
        </Sphere>
      ))}
      <Text position={[0, 0, -6]} fontSize={1} color="#ffe600">
        IoT_BOTNET_C2
      </Text>
    </group>
  );
};

/* ================================================================
   PORTAL COMPONENT
   ================================================================ */
const TargetPortal = ({ id, name, ip, position, rotation, bg, scene: Scene, active, setActive, hovered, setHovered }) => {
  const portalRef = useRef();
  const isActive = active === id;
  const isHovered = hovered === id;

  useCursor(isHovered);

  // Animate portal opening/closing
  useFrame((state, delta) => {
    if (portalRef.current) {
      const targetBlend = isActive ? 1 : 0;
      portalRef.current.blend = THREE.MathUtils.lerp(portalRef.current.blend, targetBlend, delta * 5);
    }
  });

  return (
    <group position={position} rotation={rotation}>
      <Text position={[0, 1.8, 0]} fontSize={0.3} color={isActive ? "#fff" : bg} anchorY="bottom">
        {name}
      </Text>
      <Text position={[0, 1.5, 0]} fontSize={0.15} color="gray" anchorY="bottom">
        {ip}
      </Text>
      
      {/* Outer Shell (What you see from the outside) */}
      <mesh 
        onPointerOver={() => setHovered(id)} 
        onPointerOut={() => setHovered(null)}
        onDoubleClick={() => setActive(isActive ? null : id)}
      >
        {/* We use a capsule or sphere as the portal door */}
        <sphereGeometry args={[1.2, 64, 64]} />
        <MeshPortalMaterial ref={portalRef} side={THREE.DoubleSide}>
          <Scene />
        </MeshPortalMaterial>
      </mesh>
      
      {/* Glow ring around the portal */}
      <mesh position={[0, 0, -0.01]}>
        <ringGeometry args={[1.25, 1.3, 64]} />
        <meshBasicMaterial color={bg} transparent opacity={isHovered ? 1 : 0.3} />
      </mesh>
    </group>
  );
};

/* ================================================================
   RIG (Camera Controls & Animation)
   ================================================================ */
const CameraRig = ({ active }) => {
  const { camera } = useThree();
  
  useFrame((state, delta) => {
    if (!active) return; // Let OrbitControls handle it when inactive

    const targetPosition = new THREE.Vector3();
    const targetLookAt = new THREE.Vector3();

    if (active === "db") {
      targetPosition.set(0, 0, 0.1);
      targetLookAt.set(0, 0, -2);
    } else if (active === "web") {
      targetPosition.set(-3, 0, 0.1);
      targetLookAt.set(-3, 0, -2);
    } else if (active === "iot") {
      targetPosition.set(3, 0, 0.1);
      targetLookAt.set(3, 0, -2);
    }

    // Smoothly interpolate camera position
    camera.position.lerp(targetPosition, delta * 4);
    
    // Smoothly interpolate rotation using dummy object
    const dummy = new THREE.Object3D();
    dummy.position.copy(camera.position);
    dummy.lookAt(targetLookAt);
    camera.quaternion.slerp(dummy.quaternion, delta * 4);
  });

  return !active ? (
    <OrbitControls 
      makeDefault 
      enablePan={false}
      enableDamping
      minDistance={4} 
      maxDistance={15} 
      minPolarAngle={Math.PI / 4} 
      maxPolarAngle={Math.PI / 1.5} 
    />
  ) : null;
};

/* ================================================================
   MAIN PORTAL NETWORK COMPONENT
   ================================================================ */
export default function PortalNetwork() {
  const [active, setActive] = useState(null);
  const [hovered, setHovered] = useState(null);

  return (
    <div style={{ width: '100%', height: '600px', background: '#020205', borderRadius: '16px', overflow: 'hidden', position: 'relative', border: '1px solid rgba(0,240,255,0.2)' }}>
      {/* UI Overlay */}
      <div style={{ position: 'absolute', top: 20, left: 24, zIndex: 10, pointerEvents: 'none' }}>
        <h3 style={{ color: '#fff', margin: 0, fontSize: '1.4rem', textTransform: 'uppercase', letterSpacing: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MdOutlinePublic style={{ color: 'var(--neon-cyan)' }} /> Non-Euclidean Topology
        </h3>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'Fira Code, monospace', fontSize: '0.85rem', marginTop: 8 }}>
          {active ? "Quantum tunnel established. Inside target node." : "Double-click a portal node to dive into its internal filesystem."}
        </p>
      </div>

      {active && (
        <button 
          onClick={() => setActive(null)}
          style={{
            position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 10,
            background: 'rgba(255,0,64,0.2)', border: '1px solid #ff0040', color: '#ff0040',
            padding: '8px 24px', borderRadius: '24px', cursor: 'pointer', fontFamily: 'Fira Code, monospace',
            textTransform: 'uppercase', letterSpacing: '1px', backdropFilter: 'blur(4px)'
          }}
        >
          Close Portal & Extract
        </button>
      )}

      {/* 3D Canvas */}
      <Canvas camera={{ position: [0, 5, 8], fov: 50 }}>
        <color attach="background" args={['#020205']} />
        <ambientLight intensity={0.2} />
        
        {/* Draw network lines connecting the portals */}
        <Line points={[[-3, 0, 0], [0, 0, 0]]} color="rgba(0,240,255,0.3)" lineWidth={2} />
        <Line points={[[0, 0, 0], [3, 0, 0]]} color="rgba(0,240,255,0.3)" lineWidth={2} />

        <TargetPortal 
          id="web" 
          name="EDGE-ROUTER" 
          ip="192.168.1.1" 
          position={[-3, 0, 0]} 
          rotation={[0, Math.PI / 6, 0]}
          bg="#00f0ff"
          scene={WebServerScene}
          active={active}
          setActive={setActive}
          hovered={hovered}
          setHovered={setHovered}
        />
        
        <TargetPortal 
          id="db" 
          name="CORE-DB-01" 
          ip="10.0.0.55" 
          position={[0, 0, 0]} 
          rotation={[0, 0, 0]}
          bg="#ff0040"
          scene={DatabaseScene}
          active={active}
          setActive={setActive}
          hovered={hovered}
          setHovered={setHovered}
        />
        
        <TargetPortal 
          id="iot" 
          name="HVAC-CONTROLLER" 
          ip="172.16.0.12" 
          position={[3, 0, 0]} 
          rotation={[0, -Math.PI / 6, 0]}
          bg="#ffe600"
          scene={IoTGatewayScene}
          active={active}
          setActive={setActive}
          hovered={hovered}
          setHovered={setHovered}
        />

        <CameraRig active={active} />
      </Canvas>
    </div>
  );
}
