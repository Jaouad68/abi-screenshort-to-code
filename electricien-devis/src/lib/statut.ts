import type { DevisStatut } from "@/generated/prisma/client";

/** Ordre logique du cycle de vie d'un devis. */
export const STATUTS: DevisStatut[] = [
  "BROUILLON",
  "ENVOYE",
  "ACCEPTE",
  "REFUSE",
  "FACTURE",
];

export const STATUT_LABEL: Record<DevisStatut, string> = {
  BROUILLON: "Brouillon",
  ENVOYE: "Envoyé",
  ACCEPTE: "Accepté",
  REFUSE: "Refusé",
  FACTURE: "Facturé",
};

/** Classes Tailwind (pastille de statut). */
export const STATUT_CLASSES: Record<DevisStatut, string> = {
  BROUILLON: "bg-line text-ink-2",
  ENVOYE: "bg-brand-l text-brand-d",
  ACCEPTE: "bg-ok-l text-ok",
  REFUSE: "bg-danger-l text-danger",
  FACTURE: "bg-accent-l text-accent-d",
};

/** Transitions autorisées depuis chaque statut (garde-fou métier). */
export const TRANSITIONS: Record<DevisStatut, DevisStatut[]> = {
  BROUILLON: ["ENVOYE"],
  ENVOYE: ["ACCEPTE", "REFUSE"],
  ACCEPTE: ["FACTURE", "REFUSE"],
  REFUSE: ["ENVOYE"],
  FACTURE: [],
};
