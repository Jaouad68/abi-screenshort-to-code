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

  it("n'accorde que la lecture aux rôles non administrateurs", () => {
    const rolesLimites = TOUS_LES_ROLES.filter(
      (r) => r !== "PROPRIETAIRE" && r !== "ADMINISTRATEUR",
    );
    for (const role of rolesLimites) {
      expect(permissionsDuRole(role)).toEqual(["organisation:lire"]);
    }
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
