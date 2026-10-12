"use client";

import { useRef } from "react";
import { Canvas } from "@react-three/fiber";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { Organ } from "@/data/organs";
import { useExploreStore } from "@/lib/store";
import { Scene } from "./Scene";

function ToolButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`flex h-9 w-9 items-center justify-center rounded-control border text-sm transition-colors ${
        active
          ? "border-sage bg-sage text-white"
          : "border-line bg-white text-ink-2 hover:border-sage-line hover:bg-sage-l"
      }`}
    >
      {children}
    </button>
  );
}

export function Viewer3D({ organ }: { organ: Organ }) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const {
    wireframe,
    autoRotate,
    functionAnimation,
    selectedHotspotId,
    cameraResetToken,
    toggleWireframe,
    toggleAutoRotate,
    selectHotspot,
    resetCamera,
  } = useExploreStore();

  function dolly(direction: 1 | -1) {
    const controls = controlsRef.current;
    if (!controls) return;
    const camera = controls.object;
    const offset = camera.position.clone().sub(controls.target);
    offset.multiplyScalar(direction === 1 ? 0.82 : 1.22);
    camera.position.copy(controls.target).add(offset);
    controls.update();
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-card border border-line bg-paper">
      <Canvas
        shadows
        camera={{ position: [2.4, 1.4, 2.8], fov: 42 }}
        dpr={[1, 2]}
      >
        <Scene
          organ={organ}
          wireframe={wireframe}
          autoRotate={autoRotate}
          functionAnimation={functionAnimation}
          selectedHotspotId={selectedHotspotId}
          cameraResetToken={cameraResetToken}
          onSelectHotspot={selectHotspot}
          controlsRef={controlsRef}
        />
      </Canvas>

      <div className="pointer-events-none absolute left-3 top-3 rounded-pill bg-white/90 px-3 py-1 text-xs text-muted shadow-sm">
        Drag to rotate &middot; Scroll to zoom &middot; Click a dot to learn more
      </div>

      <div className="absolute right-3 top-3 flex flex-col gap-2">
        <ToolButton label="Zoom in" onClick={() => dolly(1)}>
          +
        </ToolButton>
        <ToolButton label="Zoom out" onClick={() => dolly(-1)}>
          &minus;
        </ToolButton>
        <ToolButton label="Reset view" onClick={resetCamera}>
          &#8635;
        </ToolButton>
        <ToolButton label="Toggle auto-rotate" active={autoRotate} onClick={toggleAutoRotate}>
          &#9679;
        </ToolButton>
        <ToolButton label="Toggle wireframe" active={wireframe} onClick={toggleWireframe}>
          &#9673;
        </ToolButton>
      </div>
    </div>
  );
}
