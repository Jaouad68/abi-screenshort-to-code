import type { Permission } from "@/lib/permissions";

/**
 * NAVIGATION PRINCIPALE (Phase 14).
 *
 * Chaque entrée porte la permission sans laquelle son écran n'a rien à montrer.
 * Ce filtrage est de la PRÉSENTATION, pas de la sécurité : chaque page vérifie
 * elle-même, au plus près de la donnée. Il évite simplement de proposer à un
 * apprenti des écrans que son rôle refusera — ce qui, avant l'ouverture des
 * comptes, ne se voyait pas, faute d'un second compte pour l'éprouver.
 *
 * Extrait du layout pour être testable : c'est la VALEUR qu'on vérifie, pas le
 * texte d'un fichier de composant.
 */
export type LienNavigation = {
  href: string;
  libelle: string;
  permission?: Permission;
};

export const LIENS_NAVIGATION: readonly LienNavigation[] = [
  { href: "/app/agenda", libelle: "Agenda", permission: "intervention:lire" },
  { href: "/app/demandes", libelle: "Demandes", permission: "intervention:lire" },
  { href: "/app/devis", libelle: "Devis", permission: "devis:lire" },
  { href: "/app/factures", libelle: "Factures", permission: "facture:lire" },
  { href: "/app/clients", libelle: "Clients", permission: "client:lire" },
  { href: "/app/automatisations", libelle: "Automatisations", permission: "automatisation:lire" },
  { href: "/app/documents", libelle: "Documents", permission: "document:lire" },
  { href: "/app/contrats", libelle: "Contrats", permission: "contrat:lire" },
  { href: "/app/pilotage", libelle: "Pilotage", permission: "pilotage:lire" },
  { href: "/app/achats", libelle: "Achats", permission: "achat:lire" },
  { href: "/app/stock", libelle: "Stock", permission: "stock:lire" },
  { href: "/app/catalogue", libelle: "Catalogue", permission: "catalogue:lire" },
  { href: "/app/entreprise", libelle: "Entreprise", permission: "organisation:lire" },
  { href: "/app/equipe", libelle: "Équipe", permission: "organisation:lire" },
  // La sécurité du compte n'est refusée à personne : c'est là qu'on protège son
  // propre accès.
  { href: "/app/securite", libelle: "Sécurité" },
];
