/**
 * Conversion des montants en euros (tels que rapportés par le LLM, avec un
 * point décimal) vers des centimes entiers. Toute somme d'argent stockée en
 * base ou manipulée par le moteur de calcul est en centimes — jamais de
 * flottant sur de la monnaie au-delà de cette frontière de conversion.
 */
export function eurosVersCentimes(montantEuros: number): number {
  return Math.round(montantEuros * 100);
}
