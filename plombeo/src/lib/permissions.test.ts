import { describe, expect, it } from "vitest";
import { PERMISSIONS, permissionsDuRole, roleAutorise, LIBELLE_ROLE } from "@/lib/permissions";
import type { Role } from "@/generated/prisma/enums";

const TOUS_LES_ROLES: Role[] = [
  "PROPRIETAIRE",
  "ADMINISTRATEUR",
  "ASSISTANT",
  "TECHNICIEN",
  "APPRENTI",
  "SOUS_TRAITANT",
  "COMPTABLE",
  "LECTURE_SEULE",
];

describe("permissions", () => {
  it("accorde tous les droits au propriétaire", () => {
    for (const permission of PERMISSIONS) {
      expect(roleAutorise("PROPRIETAIRE", permission)).toBe(true);
    }
  });

  it("réserve la suppression de l'organisation au seul propriétaire", () => {
    const autorises = TOUS_LES_ROLES.filter((r) => roleAutorise(r, "organisation:supprimer"));
    expect(autorises).toEqual(["PROPRIETAIRE"]);
  });

  it("n'accorde aucun droit d'écriture sur l'organisation hors propriétaire et administrateur", () => {
    const rolesLimites = TOUS_LES_ROLES.filter(
      (r) => r !== "PROPRIETAIRE" && r !== "ADMINISTRATEUR",
    );
    for (const role of rolesLimites) {
      expect(roleAutorise(role, "organisation:modifier")).toBe(false);
      expect(roleAutorise(role, "organisation:supprimer")).toBe(false);
      expect(roleAutorise(role, "membre:inviter")).toBe(false);
    }
  });

  /*
   * Matrice CRM de la Phase 2, vérifiée rôle par rôle plutôt que par une règle
   * générale : c'est précisément là qu'une régression de droits passerait
   * inaperçue. Toute modification volontaire de la matrice doit se traduire
   * par une modification explicite de ce tableau.
   */
  it("applique exactement la matrice CRM spécifiée", () => {
    const attendu: Record<Role, string[]> = {
      PROPRIETAIRE: ["lire", "modifier", "archiver", "supprimer", "exporter"],
      ADMINISTRATEUR: ["lire", "modifier", "archiver", "exporter"],
      ASSISTANT: ["lire", "modifier"],
      // Le technicien tient le carnet technique depuis le chantier.
      TECHNICIEN: ["lire", "modifier"],
      APPRENTI: ["lire"],
      SOUS_TRAITANT: ["lire"],
      // L'expert-comptable lit et exporte, mais ne modifie jamais.
      COMPTABLE: ["lire", "exporter"],
      LECTURE_SEULE: ["lire"],
    };

    for (const role of TOUS_LES_ROLES) {
      const obtenu = permissionsDuRole(role)
        .filter((p) => p.startsWith("client:"))
        .map((p) => p.replace("client:", ""));
      expect(obtenu.sort()).toEqual([...attendu[role]].sort());
    }
  });

  it("ne laisse jamais un rôle non habilité exporter le fichier client", () => {
    // Un export massif est une action sensible (§59).
    const autorises = TOUS_LES_ROLES.filter((r) => roleAutorise(r, "client:exporter"));
    expect(autorises.sort()).toEqual(["ADMINISTRATEUR", "COMPTABLE", "PROPRIETAIRE"]);
  });

  it("réserve la suppression définitive d'un client au propriétaire", () => {
    const autorises = TOUS_LES_ROLES.filter((r) => roleAutorise(r, "client:supprimer"));
    expect(autorises).toEqual(["PROPRIETAIRE"]);
  });

  // Sans ce test, ajouter un rôle à l'énumération Prisma sans l'ajouter à la
  // table de correspondance provoquerait un `undefined` silencieux à l'exécution.
  it("définit des permissions pour chaque rôle existant", () => {
    for (const role of TOUS_LES_ROLES) {
      expect(Array.isArray(permissionsDuRole(role))).toBe(true);
      expect(LIBELLE_ROLE[role]).toBeTruthy();
    }
  });
});
