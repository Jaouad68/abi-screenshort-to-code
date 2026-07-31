const EUR = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

export function formatCents(cents: number): string {
  return EUR.format(cents / 100);
}

export function eurosToCents(euros: string | number): number {
  const value = typeof euros === "string" ? euros.replace(",", ".") : euros;
  return Math.round(Number(value) * 100);
}
