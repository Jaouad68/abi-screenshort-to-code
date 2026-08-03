import { create } from "zustand";
import { organs } from "@/data/organs";

export type ViewerPanel = "microscopic" | "clinical" | "location" | null;

interface ExploreState {
  selectedOrganId: string;
  selectedHotspotId: string | null;
  autoRotate: boolean;
  wireframe: boolean;
  functionAnimation: boolean;
  activePanel: ViewerPanel;
  compareOpen: boolean;
  compareOrganIds: [string, string];
  cameraResetToken: number;

  selectOrgan: (id: string) => void;
  selectHotspot: (id: string | null) => void;
  toggleAutoRotate: () => void;
  toggleWireframe: () => void;
  toggleFunctionAnimation: () => void;
  togglePanel: (panel: Exclude<ViewerPanel, null>) => void;
  setCompareOpen: (open: boolean) => void;
  setCompareOrgan: (slot: 0 | 1, id: string) => void;
  resetCamera: () => void;
}

const defaultCompareIds: [string, string] = [organs[0].id, organs[1]?.id ?? organs[0].id];

export const useExploreStore = create<ExploreState>((set, get) => ({
  selectedOrganId: organs[0].id,
  selectedHotspotId: null,
  autoRotate: false,
  wireframe: false,
  functionAnimation: false,
  activePanel: null,
  compareOpen: false,
  compareOrganIds: defaultCompareIds,
  cameraResetToken: 0,

  selectOrgan: (id) => set({ selectedOrganId: id, selectedHotspotId: null }),
  selectHotspot: (id) => set({ selectedHotspotId: id }),
  toggleAutoRotate: () => set({ autoRotate: !get().autoRotate }),
  toggleWireframe: () => set({ wireframe: !get().wireframe }),
  toggleFunctionAnimation: () => set({ functionAnimation: !get().functionAnimation }),
  togglePanel: (panel) => set({ activePanel: get().activePanel === panel ? null : panel }),
  setCompareOpen: (open) => set({ compareOpen: open }),
  setCompareOrgan: (slot, id) =>
    set((state) => {
      const next: [string, string] = [...state.compareOrganIds];
      next[slot] = id;
      return { compareOrganIds: next };
    }),
  resetCamera: () => set({ cameraResetToken: get().cameraResetToken + 1 }),
}));
