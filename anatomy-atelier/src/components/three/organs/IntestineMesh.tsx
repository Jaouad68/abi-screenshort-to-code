import * as THREE from "three";
import { useMemo } from "react";
import type { OrganMeshProps } from "./types";

function buildCoilCurve(loops: number, radius: number, height: number, points: number) {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= points; i++) {
    const t = i / points;
    const angle = t * loops * Math.PI * 2;
    const r = radius * (1 - t * 0.25);
    pts.push(new THREE.Vector3(Math.cos(angle) * r, height * (t - 0.5), Math.sin(angle) * r * 0.6));
  }
  return new THREE.CatmullRomCurve3(pts);
}

export function IntestineMesh({ wireframe, color }: OrganMeshProps) {
  const smallIntestine = useMemo(() => buildCoilCurve(4.5, 0.65, 1.3, 200), []);
  const colon = useMemo(() => buildCoilCurve(1.1, 0.9, 0.5, 60), []);

  return (
    <group>
      <mesh castShadow>
        <tubeGeometry args={[smallIntestine, 200, 0.13, 12, false]} />
        <meshPhysicalMaterial color={color} roughness={0.5} wireframe={wireframe} />
      </mesh>
      <mesh position={[0, 0.75, 0]} castShadow>
        <tubeGeometry args={[colon, 60, 0.19, 12, false]} />
        <meshPhysicalMaterial color="#a86b3d" roughness={0.5} wireframe={wireframe} />
      </mesh>
      <mesh position={[-0.6, -0.55, 0.1]}>
        <capsuleGeometry args={[0.08, 0.22, 6, 10]} />
        <meshStandardMaterial color="#8a5c34" roughness={0.5} wireframe={wireframe} />
      </mesh>
    </group>
  );
}
