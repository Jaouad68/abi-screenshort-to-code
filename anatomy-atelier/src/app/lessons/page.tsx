import { ClientOnly } from "@/components/ClientOnly";
import { LessonsBoard } from "@/components/LessonsBoard";

export const metadata = {
  title: "Lessons — Anatomy Atelier",
};

export default function LessonsPage() {
  return (
    <div className="mx-auto max-w-[900px] px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-extrabold text-ink">Lessons</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Short, focused lessons for every organ &mdash; read the objectives, then check your
        understanding with a quick quiz.
      </p>

      <ClientOnly>
        <LessonsBoard />
      </ClientOnly>
    </div>
  );
}
