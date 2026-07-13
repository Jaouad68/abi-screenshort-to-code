"use client";

import { useTransition } from "react";
import { changerSalonActif } from "./salons/actions";

export function SalonSwitcher({
  salons,
  activeSalonId,
}: {
  salons: { id: string; nom: string }[];
  activeSalonId: string;
}) {
  const [isPending, startTransition] = useTransition();

  if (salons.length < 2) return null;

  return (
    <select
      value={activeSalonId}
      disabled={isPending}
      onChange={(e) => {
        const salonId = e.target.value;
        startTransition(() => {
          changerSalonActif(salonId);
        });
      }}
      className="rounded-control border border-line bg-white px-2 py-1 text-sm font-semibold disabled:opacity-60"
    >
      {salons.map((s) => (
        <option key={s.id} value={s.id}>
          {s.nom}
        </option>
      ))}
    </select>
  );
}
