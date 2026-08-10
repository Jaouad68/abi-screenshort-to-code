import { describe, expect, it } from "vitest";
import { LIENS_NAVIGATION } from "@/lib/navigation";
import { PERMISSIONS, roleAutorise } from "@/lib/permissions";
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

function liensDe(role: Role): string[] {
  return LIENS_NAVIGATION.filter(
    (lien) => !lien.permission || roleAutorise(role, lien.permission),
  ).map((lien) => lien.href);
}

describe("navigation par rôle", () => {
  it("n'annonce que des permissions qui existent", () => {
    for (const lien of LIENS_NAVIGATION) {
      if (lien.permission) expect(PERMISSIONS).toContain(lien.permission);
    }
  });

  /*
   * C'est le défaut qu'a révélé l'ouverture des comptes : un apprenti voyait
   * « Devis » et « Factures », les ouvrait, et tombait sur une erreur serveur.
   * Le contrôle de permission fonctionnait ; c'est l'écran qui promettait ce
   * qu'il ne pouvait pas tenir.
   */
  it("ne propose à un rôle que ce que son rôle autorise", () => {
    for (const role of TOUS_LES_ROLES) {
      for (const lien of LIENS_NAVIGATION) {
        if (!lien.permission) continue;
        const propose = liensDe(role).includes(lien.href);
        expect(propose, `${role} / ${lien.href}`).toBe(roleAutorise(role, lien.permission));
      }
    }
  });

  it("cache devis et factures à l'apprenti, les montre au propriétaire", () => {
    expect(liensDe("APPRENTI")).not.toContain("/app/devis");
    expect(liensDe("APPRENTI")).not.toContain("/app/factures");
    expect(liensDe("PROPRIETAIRE")).toContain("/app/devis");
    expect(liensDe("PROPRIETAIRE")).toContain("/app/factures");
  });

  /*
   * Un rôle sans aucun lien serait un compte qui s'ouvre sur une barre vide :
   * l'utilisateur n'aurait littéralement nulle part où aller.
   */
  it("ne laisse aucun rôle sans navigation", () => {
    for (const role of TOUS_LES_ROLES) {
      expect(liensDe(role).length, `${role} n'a aucun lien`).toBeGreaterThan(1);
    }
  });

  it("laisse la sécurité du compte accessible à tous", () => {
    for (const role of TOUS_LES_ROLES) expect(liensDe(role)).toContain("/app/securite");
  });
});
