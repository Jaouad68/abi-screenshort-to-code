import type { OrganMeshProps } from "./types";

export function SkinMesh({ wireframe, color }: OrganMeshProps) {
  return (
    <group rotation={[-0.15, 0, 0]}>
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[1.6, 0.14, 1.2]} />
        <meshPhysicalMaterial color={color} roughness={0.6} wireframe={wireframe} />
      </mesh>
      <mesh position={[0, 0.12, 0]} castShadow>
        <boxGeometry args={[1.6, 0.28, 1.2]} />
        <meshPhysicalMaterial color="#d99a72" roughness={0.65} wireframe={wireframe} />
      </mesh>
      <mesh position={[0, -0.22, 0]} castShadow>
        <boxGeometry args={[1.6, 0.4, 1.2]} />
        <meshPhysicalMaterial color="#f2d9a8" roughness={0.7} wireframe={wireframe} />
      </mesh>
      {[[-0.5, 0.1], [0.1, -0.3], [0.5, 0.25]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.44, z]}>
          <cylinderGeometry args={[0.015, 0.02, 0.22, 8]} />
          <meshStandardMaterial color="#4a3423" roughness={0.5} wireframe={wireframe} />
        </mesh>
      ))}
    </group>
  );
}
