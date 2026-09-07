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

/** 4500 → "45.00" pour pré-remplir un <input type="number"> en édition. */
export function centsToEurosInput(cents: number): string {
  return (cents / 100).toFixed(2);
}
