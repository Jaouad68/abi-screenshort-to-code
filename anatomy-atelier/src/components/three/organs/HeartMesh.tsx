import type { OrganMeshProps } from "./types";

export function HeartMesh({ wireframe, color }: OrganMeshProps) {
  return (
    <group>
      <mesh position={[-0.28, 0.35, 0.1]} castShadow>
        <sphereGeometry args={[0.55, 32, 32]} />
        <meshPhysicalMaterial color={color} roughness={0.45} clearcoat={0.35} wireframe={wireframe} />
      </mesh>
      <mesh position={[0.3, 0.35, 0]} castShadow>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshPhysicalMaterial color={color} roughness={0.45} clearcoat={0.35} wireframe={wireframe} />
      </mesh>
      <mesh position={[0, -0.35, 0.05]} rotation={[Math.PI, 0, 0]} castShadow>
        <coneGeometry args={[0.55, 1.1, 32]} />
        <meshPhysicalMaterial color={color} roughness={0.45} clearcoat={0.35} wireframe={wireframe} />
      </mesh>
      <mesh position={[0.1, 0.95, -0.05]} rotation={[0, 0, 0.4]} castShadow>
        <cylinderGeometry args={[0.13, 0.16, 0.7, 16]} />
        <meshPhysicalMaterial color="#b25a52" roughness={0.4} wireframe={wireframe} />
      </mesh>
      <mesh position={[-0.15, 0.85, 0.4]} rotation={[0.3, 0, -0.2]} castShadow>
        <cylinderGeometry args={[0.09, 0.11, 0.5, 16]} />
        <meshPhysicalMaterial color="#4d6f9e" roughness={0.4} wireframe={wireframe} />
      </mesh>
    </group>
  );
}
