import type { OrganMeshProps } from "./types";

function Kidney({ x, color, wireframe }: { x: number; color: string; wireframe: boolean }) {
  return (
    <group position={[x, 0, 0]}>
      <mesh scale={[0.55, 0.85, 0.5]} castShadow>
        <sphereGeometry args={[0.5, 28, 28]} />
        <meshPhysicalMaterial color={color} roughness={0.45} wireframe={wireframe} />
      </mesh>
      <mesh position={[x > 0 ? -0.32 : 0.32, 0, 0.15]} scale={[0.35, 0.55, 0.4]}>
        <sphereGeometry args={[0.4, 24, 24]} />
        <meshStandardMaterial color="#f4f0e7" roughness={0.6} wireframe={wireframe} />
      </mesh>
      <mesh position={[0, -0.75, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.06, 0.5, 10]} />
        <meshStandardMaterial color="#e8dcb8" roughness={0.5} wireframe={wireframe} />
      </mesh>
    </group>
  );
}

export function KidneysMesh({ wireframe, color }: OrganMeshProps) {
  return (
    <group>
      <Kidney x={0.5} color={color} wireframe={wireframe} />
      <Kidney x={-0.5} color={color} wireframe={wireframe} />
    </group>
  );
}
