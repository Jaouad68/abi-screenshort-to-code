import { beforeEach, describe, expect, it } from "vitest";
import { useNotesStore } from "./notesStore";

beforeEach(() => {
  useNotesStore.setState({ notes: {} });
});

describe("notesStore", () => {
  it("starts with no notes", () => {
    expect(useNotesStore.getState().notes).toEqual({});
  });

  it("sets a note for an organ", () => {
    useNotesStore.getState().setNote("heart", "The left ventricle wall is the thickest.");
    expect(useNotesStore.getState().notes.heart).toBe("The left ventricle wall is the thickest.");
  });

  it("overwrites an existing note for the same organ", () => {
    useNotesStore.getState().setNote("heart", "first");
    useNotesStore.getState().setNote("heart", "second");
    expect(useNotesStore.getState().notes.heart).toBe("second");
  });

  it("keeps notes for other organs independent", () => {
    useNotesStore.getState().setNote("heart", "about the heart");
    useNotesStore.getState().setNote("brain", "about the brain");
    expect(useNotesStore.getState().notes).toEqual({ heart: "about the heart", brain: "about the brain" });
  });

  it("clears a note", () => {
    useNotesStore.getState().setNote("heart", "note");
    useNotesStore.getState().clearNote("heart");
    expect(useNotesStore.getState().notes.heart).toBeUndefined();
  });
});
