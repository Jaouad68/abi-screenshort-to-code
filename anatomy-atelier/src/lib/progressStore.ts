import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ProgressState {
  completedLessonIds: string[];
  toggleLessonComplete: (lessonId: string) => void;
  isComplete: (lessonId: string) => boolean;
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      completedLessonIds: [],
      toggleLessonComplete: (lessonId) =>
        set((state) => ({
          completedLessonIds: state.completedLessonIds.includes(lessonId)
            ? state.completedLessonIds.filter((id) => id !== lessonId)
            : [...state.completedLessonIds, lessonId],
        })),
      isComplete: (lessonId) => get().completedLessonIds.includes(lessonId),
    }),
    { name: "anatomy-atelier-progress" }
  )
);
