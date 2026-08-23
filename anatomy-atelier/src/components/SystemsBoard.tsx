"use client";

import { useRouter } from "next/navigation";
import type { Organ } from "@/data/organs";
import { useExploreStore } from "@/lib/store";

export function SystemsBoard({ systems }: { systems: [string, Organ[]][] }) {
  const router = useRouter();
  const selectOrgan = useExploreStore((s) => s.selectOrgan);

  function openInExplorer(organId: string) {
    selectOrgan(organId);
    router.push("/");
  }

  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      {systems.map(([system, list]) => (
        <div key={system} className="rounded-card border border-line bg-white p-4">
          <h2 className="text-lg font-bold text-ink">{system}</h2>
          <p className="mt-0.5 text-xs text-muted">
            {list.length} organ{list.length > 1 ? "s" : ""}
          </p>
          <ul className="mt-3 space-y-2">
            {list.map((organ) => (
              <li key={organ.id}>
                <button
                  type="button"
                  onClick={() => openInExplorer(organ.id)}
                  className="flex w-full items-center gap-3 rounded-control border border-line px-3 py-2 text-left hover:border-sage-line hover:bg-sage-l"
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: organ.color }}
                  >
                    {organ.name.charAt(0)}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-ink">{organ.name}</span>
                    <span className="block text-xs text-muted">{organ.tagline}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
