import { ClientOnly } from "@/components/ClientOnly";
import { NotesBoard } from "@/components/NotesBoard";

export const metadata = {
  title: "Notes — Anatomy Atelier",
};

export default function NotesPage() {
  return (
    <div className="mx-auto max-w-[900px] px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-extrabold text-ink">Your notes</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Jot down what you want to remember about each organ. Notes are saved on this device.
      </p>

      <ClientOnly>
        <NotesBoard />
      </ClientOnly>
    </div>
  );
}
