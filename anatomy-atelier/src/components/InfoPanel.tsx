"use client";

import type { Organ } from "@/data/organs";
import { useExploreStore } from "@/lib/store";

export function InfoPanel({ organ }: { organ: Organ }) {
  const { selectedHotspotId, selectHotspot, setCompareOpen } = useExploreStore();
  const hotspot = organ.hotspots.find((h) => h.id === selectedHotspotId);

  return (
    <aside className="flex h-full flex-col rounded-card border border-line bg-white">
      <div className="scrollbar-thin flex-1 overflow-y-auto p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-sage-d">
          {hotspot ? "Hotspot" : `The ${organ.name.toLowerCase()}`}
        </p>

        {hotspot ? (
          <>
            <div className="mt-1 flex items-center justify-between gap-2">
              <h2 className="text-2xl font-extrabold text-ink">{hotspot.label}</h2>
              <button
                type="button"
                onClick={() => selectHotspot(null)}
                className="shrink-0 rounded-pill border border-line px-2.5 py-1 text-xs font-medium text-ink-2 hover:bg-paper"
              >
                &larr; Overview
              </button>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink-2">{hotspot.description}</p>
            <p className="mt-4 text-xs text-muted">Part of the {organ.name.toLowerCase()}. Click another dot on the model to explore more.</p>
          </>
        ) : (
          <>
            <div className="mt-1 flex items-start gap-3">
              <span
                className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-bold text-white"
                style={{ backgroundColor: organ.color }}
              >
                {organ.name.charAt(0)}
              </span>
              <div>
                <h2 className="text-2xl font-extrabold text-ink">{organ.name}</h2>
                <p className="text-sm text-muted">{organ.tagline}</p>
              </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-ink-2">{organ.description}</p>

            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Key facts</p>
              <dl className="mt-2 divide-y divide-line rounded-control border border-line">
                {organ.keyFacts.map((fact) => (
                  <div key={fact.label} className="flex items-start justify-between gap-4 px-3 py-2 text-sm">
                    <dt className="shrink-0 text-muted">{fact.label}</dt>
                    <dd className="text-right font-medium text-ink">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="mt-5 rounded-control border border-sage-line bg-sage-l px-3 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-sage-d">Medical importance</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-2">{organ.medicalImportance}</p>
            </div>

            <div className="mt-3 rounded-control border border-coral-l bg-coral-l/60 px-3 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-coral">Did you know?</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-2">{organ.didYouKnow}</p>
            </div>
          </>
        )}
      </div>

      <div className="flex gap-2 border-t border-line p-3">
        <button
          type="button"
          onClick={() => setCompareOpen(true)}
          className="flex-1 rounded-control bg-coral px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Compare organs
        </button>
        <a
          href={`/lessons#${organ.id}`}
          className="flex-1 rounded-control border border-line px-3 py-2 text-center text-sm font-semibold text-ink-2 hover:bg-paper"
        >
          Quiz me
        </a>
      </div>
    </aside>
  );
}
