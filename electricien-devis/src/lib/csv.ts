/**
 * Génération de CSV compatible Excel FR : séparateur « ; », décimales à la
 * virgule, préfixe BOM UTF-8 pour un affichage correct des accents.
 */
export function toCsv(rows: string[][]): string {
  const escape = (v: string) =>
    /[";\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  const body = rows.map((r) => r.map(escape).join(";")).join("\r\n");
  return "﻿" + body;
}

/** 158780 → "1587,80" (montant en centimes → euros, décimale FR). */
export function montantCsv(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

/** Date → "31/07/2026". */
export function dateCsv(d: Date | null): string {
  if (!d) return "";
  const j = String(d.getDate()).padStart(2, "0");
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${j}/${m}/${d.getFullYear()}`;
}

/** Construit un filtre de dates Prisma pour une année donnée (ou aucun). */
export function filtreAnnee(annee: string | null): { gte: Date; lt: Date } | undefined {
  const n = Number(annee);
  if (!annee || !Number.isInteger(n) || n < 2000 || n > 2100) return undefined;
  return { gte: new Date(n, 0, 1), lt: new Date(n + 1, 0, 1) };
}
