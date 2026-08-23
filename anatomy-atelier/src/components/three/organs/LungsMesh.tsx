import type { OrganMeshProps } from "./types";

export function LungsMesh({ wireframe, color }: OrganMeshProps) {
  return (
    <group>
      <mesh position={[0.55, 0.1, 0]} scale={[0.8, 1.3, 0.8]} castShadow>
        <capsuleGeometry args={[0.38, 0.55, 8, 16]} />
        <meshPhysicalMaterial color={color} roughness={0.55} wireframe={wireframe} />
      </mesh>
      <mesh position={[-0.55, 0.1, 0]} scale={[0.75, 1.2, 0.8]} castShadow>
        <capsuleGeometry args={[0.34, 0.5, 8, 16]} />
        <meshPhysicalMaterial color={color} roughness={0.55} wireframe={wireframe} />
      </mesh>
      <mesh position={[0, 0.95, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 0.5, 16]} />
        <meshPhysicalMaterial color="#c9c2b8" roughness={0.5} wireframe={wireframe} />
      </mesh>
      <mesh position={[0.2, 0.7, 0]} rotation={[0, 0, -0.5]} castShadow>
        <cylinderGeometry args={[0.07, 0.09, 0.4, 12]} />
        <meshPhysicalMaterial color="#c9c2b8" roughness={0.5} wireframe={wireframe} />
      </mesh>
      <mesh position={[-0.2, 0.7, 0]} rotation={[0, 0, 0.5]} castShadow>
        <cylinderGeometry args={[0.07, 0.09, 0.4, 12]} />
        <meshPhysicalMaterial color="#c9c2b8" roughness={0.5} wireframe={wireframe} />
      </mesh>
    </group>
  );
}
