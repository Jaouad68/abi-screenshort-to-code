import { describe, expect, it } from "vitest";
import { organs } from "./organs";
import { getLessonsForOrgan, lessons } from "./lessons";

describe("lessons data", () => {
  it("references only valid organ ids", () => {
    const organIds = new Set(organs.map((o) => o.id));
    for (const lesson of lessons) {
      expect(organIds.has(lesson.organId)).toBe(true);
    }
  });

  it("gives every organ at least one lesson", () => {
    for (const organ of organs) {
      expect(getLessonsForOrgan(organ.id).length).toBeGreaterThanOrEqual(1);
    }
  });

  it("has a correctIndex within range for every quiz question", () => {
    for (const lesson of lessons) {
      for (const question of lesson.quiz) {
        expect(question.correctIndex).toBeGreaterThanOrEqual(0);
        expect(question.correctIndex).toBeLessThan(question.options.length);
      }
    }
  });

  it("has unique lesson ids", () => {
    const ids = lessons.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
