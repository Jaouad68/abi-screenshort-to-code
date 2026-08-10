import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Événements métier journalisés (§57, §58).
 *
 * Les phases suivantes complètent cette liste (devis, factures, paiements,
 * signatures, actions IA...). En Phase 1 ces événements alimentent uniquement
 * le journal d'audit ; le bus d'événements du moteur de règles arrive en Phase 7.
 */
export type ActionAuditee =
  // Phase 1 — comptes et organisation
  | "organization.created"
  | "organization.updated"
  | "user.registered"
  | "user.logged_in"
  | "user.login_failed"
  | "user.login_blocked"
  | "user.logged_out"
  | "user.sessions_revoked"
  // Phase 2 — CRM
  | "client.created"
  | "client.updated"
  | "client.archived"
  | "client.restored"
  | "client.deleted"
  | "client.exported"
  | "property.created"
  | "property.updated"
  | "property.archived"
  | "equipment.created"
  | "equipment.updated"
  | "equipment.deleted"
  | "consent.updated"
  // Phase 3 — terrain
  | "lead.created"
  | "lead.qualified"
  | "lead.converted"
  | "lead.abandoned"
  | "appointment.created"
  | "appointment.cancelled"
  | "appointment.status_changed"
  | "intervention.started"
  | "intervention.updated"
  | "intervention.completed"
  | "intervention.closed"
  | "intervention.synced"
  // Phase 4 — catalogue et devis
  | "service.created"
  | "service.updated"
  | "service.archived"
  | "product.created"
  | "product.updated"
  | "product.archived"
  | "quote.created"
  | "quote.updated"
  | "quote.ready"
  | "quote.sent"
  | "quote.accepted"
  | "quote.declined"
  | "quote.expired"
  | "quote.cancelled";

type EntreeAudit = {
  action: ActionAuditee;
  organizationId?: string | null;
  actorUserId?: string | null;
  entityType?: string;
  entityId?: string;
  /**
   * Contexte complémentaire.
   *
   * NE JAMAIS y placer de mot de passe, de jeton de session, ni de donnée
   * personnelle non nécessaire à l'audit (§64 : pas de donnée sensible
   * superflue dans les journaux).
   */
  metadata?: Record<string, string | number | boolean | null>;
};

/**
 * Écrit une ligne d'audit. Seul point d'écriture de la table : il n'existe
 * volontairement aucune fonction de mise à jour ni de suppression (§57 — un
 * journal d'audit ne doit pas être modifiable par un utilisateur standard).
 *
 * L'échec d'écriture d'un audit ne doit jamais faire échouer l'action métier
 * qu'il accompagne (par exemple empêcher une connexion légitime) : l'erreur est
 * signalée dans les logs serveur et l'action se poursuit.
 */
export async function journaliser(entree: EntreeAudit): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: entree.action,
        organizationId: entree.organizationId ?? null,
        actorUserId: entree.actorUserId ?? null,
        entityType: entree.entityType ?? "",
        entityId: entree.entityId ?? "",
        metadata: entree.metadata ?? undefined,
      },
    });
  } catch (erreur) {
    console.error("[audit] écriture impossible", { action: entree.action, erreur });
  }
}
