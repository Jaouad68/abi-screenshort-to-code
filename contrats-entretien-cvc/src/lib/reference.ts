import "server-only";
import { prisma } from "@/lib/prisma";

/** Génère la prochaine référence de contrat pour une entreprise donnée, au
 * format CT-2026-0001. `dejaUtilises` compte les références déjà attribuées
 * dans le lot en cours (import en masse) pour rester unique sans relire la
 * base à chaque ligne. */
export async function prochaineReference(companyId: string, dejaUtilises = 0): Promise<string> {
  const annee = new Date().getFullYear();
  const total = await prisma.contrat.count({ where: { companyId } });
  const numero = total + dejaUtilises + 1;
  return `CT-${annee}-${String(numero).padStart(4, "0")}`;
}
