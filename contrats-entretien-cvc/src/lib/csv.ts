/**
 * CSV — génération (export) compatible Excel FR : séparateur « ; », décimales
 * à la virgule, préfixe BOM UTF-8 ; et lecture (import) tolérante à « , » ou
 * « ; », avec ou sans guillemets. Aucune dépendance externe, utilisable côté
 * client (assistant d'import) comme côté serveur (routes d'export).
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

/** Parse un fichier CSV en tableau de lignes (tableaux de cellules). Détecte
 * automatiquement le séparateur (« ; » ou « , »), gère les guillemets et les
 * fins de ligne CRLF/LF. Ignore les lignes entièrement vides. */
export function parseCsv(text: string): string[][] {
  const sansBom = text.replace(/^﻿/, "");
  const delimiter = (sansBom.match(/;/g)?.length ?? 0) >= (sansBom.match(/,/g)?.length ?? 0) ? ";" : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  const pushCell = () => {
    row.push(cell);
    cell = "";
  };
  const pushRow = () => {
    pushCell();
    if (row.some((c) => c.trim() !== "")) rows.push(row);
    row = [];
  };

  for (let i = 0; i < sansBom.length; i++) {
    const c = sansBom[i];
    if (inQuotes) {
      if (c === '"') {
        if (sansBom[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
    } else if (c === delimiter) {
      pushCell();
    } else if (c === "\n") {
      pushRow();
    } else if (c === "\r") {
      // ignoré, géré par \n suivant
    } else {
      cell += c;
    }
  }
  if (cell !== "" || row.length > 0) pushRow();

  return rows;
}
