/**
 * Classes Tailwind réutilisables — un seul endroit pour l'apparence des champs,
 * boutons et cartes. Cibles tactiles ≥ 44 px pour l'usage mobile sur le terrain.
 */

export const champ =
  "w-full rounded-control border border-line bg-white px-3.5 py-2.5 text-ink " +
  "placeholder:text-muted/70 outline-none focus:border-brand focus:ring-2 " +
  "focus:ring-brand-l min-h-[44px]";

export const label = "block text-sm font-semibold text-ink-2 mb-1.5";

export const btnPrimaire =
  "inline-flex items-center justify-center gap-2 rounded-control bg-brand px-4 " +
  "py-2.5 font-semibold text-white hover:bg-brand-d active:scale-[0.99] " +
  "transition min-h-[44px] disabled:opacity-50";

export const btnSecondaire =
  "inline-flex items-center justify-center gap-2 rounded-control border " +
  "border-line bg-white px-4 py-2.5 font-semibold text-ink-2 hover:bg-bg " +
  "active:scale-[0.99] transition min-h-[44px]";

export const btnDanger =
  "inline-flex items-center justify-center gap-2 rounded-control border " +
  "border-danger/40 bg-white px-4 py-2.5 font-semibold text-danger " +
  "hover:bg-danger-l active:scale-[0.99] transition min-h-[44px]";

export const btnPetit =
  "inline-flex items-center justify-center gap-1.5 rounded-control border " +
  "border-line bg-white px-3 py-1.5 text-sm font-semibold text-ink-2 " +
  "hover:bg-bg active:scale-[0.99] transition min-h-[36px]";

export const carte = "rounded-card border border-line bg-card p-5 sm:p-6";
