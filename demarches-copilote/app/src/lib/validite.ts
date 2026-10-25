/**
 * RG04 : un document est assez récent si sa date est postérieure ou égale
 * à « aujourd'hui moins N mois » (mois calendaires, fin de mois ramenée au dernier jour).
 * Les dates sont des chaînes ISO AAAA-MM-JJ pour éviter les décalages de fuseau.
 */
export function isRecentEnough(documentDate: string, maxAgeMonths: number, today: string): boolean {
  return documentDate >= subtractMonths(today, maxAgeMonths);
}

export function subtractMonths(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const totalMonths = y * 12 + (m - 1) - months;
  const year = Math.floor(totalMonths / 12);
  const month = (totalMonths % 12) + 1;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const day = Math.min(d, lastDay);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
