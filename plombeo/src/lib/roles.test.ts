import { describe, expect, it } from "vitest";
import { RESUME_ROLE } from "@/lib/roles";
import { LIBELLE_ROLE } from "@/lib/permissions";
import { RANG_ROLE, peutInviterAuRole } from "@/lib/mfa";
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

/**
 * Ces phrases sont ce que lit quelqu'un à qui on propose un accès. Un rôle
 * ajouté sans résumé apparaîtrait sans aucune indication de ce qu'il autorise —
 * et personne ne saurait ce qu'il accepte.
 */
describe("description des rôles", () => {
  it("couvre tous les rôles, sans exception ni entrée en trop", () => {
    for (const role of TOUS_LES_ROLES) {
      expect(RESUME_ROLE[role], `résumé manquant pour ${role}`).toBeTruthy();
    }
    expect(Object.keys(RESUME_ROLE).sort()).toEqual([...TOUS_LES_ROLES].sort());
  });

  it("attribue un rang à chaque rôle", () => {
    for (const role of TOUS_LES_ROLES) expect(RANG_ROLE[role]).toBeGreaterThan(0);
  });

  /*
   * L'écran d'invitation construit sa liste par comparaison de rangs ; l'action
   * serveur revérifie avec `peutInviterAuRole`. Les deux doivent dire la même
   * chose, sinon l'écran offrirait un choix que le serveur refuse — ou, bien
   * pire, en cacherait un qu'il accepte.
   */
  it("propose exactement ce que le serveur accepte", () => {
    for (const invitant of TOUS_LES_ROLES) {
      const proposes = TOUS_LES_ROLES.filter(
        (cible) => RANG_ROLE[cible] < RANG_ROLE[invitant],
      ).sort();
      const acceptes = TOUS_LES_ROLES.filter((cible) =>
        peutInviterAuRole(invitant, cible),
      ).sort();
      expect(proposes).toEqual(acceptes);
    }
  });

  it("n'autorise personne à inviter à son propre rang", () => {
    for (const role of TOUS_LES_ROLES) expect(peutInviterAuRole(role, role)).toBe(false);
  });

  it("réutilise les libellés des permissions plutôt que d'en tenir une seconde liste", () => {
    for (const role of TOUS_LES_ROLES) expect(LIBELLE_ROLE[role]).toBeTruthy();
  });
});
