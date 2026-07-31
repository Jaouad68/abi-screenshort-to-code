import { prisma } from "@/lib/prisma";

/**
 * Génère le prochain numéro de devis de façon atomique : DEV-2026-001, -002…
 * Un compteur par (utilisateur, année) est incrémenté dans une transaction pour
 * éviter tout doublon même en cas d'enregistrements simultanés.
 */
export async function genererNumeroDevis(
  userId: string,
  prefixe: string,
  annee: number,
): Promise<string> {
  const compteur = await prisma.compteurDevis.upsert({
    where: { userId_annee: { userId, annee } },
    create: { userId, annee, dernierNumero: 1 },
    update: { dernierNumero: { increment: 1 } },
  });

  const suffixe = String(compteur.dernierNumero).padStart(3, "0");
  return `${prefixe}-${annee}-${suffixe}`;
}
