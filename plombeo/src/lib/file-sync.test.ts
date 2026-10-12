import { describe, expect, it } from "vitest";
import {
  aEnvoyer,
  appliquerResultat,
  dedupliquer,
  marquerEchecReseau,
  MAX_TENTATIVES,
  purger,
  resumeFile,
  type MutationLocale,
} from "@/lib/file-sync";
import { formaterDuree, formaterQuantite, totalMinutes } from "@/lib/format";

function mutation(partiel: Partial<MutationLocale> = {}): MutationLocale {
  return {
    clientMutationId: "11111111-1111-4111-8111-111111111111",
    type: "temps",
    interventionId: "int-1",
    charge: { minutes: 30 },
    etat: "LOCAL",
    tentatives: 0,
    creeLe: 1000,
    ...partiel,
  };
}

describe("aEnvoyer", () => {
  it("retient les mutations jamais parties", () => {
    expect(aEnvoyer([mutation({ etat: "LOCAL" })])).toHaveLength(1);
  });

  it("retient celles en cours n'ayant pas épuisé leurs tentatives", () => {
    expect(aEnvoyer([mutation({ etat: "EN_COURS", tentatives: 2 })])).toHaveLength(1);
  });

  it("écarte les mutations déjà synchronisées", () => {
    expect(aEnvoyer([mutation({ etat: "SYNCHRONISE" })])).toHaveLength(0);
  });

  // Sans cette borne, une saisie invalide serait renvoyée indéfiniment et
  // bloquerait la file de l'artisan.
  it("écarte celles en échec définitif", () => {
    expect(aEnvoyer([mutation({ etat: "ECHEC", tentatives: MAX_TENTATIVES })])).toHaveLength(0);
    expect(
      aEnvoyer([mutation({ etat: "EN_COURS", tentatives: MAX_TENTATIVES })]),
    ).toHaveLength(0);
  });
});

describe("dedupliquer", () => {
  it("ne conserve que la version la plus récente d'un même identifiant", () => {
    const resultat = dedupliquer([
      mutation({ charge: { minutes: 30 }, creeLe: 1000 }),
      mutation({ charge: { minutes: 45 }, creeLe: 2000 }),
    ]);
    expect(resultat).toHaveLength(1);
    expect(resultat[0]?.charge["minutes"]).toBe(45);
  });

  it("conserve les mutations d'identifiants distincts, dans l'ordre de saisie", () => {
    const resultat = dedupliquer([
      mutation({ clientMutationId: "b", creeLe: 2000 }),
      mutation({ clientMutationId: "a", creeLe: 1000 }),
    ]);
    expect(resultat.map((m) => m.clientMutationId)).toEqual(["a", "b"]);
  });
});

describe("appliquerResultat", () => {
  it("marque synchronisée une mutation acceptée", () => {
    const r = appliquerResultat(mutation(), { etat: "applique" });
    expect(r.etat).toBe("SYNCHRONISE");
  });

  /*
   * Cas subtil : le serveur n'a rien répondu pour cette mutation (réponse
   * tronquée, lot partiel). La considérer comme partie ferait PERDRE la saisie.
   * On la garde donc pour un nouvel essai.
   */
  it("ne considère jamais comme partie une mutation sans réponse", () => {
    const r = appliquerResultat(mutation(), undefined);
    expect(r.etat).toBe("EN_COURS");
    expect(r.tentatives).toBe(1);
  });

  it("réessaie après un refus, puis abandonne au seuil", () => {
    const apresUn = appliquerResultat(mutation({ tentatives: 0 }), {
      etat: "refuse",
      motif: "erreur_serveur",
    });
    expect(apresUn.etat).toBe("EN_COURS");

    const auSeuil = appliquerResultat(mutation({ tentatives: MAX_TENTATIVES - 1 }), {
      etat: "refuse",
    });
    expect(auSeuil.etat).toBe("ECHEC");
  });

  it("conserve le motif du refus pour l'afficher", () => {
    const r = appliquerResultat(mutation(), { etat: "refuse", motif: "intervention_indisponible" });
    expect(r.derniereErreur).toBe("intervention_indisponible");
  });
});

describe("marquerEchecReseau", () => {
  it("incrémente les tentatives sans perdre la saisie", () => {
    const r = marquerEchecReseau(mutation());
    expect(r.etat).toBe("EN_COURS");
    expect(r.derniereErreur).toBe("reseau");
    expect(r.charge).toEqual({ minutes: 30 });
  });

  it("finit par déclarer l'échec au bout du même nombre de tentatives", () => {
    expect(marquerEchecReseau(mutation({ tentatives: MAX_TENTATIVES - 1 })).etat).toBe("ECHEC");
  });
});

describe("purger et resumeFile", () => {
  it("retire les mutations synchronisées", () => {
    expect(purger([mutation({ etat: "SYNCHRONISE" }), mutation({ etat: "LOCAL" })])).toHaveLength(1);
  });

  it("résume ce qui reste à envoyer et ce qui a échoué", () => {
    const resume = resumeFile([
      mutation({ clientMutationId: "a", etat: "LOCAL" }),
      mutation({ clientMutationId: "b", etat: "EN_COURS" }),
      mutation({ clientMutationId: "c", etat: "ECHEC" }),
      mutation({ clientMutationId: "d", etat: "SYNCHRONISE" }),
    ]);
    expect(resume).toEqual({ enAttente: 2, enEchec: 1 });
  });
});

describe("formatage", () => {
  it("totalise les minutes", () => {
    expect(totalMinutes([{ minutes: 45 }, { minutes: 30 }])).toBe(75);
    expect(totalMinutes([])).toBe(0);
  });

  it("affiche les durées comme un artisan les compte", () => {
    expect(formaterDuree(0)).toBe("0 min");
    expect(formaterDuree(45)).toBe("45 min");
    expect(formaterDuree(60)).toBe("1 h");
    expect(formaterDuree(105)).toBe("1 h 45");
    expect(formaterDuree(125)).toBe("2 h 05");
  });

  it("affiche les quantités sans décimale superflue", () => {
    expect(formaterQuantite(1000)).toBe("1");
    expect(formaterQuantite(1500)).toBe("1,50");
    expect(formaterQuantite(2000)).toBe("2");
  });
});
