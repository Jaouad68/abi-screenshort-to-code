import type { OrganMeshProps } from "./types";

export function LiverMesh({ wireframe, color }: OrganMeshProps) {
  return (
    <group>
      <mesh position={[0.15, 0.1, 0]} scale={[1.15, 0.75, 0.9]} castShadow>
        <sphereGeometry args={[0.65, 32, 32]} />
        <meshPhysicalMaterial color={color} roughness={0.4} clearcoat={0.2} wireframe={wireframe} />
      </mesh>
      <mesh position={[-0.55, 0.28, 0.1]} scale={[0.7, 0.55, 0.7]} castShadow>
        <sphereGeometry args={[0.5, 28, 28]} />
        <meshPhysicalMaterial color={color} roughness={0.4} clearcoat={0.2} wireframe={wireframe} />
      </mesh>
      <mesh position={[0.3, -0.5, 0.35]} castShadow>
        <sphereGeometry args={[0.18, 20, 20]} />
        <meshPhysicalMaterial color="#4a6b3f" roughness={0.35} wireframe={wireframe} />
      </mesh>
    </group>
  );
}
