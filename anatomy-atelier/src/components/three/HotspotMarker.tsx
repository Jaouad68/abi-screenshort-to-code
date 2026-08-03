"use client";

import { useState } from "react";
import { Html } from "@react-three/drei";
import type { Hotspot } from "@/data/organs";

interface HotspotMarkerProps {
  hotspot: Hotspot;
  active: boolean;
  onSelect: (id: string) => void;
}

export function HotspotMarker({ hotspot, active, onSelect }: HotspotMarkerProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <group position={hotspot.position}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onSelect(hotspot.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "auto";
        }}
      >
        <sphereGeometry args={[active || hovered ? 0.05 : 0.04, 16, 16]} />
        <meshStandardMaterial
          color={active ? "#ab7a26" : "#ffffff"}
          emissive={active ? "#ab7a26" : "#527e6d"}
          emissiveIntensity={active || hovered ? 0.9 : 0.5}
        />
      </mesh>
      {(hovered || active) && (
        <Html distanceFactor={8} occlude style={{ pointerEvents: "none" }}>
          <div className="whitespace-nowrap rounded-full bg-ink px-3 py-1 text-xs font-medium text-white shadow-lg">
            {hotspot.label}
          </div>
        </Html>
      )}
    </group>
  );
}
