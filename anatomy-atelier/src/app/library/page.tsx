import { LibraryBoard } from "@/components/LibraryBoard";

export const metadata = {
  title: "Library — Anatomy Atelier",
};

export default function LibraryPage() {
  return (
    <div className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-extrabold text-ink">Organ library</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        A reference card for every organ in Anatomy Atelier &mdash; search by name or system, then open
        any one in the 3D explorer.
      </p>

      <LibraryBoard />
    </div>
  );
}
