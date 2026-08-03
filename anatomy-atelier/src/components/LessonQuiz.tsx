"use client";

import { useState } from "react";
import type { QuizQuestion } from "@/data/lessons";

export function LessonQuiz({ quiz }: { quiz: QuizQuestion[] }) {
  const [answers, setAnswers] = useState<(number | null)[]>(() => quiz.map(() => null));
  const [checked, setChecked] = useState(false);

  const score = quiz.reduce((sum, q, i) => sum + (answers[i] === q.correctIndex ? 1 : 0), 0);

  return (
    <div className="mt-4 space-y-4 rounded-control border border-line bg-paper p-4">
      {quiz.map((question, qi) => (
        <fieldset key={question.question}>
          <legend className="text-sm font-semibold text-ink">
            {qi + 1}. {question.question}
          </legend>
          <div className="mt-2 space-y-1.5">
            {question.options.map((option, oi) => {
              const isSelected = answers[qi] === oi;
              const isCorrect = checked && oi === question.correctIndex;
              const isWrongSelected = checked && isSelected && oi !== question.correctIndex;
              return (
                <label
                  key={option}
                  className={`flex cursor-pointer items-center gap-2 rounded-control border px-3 py-1.5 text-sm ${
                    isCorrect
                      ? "border-sage bg-sage-l text-sage-d"
                      : isWrongSelected
                        ? "border-danger bg-coral-l text-danger"
                        : isSelected
                          ? "border-sage-line bg-white"
                          : "border-line bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name={question.question}
                    checked={isSelected}
                    onChange={() =>
                      setAnswers((prev) => prev.map((a, i) => (i === qi ? oi : a)))
                    }
                    className="accent-sage"
                  />
                  {option}
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setChecked(true)}
          disabled={answers.some((a) => a === null)}
          className="rounded-control bg-sage px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          Check answers
        </button>
        {checked && (
          <span className="text-sm font-medium text-ink-2">
            Score: {score} / {quiz.length}
          </span>
        )}
      </div>
    </div>
  );
}
