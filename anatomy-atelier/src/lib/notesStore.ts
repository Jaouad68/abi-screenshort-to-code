import { create } from "zustand";
import { persist } from "zustand/middleware";

interface NotesState {
  notes: Record<string, string>;
  setNote: (organId: string, text: string) => void;
  clearNote: (organId: string) => void;
}

export const useNotesStore = create<NotesState>()(
  persist(
    (set) => ({
      notes: {},
      setNote: (organId, text) =>
        set((state) => ({ notes: { ...state.notes, [organId]: text } })),
      clearNote: (organId) =>
        set((state) => {
          const next = { ...state.notes };
          delete next[organId];
          return { notes: next };
        }),
    }),
    { name: "anatomy-atelier-notes" }
  )
);
