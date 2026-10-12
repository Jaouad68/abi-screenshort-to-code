"use client";

import dynamic from "next/dynamic";
import { getOrganById, organs } from "@/data/organs";
import { useExploreStore } from "@/lib/store";
import { OrganSidebar } from "./OrganSidebar";
import { InfoPanel } from "./InfoPanel";
import { BottomToolbar } from "./BottomToolbar";
import { CompareDrawer } from "./CompareDrawer";

const Viewer3D = dynamic(() => import("./three/Viewer3D").then((m) => m.Viewer3D), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center rounded-card border border-line bg-paper text-sm text-muted">
      Loading 3D model&hellip;
    </div>
  ),
});

export function ExploreScreen() {
  const selectedOrganId = useExploreStore((s) => s.selectedOrganId);
  const organ = getOrganById(selectedOrganId) ?? organs[0];

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-4 sm:px-6">
      <div className="grid gap-4 lg:grid-cols-[260px_1fr_340px]">
        <div className="lg:h-[calc(100vh-6rem)]">
          <OrganSidebar />
        </div>

        <div className="flex flex-col lg:h-[calc(100vh-6rem)]">
          <div className="min-h-[420px] flex-1">
            <Viewer3D organ={organ} />
          </div>
          <BottomToolbar organ={organ} />
        </div>

        <div className="lg:h-[calc(100vh-6rem)]">
          <InfoPanel organ={organ} />
        </div>
      </div>

      <CompareDrawer />
    </div>
  );
}
