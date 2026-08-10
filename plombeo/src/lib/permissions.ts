import type { Role } from "@/generated/prisma/enums";

/**
 * Permissions de la Phase 1. La liste s'étoffera à chaque phase (clients, devis,
 * factures...). Elles sont volontairement définies en code plutôt qu'en base :
 * tant que les rôles ne sont pas personnalisables par l'artisan, une table
 * `Permission` serait de la sur-ingénierie (§75).
 */
export const PERMISSIONS = [
  "organisation:lire",
  "organisation:modifier",
  "organisation:supprimer",
  "membre:inviter",
  "audit:lire",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/**
 * Correspondance rôle -> permissions.
 *
 * Tous les rôles du cahier des charges (§49) sont représentés, même ceux que
 * l'interface V1 n'utilise pas encore : cela évite qu'un rôle ajouté plus tard
 * hérite silencieusement de droits par défaut.
 */
const PERMISSIONS_PAR_ROLE: Record<Role, readonly Permission[]> = {
  PROPRIETAIRE: [
    "organisation:lire",
    "organisation:modifier",
    "organisation:supprimer",
    "membre:inviter",
    "audit:lire",
  ],
  ADMINISTRATEUR: ["organisation:lire", "organisation:modifier", "membre:inviter", "audit:lire"],
  ASSISTANT: ["organisation:lire"],
  TECHNICIEN: ["organisation:lire"],
  APPRENTI: ["organisation:lire"],
  SOUS_TRAITANT: ["organisation:lire"],
  COMPTABLE: ["organisation:lire"],
  LECTURE_SEULE: ["organisation:lire"],
};

export function permissionsDuRole(role: Role): readonly Permission[] {
  return PERMISSIONS_PAR_ROLE[role];
}

export function roleAutorise(role: Role, permission: Permission): boolean {
  return PERMISSIONS_PAR_ROLE[role].includes(permission);
}

/** Libellés affichés à l'artisan — jamais le nom technique de l'énumération. */
export const LIBELLE_ROLE: Record<Role, string> = {
  PROPRIETAIRE: "Propriétaire",
  ADMINISTRATEUR: "Administrateur",
  ASSISTANT: "Assistant administratif",
  TECHNICIEN: "Technicien",
  APPRENTI: "Apprenti",
  SOUS_TRAITANT: "Sous-traitant",
  COMPTABLE: "Expert-comptable",
  LECTURE_SEULE: "Lecture seule",
};
