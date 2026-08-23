import type { OrganMeshProps } from "./types";

export function PancreasMesh({ wireframe, color }: OrganMeshProps) {
  return (
    <group rotation={[0, 0, Math.PI / 2]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.28, 0.5, 1.7, 20, 1, false]} />
        <meshPhysicalMaterial color={color} roughness={0.55} wireframe={wireframe} />
      </mesh>
      {[-0.5, -0.15, 0.2, 0.5].map((t, i) => (
        <mesh key={i} position={[t, 0.32 - Math.abs(t) * 0.1, 0.2]}>
          <sphereGeometry args={[0.09, 14, 14]} />
          <meshStandardMaterial color="#b97a2a" roughness={0.4} wireframe={wireframe} />
        </mesh>
      ))}
    </group>
  );
}
