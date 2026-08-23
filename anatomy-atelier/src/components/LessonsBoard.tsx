"use client";

import { organs } from "@/data/organs";
import { getLessonsForOrgan } from "@/data/lessons";
import { useProgressStore } from "@/lib/progressStore";
import { LessonQuiz } from "./LessonQuiz";

export function LessonsBoard() {
  const completedLessonIds = useProgressStore((s) => s.completedLessonIds);
  const toggleLessonComplete = useProgressStore((s) => s.toggleLessonComplete);

  const totalLessons = organs.reduce((sum, o) => sum + getLessonsForOrgan(o.id).length, 0);

  return (
    <div className="mt-6">
      <div className="mb-6 rounded-control border border-sage-line bg-sage-l px-4 py-3 text-sm font-medium text-sage-d">
        {completedLessonIds.length} / {totalLessons} lessons completed
      </div>

      <div className="space-y-8">
        {organs.map((organ) => {
          const organLessons = getLessonsForOrgan(organ.id);
          if (organLessons.length === 0) return null;
          return (
            <section key={organ.id} id={organ.id} className="scroll-mt-24">
              <div className="flex items-center gap-2.5">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: organ.color }}
                >
                  {organ.name.charAt(0)}
                </span>
                <h2 className="text-lg font-bold text-ink">{organ.name}</h2>
              </div>

              <div className="mt-3 space-y-4">
                {organLessons.map((lesson) => {
                  const complete = completedLessonIds.includes(lesson.id);
                  return (
                    <div key={lesson.id} className="rounded-card border border-line bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-ink">{lesson.title}</h3>
                          <p className="mt-0.5 text-sm text-muted">{lesson.summary}</p>
                        </div>
                        <label className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted">
                          <input
                            type="checkbox"
                            checked={complete}
                            onChange={() => toggleLessonComplete(lesson.id)}
                            className="accent-sage"
                          />
                          Done
                        </label>
                      </div>

                      <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-ink-2">
                        {lesson.objectives.map((objective) => (
                          <li key={objective}>{objective}</li>
                        ))}
                      </ul>

                      <LessonQuiz quiz={lesson.quiz} />
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
