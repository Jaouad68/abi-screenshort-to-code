"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { organs, searchOrgans } from "@/data/organs";
import { useExploreStore } from "@/lib/store";

export function OrganSidebar() {
  const [query, setQuery] = useState("");
  const { selectedOrganId, selectOrgan } = useExploreStore();
  const results = useMemo(() => searchOrgans(query), [query]);

  return (
    <aside className="flex h-full flex-col rounded-card border border-line bg-white">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <span className="text-sm font-semibold text-ink-2">Organ library</span>
        <span className="text-xs text-muted">{organs.length} organs</span>
      </div>

      <div className="border-b border-line px-3 py-2.5">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          type="search"
          placeholder="Search organs, systems&hellip;"
          className="w-full rounded-control border border-line bg-paper px-3 py-1.5 text-sm outline-none placeholder:text-muted focus:border-sage"
        />
      </div>

      <ul className="scrollbar-thin flex-1 overflow-y-auto p-2">
        {results.map((organ) => {
          const active = organ.id === selectedOrganId;
          return (
            <li key={organ.id}>
              <button
                type="button"
                onClick={() => selectOrgan(organ.id)}
                className={`flex w-full items-center gap-3 rounded-control px-2.5 py-2 text-left transition-colors ${
                  active ? "bg-sage-l" : "hover:bg-paper"
                }`}
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: organ.color }}
                >
                  {organ.name.charAt(0)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-ink">{organ.name}</span>
                  <span className="block truncate text-xs text-muted">{organ.system}</span>
                </span>
              </button>
            </li>
          );
        })}
        {results.length === 0 && (
          <li className="px-3 py-6 text-center text-sm text-muted">No organ matches &ldquo;{query}&rdquo;.</li>
        )}
      </ul>

      <div className="border-t border-line p-3">
        <Link
          href="/library"
          className="block rounded-control border border-line px-3 py-2 text-center text-sm font-medium text-ink-2 hover:border-sage-line hover:bg-sage-l"
        >
          View all organs
        </Link>
      </div>
    </aside>
  );
}
