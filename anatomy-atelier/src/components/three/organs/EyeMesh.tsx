import type { OrganMeshProps } from "./types";

export function EyeMesh({ wireframe, color }: OrganMeshProps) {
  return (
    <group>
      <mesh castShadow>
        <sphereGeometry args={[0.75, 32, 32]} />
        <meshPhysicalMaterial color="#f2ede0" roughness={0.3} wireframe={wireframe} />
      </mesh>
      <mesh position={[0, 0, 0.7]} castShadow>
        <sphereGeometry args={[0.32, 24, 24]} />
        <meshPhysicalMaterial color={color} roughness={0.15} clearcoat={0.8} wireframe={wireframe} />
      </mesh>
      <mesh position={[0, 0, 0.85]} castShadow>
        <sphereGeometry args={[0.14, 20, 20]} />
        <meshStandardMaterial color="#14211d" roughness={0.1} wireframe={wireframe} />
      </mesh>
      <mesh position={[0, 0, -0.7]}>
        <sphereGeometry args={[0.35, 24, 24]} />
        <meshStandardMaterial color="#a6402f" roughness={0.5} wireframe={wireframe} />
      </mesh>
      <mesh position={[0.15, -0.05, -0.95]} rotation={[0.3, 0, 0]}>
        <cylinderGeometry args={[0.09, 0.14, 0.5, 14]} />
        <meshStandardMaterial color="#e8dcb8" roughness={0.5} wireframe={wireframe} />
      </mesh>
    </group>
  );
}
