"use client";

import type { Organ } from "@/data/organs";
import { useExploreStore } from "@/lib/store";
import { BodySilhouette } from "./BodySilhouette";

const items = [
  { key: "microscopic", label: "Microscopic view" },
  { key: "compare", label: "Compare organs" },
  { key: "function", label: "Function animation" },
  { key: "clinical", label: "Clinical notes" },
  { key: "location", label: "Where it works" },
] as const;

export function BottomToolbar({ organ }: { organ: Organ }) {
  const {
    activePanel,
    togglePanel,
    functionAnimation,
    toggleFunctionAnimation,
    setCompareOpen,
  } = useExploreStore();

  function handleClick(key: (typeof items)[number]["key"]) {
    if (key === "compare") return setCompareOpen(true);
    if (key === "function") return toggleFunctionAnimation();
    togglePanel(key);
  }

  function isActive(key: (typeof items)[number]["key"]) {
    if (key === "function") return functionAnimation;
    if (key === "compare") return false;
    return activePanel === key;
  }

  return (
    <div className="mt-3 rounded-card border border-line bg-white">
      <div className="flex flex-wrap items-center gap-1 border-b border-line p-2">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => handleClick(item.key)}
            className={`rounded-pill px-3.5 py-1.5 text-sm font-medium transition-colors ${
              isActive(item.key) ? "bg-sage text-white" : "text-ink-2 hover:bg-sage-l"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {activePanel === "microscopic" && (
        <div className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Tissue type</p>
            <p className="mt-0.5 text-sm font-medium text-ink">{organ.microscopic.tissueType}</p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">Key cell types</p>
            <ul className="mt-1 flex flex-wrap gap-1.5">
              {organ.microscopic.cellTypes.map((cell) => (
                <li key={cell} className="rounded-pill bg-sage-l px-2.5 py-1 text-xs font-medium text-sage-d">
                  {cell}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm leading-relaxed text-ink-2">{organ.microscopic.funFact}</p>
          </div>
        </div>
      )}

      {activePanel === "clinical" && (
        <div className="grid gap-3 p-4 sm:grid-cols-3">
          {organ.clinicalNotes.map((note) => (
            <div key={note.condition} className="rounded-control border border-line bg-paper p-3">
              <p className="text-sm font-semibold text-ink">{note.condition}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">{note.description}</p>
            </div>
          ))}
        </div>
      )}

      {activePanel === "location" && (
        <div className="p-4 text-center">
          <BodySilhouette x={organ.bodyPosition.x} y={organ.bodyPosition.y} color={organ.color} />
          <p className="mt-2 text-sm text-muted">
            The {organ.name.toLowerCase()} sits at roughly {organ.bodyPosition.y}% down the body, from the top of the head.
          </p>
        </div>
      )}
    </div>
  );
}
