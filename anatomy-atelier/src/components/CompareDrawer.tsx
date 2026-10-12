"use client";

import { getOrganById, organs } from "@/data/organs";
import { useExploreStore } from "@/lib/store";

export function CompareDrawer() {
  const { compareOpen, setCompareOpen, compareOrganIds, setCompareOrgan } = useExploreStore();

  if (!compareOpen) return null;

  const [leftOrgan, rightOrgan] = compareOrganIds.map((id) => getOrganById(id) ?? organs[0]);

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-ink/40 p-4">
      <div className="w-full max-w-3xl rounded-card border border-line bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-bold text-ink">Compare organs</h2>
          <button
            type="button"
            onClick={() => setCompareOpen(false)}
            className="rounded-pill border border-line px-2.5 py-1 text-sm text-ink-2 hover:bg-paper"
          >
            Close
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 p-5">
          {([0, 1] as const).map((slot) => {
            const organ = slot === 0 ? leftOrgan : rightOrgan;
            return (
              <div key={slot}>
                <select
                  value={organ.id}
                  onChange={(e) => setCompareOrgan(slot, e.target.value)}
                  className="w-full rounded-control border border-line bg-paper px-3 py-2 text-sm font-medium outline-none focus:border-sage"
                >
                  {organs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: organ.color }}
                  >
                    {organ.name.charAt(0)}
                  </span>
                  <span className="text-sm text-muted">{organ.system}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="scrollbar-thin max-h-[50vh] overflow-y-auto border-t border-line px-5 py-4">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-line">
              {leftOrgan.keyFacts.map((fact, i) => (
                <tr key={fact.label}>
                  <td className="w-1/3 py-2 pr-3 align-top text-ink">{fact.value}</td>
                  <td className="w-1/3 py-2 px-3 text-center align-top text-xs font-semibold uppercase tracking-wide text-muted">
                    {fact.label}
                  </td>
                  <td className="w-1/3 py-2 pl-3 align-top text-right text-ink">
                    {rightOrgan.keyFacts[i]?.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
