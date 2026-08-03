"use client";

import { organs } from "@/data/organs";
import { useNotesStore } from "@/lib/notesStore";

export function NotesBoard() {
  const notes = useNotesStore((s) => s.notes);
  const setNote = useNotesStore((s) => s.setNote);
  const clearNote = useNotesStore((s) => s.clearNote);

  return (
    <div className="mt-6 space-y-3">
      {organs.map((organ) => {
        const value = notes[organ.id] ?? "";
        return (
          <div key={organ.id} className="rounded-card border border-line bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: organ.color }}
                >
                  {organ.name.charAt(0)}
                </span>
                <p className="text-sm font-semibold text-ink">{organ.name}</p>
              </div>
              {value && (
                <button
                  type="button"
                  onClick={() => clearNote(organ.id)}
                  className="text-xs font-medium text-muted hover:text-danger"
                >
                  Clear
                </button>
              )}
            </div>
            <textarea
              value={value}
              onChange={(e) => setNote(organ.id, e.target.value)}
              placeholder={`Write what you want to remember about the ${organ.name.toLowerCase()}…`}
              rows={2}
              className="mt-2 w-full resize-y rounded-control border border-line bg-paper px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-sage"
            />
          </div>
        );
      })}
    </div>
  );
}
