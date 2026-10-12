import { beforeEach, describe, expect, it } from "vitest";
import { useProgressStore } from "./progressStore";

beforeEach(() => {
  useProgressStore.setState({ completedLessonIds: [] });
});

describe("progressStore", () => {
  it("starts with no completed lessons", () => {
    expect(useProgressStore.getState().completedLessonIds).toEqual([]);
    expect(useProgressStore.getState().isComplete("heart-basics")).toBe(false);
  });

  it("marks a lesson complete on toggle", () => {
    useProgressStore.getState().toggleLessonComplete("heart-basics");
    expect(useProgressStore.getState().isComplete("heart-basics")).toBe(true);
  });

  it("marks a lesson incomplete when toggled twice", () => {
    useProgressStore.getState().toggleLessonComplete("heart-basics");
    useProgressStore.getState().toggleLessonComplete("heart-basics");
    expect(useProgressStore.getState().isComplete("heart-basics")).toBe(false);
  });

  it("tracks multiple lessons independently", () => {
    useProgressStore.getState().toggleLessonComplete("heart-basics");
    useProgressStore.getState().toggleLessonComplete("brain-lobes");
    expect(useProgressStore.getState().completedLessonIds.sort()).toEqual(["brain-lobes", "heart-basics"]);
  });
});
