"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/audit";
import { resoudreJeton } from "@/lib/portail";
import { transitionDevisAutorisee } from "@/lib/etats";
import { creerNotification } from "@/lib/moteur";

export type EtatPortail = { erreur?: string; succes?: string };

/**
 * Acceptation d'un devis depuis le portail.
 *
 * SEULE écriture autorisée à un porteur de lien. Trois vérifications
 * successives, aucune n'étant redondante :
 *  1. le jeton est valide, non révoqué, non expiré ;
 *  2. le devis appartient à CE client de CETTE organisation ;
 *  3. la transition est permise par la machine à états de la Phase 4.
 */
export async function accepterDevisPortail(
  _precedent: EtatPortail,
  donnees: FormData,
): Promise<EtatPortail> {
  const jeton = String(donnees.get("jeton") ?? "");
  const devisId = String(donnees.get("devisId") ?? "");

  const acces = await resoudreJeton(jeton);
  // Message identique quelle que soit la cause : ne rien apprendre à celui qui
  // essaie.
  if (!acces) return { erreur: "Ce lien n'est plus valable." };

  const devis = await prisma.quote.findFirst({
    where: { id: devisId, clientId: acces.clientId, organizationId: acces.organizationId },
    select: { id: true, statut: true, numero: true },
  });
  if (!devis) return { erreur: "Ce document est introuvable." };

  if (!transitionDevisAutorisee(devis.statut, "ACCEPTE")) {
    return { erreur: "Ce devis ne peut plus être accepté. Contactez votre artisan." };
  }

  await prisma.quote.updateMany({
    where: { id: devisId, organizationId: acces.organizationId },
    data: { statut: "ACCEPTE", accepteLe: new Date() },
  });

  // `actorUserId` reste absent : l'auteur n'est pas un utilisateur de Plombéo.
  // La métadonnée dit explicitement d'où vient l'acceptation.
  await journaliser({
    action: "quote.accepted_by_client",
    organizationId: acces.organizationId,
    entityType: "Quote",
    entityId: devisId,
    metadata: { origine: "portail", clientId: acces.clientId },
  });

  // L'artisan doit l'apprendre sans avoir à regarder.
  await creerNotification(acces.organizationId, {
    titre: `Devis ${devis.numero ?? ""} accepté`,
    corps: "Votre client a accepté le devis depuis son espace.",
    lien: `/app/devis/${devisId}`,
  });

  revalidatePath(`/portail/${jeton}`);
  revalidatePath(`/app/devis/${devisId}`);
  return { succes: "Devis accepté. Votre artisan en est informé." };
}
