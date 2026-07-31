const EUR = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

/** 4500 → "45,00 €" */
export function formatCents(cents: number): string {
  return EUR.format(cents / 100);
}

/** "45,00" | "45.5" | 45 → 4500 (centimes, arrondi). */
export function eurosToCents(euros: string | number): number {
  const value = typeof euros === "string" ? euros.replace(",", ".").trim() : euros;
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

/** 1500 (quantité × 1000) → "1,5" (sans zéros inutiles). */
export function formatQuantite(quantiteMilli: number): string {
  const q = quantiteMilli / 1000;
  return q
    .toLocaleString("fr-FR", { maximumFractionDigits: 3 })
    .replace(/ /g, " ");
}

/** "1,5" | "1.5" | 1.5 → 1500 (quantité × 1000, arrondi). */
export function quantiteToMilli(quantite: string | number): number {
  const value = typeof quantite === "string" ? quantite.replace(",", ".").trim() : quantite;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 1000);
}
