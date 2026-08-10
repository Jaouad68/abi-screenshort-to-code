/**
 * RÔLES ET INVITATIONS — constantes partagées (Phase 14).
 *
 * Ce module est délibérément SANS `server-only` et sans accès base : il est lu
 * par les écrans serveur comme par les formulaires client. Les lectures, elles,
 * restent dans `src/lib/invitations.ts`, qui ne franchit jamais la frontière.
 */

/**
 * Durée de validité d'une invitation.
 *
 * Deux semaines : assez pour qu'un salarié qui démarre s'en occupe, assez court
 * pour qu'un lien oublié dans une boîte mail cesse d'être une porte.
 */
export const DUREE_INVITATION_JOURS = 14;

/*
 * Les LIBELLÉS des rôles vivent dans `src/lib/permissions.ts`, à côté de ce
 * qu'ils autorisent. Les dupliquer ici aurait donné deux vérités : « Assistant »
 * d'un côté, « Assistant administratif » de l'autre, pour le même rôle.
 */

/**
 * Ce que chaque rôle peut faire, en une phrase.
 *
 * Rédigé d'après `PERMISSIONS_PAR_ROLE` et destiné à celui qui invite comme à
 * celui qui accepte : annoncer « accès limité » là où le rôle donne en réalité
 * la modification des clients serait pire que ne rien annoncer. Un test vérifie
 * qu'aucun rôle n'est oublié — il ne peut pas, lui, vérifier la justesse de la
 * phrase, qui reste à relire quand les permissions changent.
 */
export const RESUME_ROLE: Record<string, string> = {
  PROPRIETAIRE: "Accès complet, y compris la gestion de l'équipe et la facturation.",
  ADMINISTRATEUR:
    "Gère toute l'activité, y compris la facturation. Ne peut ni supprimer " +
    "l'entreprise ni retirer un membre.",
  ASSISTANT:
    "Suit les clients, les interventions, les achats et le stock. Ne touche ni aux " +
    "devis ni aux factures.",
  COMPTABLE:
    "Consulte et exporte la facturation, les achats et le pilotage. Ne modifie rien.",
  TECHNICIEN:
    "Tient le carnet technique depuis le chantier et consulte les devis, sans en " +
    "fixer les prix.",
  APPRENTI: "Consultation des clients, interventions et documents. Aucune modification.",
  SOUS_TRAITANT: "Consultation des interventions et des documents. Aucune modification.",
  LECTURE_SEULE: "Consultation seule, aucune modification.",
};
