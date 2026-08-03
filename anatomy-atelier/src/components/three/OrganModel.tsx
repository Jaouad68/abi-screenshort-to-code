import { forwardRef } from "react";
import * as THREE from "three";
import type { Organ } from "@/data/organs";
import { HeartMesh } from "./organs/HeartMesh";
import { BrainMesh } from "./organs/BrainMesh";
import { LungsMesh } from "./organs/LungsMesh";
import { LiverMesh } from "./organs/LiverMesh";
import { KidneysMesh } from "./organs/KidneysMesh";
import { EyeMesh } from "./organs/EyeMesh";
import { IntestineMesh } from "./organs/IntestineMesh";
import { PancreasMesh } from "./organs/PancreasMesh";
import { SkinMesh } from "./organs/SkinMesh";

const meshByOrganId: Record<string, typeof HeartMesh> = {
  heart: HeartMesh,
  brain: BrainMesh,
  lungs: LungsMesh,
  liver: LiverMesh,
  kidneys: KidneysMesh,
  eye: EyeMesh,
  intestine: IntestineMesh,
  pancreas: PancreasMesh,
  skin: SkinMesh,
};

interface OrganModelProps {
  organ: Organ;
  wireframe: boolean;
}

export const OrganModel = forwardRef<THREE.Group, OrganModelProps>(function OrganModel(
  { organ, wireframe },
  ref
) {
  const Mesh = meshByOrganId[organ.id] ?? HeartMesh;
  return (
    <group ref={ref}>
      <Mesh wireframe={wireframe} color={organ.color} />
    </group>
  );
});
