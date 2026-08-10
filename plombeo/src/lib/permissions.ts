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
  // Phase 2 — CRM. Couvrent clients, logements et équipements : ces trois
  // entités forment un même ensemble du point de vue des droits, les séparer
  // n'apporterait rien à un artisan seul.
  "client:lire",
  "client:modifier",
  "client:archiver",
  "client:supprimer",
  "client:exporter",
  // Phase 3 — terrain. Demandes, rendez-vous et interventions relèvent d'un
  // même ensemble de droits : les séparer n'aurait aucun sens pour un artisan.
  "intervention:lire",
  "intervention:modifier",
  "intervention:supprimer",
  // Phase 4 — catalogue et devis. Le prix est une décision du chef
  // d'entreprise : la modification est plus restreinte que la lecture.
  "catalogue:lire",
  "catalogue:modifier",
  "devis:lire",
  "devis:modifier",
  "devis:supprimer",
  // Phase 5 — facturation. `facture:emettre` est DISTINCTE de
  // `facture:modifier` : émettre est l'acte irréversible qui engage
  // l'entreprise.
  "facture:lire",
  "facture:modifier",
  "facture:emettre",
  "facture:encaisser",
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
    "client:lire",
    "client:modifier",
    "client:archiver",
    "client:supprimer",
    "client:exporter",
    "intervention:lire",
    "intervention:modifier",
    "intervention:supprimer",
    "catalogue:lire",
    "catalogue:modifier",
    "devis:lire",
    "devis:modifier",
    "devis:supprimer",
    "facture:lire",
    "facture:modifier",
    "facture:emettre",
    "facture:encaisser",
  ],
  ADMINISTRATEUR: [
    "organisation:lire",
    "organisation:modifier",
    "membre:inviter",
    "audit:lire",
    "client:lire",
    "client:modifier",
    "client:archiver",
    "client:exporter",
    "intervention:lire",
    "intervention:modifier",
    "catalogue:lire",
    "catalogue:modifier",
    "devis:lire",
    "devis:modifier",
    "facture:lire",
    "facture:modifier",
    "facture:emettre",
    "facture:encaisser",
  ],
  ASSISTANT: [
    "organisation:lire",
    "client:lire",
    "client:modifier",
    "intervention:lire",
    "intervention:modifier",
  ],
  // Le technicien peut modifier : il tient le carnet technique depuis le
  // chantier, c'est le cœur de l'usage terrain.
  TECHNICIEN: [
    "organisation:lire",
    "client:lire",
    "client:modifier",
    "intervention:lire",
    "intervention:modifier",
    "catalogue:lire",
    // Le technicien CONSULTE un devis (il doit savoir ce qui a été vendu) mais
    // ne le modifie pas : le prix est une décision du chef d'entreprise.
    "devis:lire",
  ],
  APPRENTI: ["organisation:lire", "client:lire", "intervention:lire", "catalogue:lire"],
  SOUS_TRAITANT: ["organisation:lire", "client:lire", "intervention:lire"],
  // L'expert-comptable lit et exporte, mais ne modifie jamais le fichier client.
  COMPTABLE: [
    "organisation:lire",
    "client:lire",
    "client:exporter",
    "intervention:lire",
    "catalogue:lire",
    "devis:lire",
    "facture:lire",
  ],
  LECTURE_SEULE: [
    "organisation:lire",
    "client:lire",
    "intervention:lire",
    "catalogue:lire",
    "devis:lire",
    "facture:lire",
  ],
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
