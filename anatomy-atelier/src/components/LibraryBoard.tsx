"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { searchOrgans } from "@/data/organs";
import { useExploreStore } from "@/lib/store";

export function LibraryBoard() {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const selectOrgan = useExploreStore((s) => s.selectOrgan);
  const results = useMemo(() => searchOrgans(query), [query]);

  function openInExplorer(organId: string) {
    selectOrgan(organId);
    router.push("/");
  }

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        type="search"
        placeholder="Search organs, systems&hellip;"
        className="mt-6 w-full max-w-md rounded-control border border-line bg-white px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-sage sm:max-w-xs"
      />

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((organ) => (
          <div key={organ.id} className="flex flex-col rounded-card border border-line bg-white p-4">
            <div className="flex items-center gap-3">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: organ.color }}
              >
                {organ.name.charAt(0)}
              </span>
              <div>
                <p className="text-base font-bold text-ink">{organ.name}</p>
                <p className="text-xs text-muted">{organ.system}</p>
              </div>
            </div>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-2">{organ.description}</p>
            <button
              type="button"
              onClick={() => openInExplorer(organ.id)}
              className="mt-3 rounded-control bg-sage px-3 py-2 text-sm font-semibold text-white hover:bg-sage-d"
            >
              Explore in 3D
            </button>
          </div>
        ))}

        {results.length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-muted">
            No organ matches &ldquo;{query}&rdquo;.
          </p>
        )}
      </div>
    </div>
  );
}
