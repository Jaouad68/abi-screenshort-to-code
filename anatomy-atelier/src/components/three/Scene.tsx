"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import type { Organ } from "@/data/organs";
import { OrganModel } from "./OrganModel";
import { HotspotMarker } from "./HotspotMarker";

interface SceneProps {
  organ: Organ;
  wireframe: boolean;
  autoRotate: boolean;
  functionAnimation: boolean;
  selectedHotspotId: string | null;
  cameraResetToken: number;
  onSelectHotspot: (id: string) => void;
  controlsRef: React.MutableRefObject<OrbitControlsImpl | null>;
}

function Pulsing({
  organ,
  wireframe,
  functionAnimation,
}: {
  organ: Organ;
  wireframe: boolean;
  functionAnimation: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const t0 = useRef(0);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    if (functionAnimation) {
      t0.current += delta;
      const scale = 1 + Math.sin(t0.current * 3.4) * 0.06;
      groupRef.current.scale.setScalar(scale);
    } else {
      groupRef.current.scale.setScalar(1);
      t0.current = 0;
    }
  });

  return <OrganModel ref={groupRef} organ={organ} wireframe={wireframe} />;
}

export function Scene({
  organ,
  wireframe,
  autoRotate,
  functionAnimation,
  selectedHotspotId,
  cameraResetToken,
  onSelectHotspot,
  controlsRef,
}: SceneProps) {
  useEffect(() => {
    controlsRef.current?.reset();
  }, [cameraResetToken, controlsRef]);

  useEffect(() => {
    controlsRef.current?.reset();
  }, [organ.id, controlsRef]);

  return (
    <>
      <color attach="background" args={["#f4f0e7"]} />
      <ambientLight intensity={0.65} />
      <directionalLight position={[3, 4, 4]} intensity={1.1} castShadow />
      <directionalLight position={[-3, 2, -2]} intensity={0.4} />
      <pointLight position={[0, 2, 3]} intensity={0.3} />

      <mesh position={[0, -1.55, 0]} receiveShadow>
        <sphereGeometry args={[1.7, 48, 48]} />
        <meshStandardMaterial color="#e7e2d4" roughness={0.9} />
      </mesh>

      <group position={[0, 0.1, 0]}>
        <Pulsing organ={organ} wireframe={wireframe} functionAnimation={functionAnimation} />
        {organ.hotspots.map((hotspot) => (
          <HotspotMarker
            key={hotspot.id}
            hotspot={hotspot}
            active={selectedHotspotId === hotspot.id}
            onSelect={onSelectHotspot}
          />
        ))}
      </group>

      <OrbitControls
        ref={controlsRef}
        autoRotate={autoRotate}
        autoRotateSpeed={1.6}
        enableDamping
        dampingFactor={0.08}
        minDistance={1.8}
        maxDistance={7}
      />
    </>
  );
}
