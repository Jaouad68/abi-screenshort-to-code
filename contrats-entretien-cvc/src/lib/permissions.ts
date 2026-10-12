import type { Role } from "@/generated/prisma/client";

export const ROLE_LABEL: Record<Role, string> = {
  DIRIGEANT: "Dirigeant",
  ADMINISTRATIF: "Administratif",
  TECHNICIEN: "Technicien",
};

/** Gestion des clients, contrats, renouvellements, planification. */
export function peutGererActivite(role: Role): boolean {
  return role === "DIRIGEANT" || role === "ADMINISTRATIF";
}

/** Création/désactivation des comptes de l'équipe — réservé au dirigeant. */
export function peutGererEquipe(role: Role): boolean {
  return role === "DIRIGEANT";
}

/** Un technicien ne voit que ses propres interventions et les fiches liées ;
 * un dirigeant/administratif voit tout. */
export function estTechnicien(role: Role): boolean {
  return role === "TECHNICIEN";
}
