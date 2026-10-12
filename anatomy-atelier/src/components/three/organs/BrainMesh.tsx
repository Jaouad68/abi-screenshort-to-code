import type { OrganMeshProps } from "./types";

export function BrainMesh({ wireframe, color }: OrganMeshProps) {
  return (
    <group>
      <mesh position={[-0.32, 0.15, 0.1]} castShadow>
        <sphereGeometry args={[0.62, 32, 32]} />
        <meshPhysicalMaterial color={color} roughness={0.6} wireframe={wireframe} />
      </mesh>
      <mesh position={[0.32, 0.15, 0.1]} castShadow>
        <sphereGeometry args={[0.62, 32, 32]} />
        <meshPhysicalMaterial color={color} roughness={0.6} wireframe={wireframe} />
      </mesh>
      {[-0.3, -0.1, 0.1, 0.3].map((z, i) => (
        <mesh key={i} position={[0, 0.55, z]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.55, 0.035, 8, 32, Math.PI]} />
          <meshStandardMaterial color="#c47b7b" roughness={0.7} wireframe={wireframe} />
        </mesh>
      ))}
      <mesh position={[0, -0.35, -0.55]} castShadow>
        <sphereGeometry args={[0.4, 24, 24]} />
        <meshPhysicalMaterial color="#b96f6f" roughness={0.6} wireframe={wireframe} />
      </mesh>
      <mesh position={[0, -0.75, -0.15]} castShadow>
        <cylinderGeometry args={[0.16, 0.22, 0.55, 16]} />
        <meshPhysicalMaterial color="#c98d8d" roughness={0.5} wireframe={wireframe} />
      </mesh>
    </group>
  );
}
