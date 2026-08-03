import { organs, groupBySystem } from "@/data/organs";
import { SystemsBoard } from "@/components/SystemsBoard";

export const metadata = {
  title: "Systems — Anatomy Atelier",
};

export default function SystemsPage() {
  const groups = groupBySystem(organs);
  const systems = Object.entries(groups) as [string, typeof organs][];

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-extrabold text-ink">Body systems</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Organs rarely work alone. Browse them grouped by the body system they belong to, then jump into
        the 3D explorer to see how each one is built.
      </p>

      <SystemsBoard systems={systems} />
    </div>
  );
}
