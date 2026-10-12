/** Formate un montant en centimes en euros lisibles (« 1 900 € »). */
export function formaterCentimes(centimes: number): string {
  const euros = centimes / 100;
  return `${euros.toLocaleString("fr-FR", {
    minimumFractionDigits: euros % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })} €`;
}
