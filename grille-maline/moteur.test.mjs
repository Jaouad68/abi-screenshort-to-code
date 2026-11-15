// Tests unitaires du moteur de Grille Maline.
// Lancement : node --test grille-maline/
// Le moteur est extrait du <script id="moteur"> de index.html : on teste exactement le code livré.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const page = readFileSync(fileURLToPath(new URL("./index.html", import.meta.url)), "utf8");
const source = page.match(/<script id="moteur">([\s\S]*?)<\/script>/)[1];

function chargerMoteur(fenetre = { crypto: globalThis.crypto }) {
  new Function("window", source)(fenetre);
  return fenetre.GrilleMaline;
}
const G = chargerMoteur();

// Source pseudo-aléatoire déterministe (xorshift32) pour des tests reproductibles.
function sourceDeterministe(graine = 42) {
  let x = graine >>> 0 || 1;
  return (tampon) => {
    for (let i = 0; i < tampon.length; i++) {
      x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0;
      tampon[i] = x;
    }
    return tampon;
  };
}

function verifierGrilleAcceptable(g, historique = []) {
  assert.equal(G.validerGrille(g.numeros, g.etoiles), null);
  const a = G.analyser(g.numeros, g.etoiles, historique);
  assert.ok(a.dates <= 3, `trop de dates : ${g.numeros}`);
  assert.ok(a.suite < 3, `suite : ${g.numeros}`);
  assert.ok(a.alignement < 3, `alignement : ${g.numeros}`);
  assert.ok(a.ligneMax < 4 && a.colonneMax < 4, `concentration : ${g.numeros}`);
  assert.ok(a.multiples5 < 3, `multiples de 5 : ${g.numeros}`);
  assert.ok(a.progression < 4, `progression : ${g.numeros}`);
  assert.equal(a.dejaSorti.numeros, false, `déjà sorti : ${g.numeros}`);
}

describe("constantes", () => {
  test("139 838 160 combinaisons", () => {
    assert.equal(G.combinaisons(50, 5), 2118760);
    assert.equal(G.combinaisons(12, 2), 66);
    assert.equal(G.TOTAL_COMBINAISONS, 139838160);
  });
});

describe("aléa cryptographique", () => {
  test("refuse de générer sans crypto.getRandomValues (pas de repli sur Math.random)", () => {
    const sansCrypto = chargerMoteur({});
    assert.throws(() => sansCrypto.genererGrille(), /crypto\.getRandomValues/);
  });

  test("utilise crypto.getRandomValues par défaut", () => {
    let appels = 0;
    const espion = { getRandomValues: (t) => { appels++; return globalThis.crypto.getRandomValues(t); } };
    const M = chargerMoteur({ crypto: espion });
    M.genererGrille();
    assert.ok(appels >= 7, "au moins 5 + 2 tirages");
  });

  test("entierAleatoire reste dans [0, max) et rejette les valeurs biaisées", () => {
    // Pour max = 3, limite = 4294967295 : la valeur 0xFFFFFFFF doit être rejetée.
    const valeurs = [0xffffffff, 7];
    const src = (t) => { t[0] = valeurs.shift(); };
    assert.equal(G.entierAleatoire(3, src), 7 % 3);
    assert.throws(() => G.entierAleatoire(0), RangeError);
  });

  test("distribution approximativement uniforme (khi-deux)", () => {
    const n = 50, tirages = 50000, comptes = Array(n).fill(0);
    for (let i = 0; i < tirages; i++) comptes[G.entierAleatoire(n)]++;
    const attendu = tirages / n;
    const khi2 = comptes.reduce((s, c) => s + (c - attendu) ** 2 / attendu, 0);
    // 49 degrés de liberté : seuil à 0,1 % ≈ 85,4
    assert.ok(khi2 < 85.4, `khi² = ${khi2.toFixed(1)}`);
  });

  test("tirerSansRemise renvoie k valeurs distinctes triées", () => {
    const src = sourceDeterministe(7);
    for (let i = 0; i < 500; i++) {
      const t = G.tirerSansRemise(50, 5, src);
      assert.equal(t.length, 5);
      assert.equal(new Set(t).size, 5);
      assert.deepEqual(t, [...t].sort((a, b) => a - b));
      assert.ok(t.every((x) => x >= 1 && x <= 50));
    }
  });
});

describe("règles de rejet", () => {
  const rejets = (n, e = [1, 2], h = []) => G.raisonsDeRejet(G.analyser(n, e, h));

  test("plus de 3 numéros entre 1 et 31", () => {
    assert.ok(rejets([3, 8, 17, 24, 45]).includes("dates"));
    assert.ok(!rejets([3, 8, 24, 38, 45]).includes("dates"));
  });

  test("suites de 3 consécutifs ou plus", () => {
    assert.ok(rejets([4, 12, 33, 34, 35]).includes("suites"));
    assert.ok(!rejets([4, 12, 33, 34, 46]).includes("suites"));
  });

  test("motifs visuels : colonne, diagonale, anti-diagonale", () => {
    assert.ok(rejets([3, 13, 23, 37, 49]).includes("motifs"), "colonne 3-13-23");
    assert.ok(rejets([1, 12, 23, 38, 46]).includes("motifs"), "diagonale 1-12-23");
    assert.ok(rejets([10, 19, 28, 36, 42]).includes("motifs"), "anti-diagonale 10-19-28");
    assert.ok(rejets([7, 27, 37, 47, 12]).includes("motifs"), "4 numéros sur la colonne 7");
    assert.ok(rejets([41, 43, 45, 48, 2]).includes("motifs"), "4 numéros sur la dernière ligne");
    // 10 et 11 ne sont pas voisins en diagonale (changement de ligne).
    assert.equal(G.alignementMax([10, 11, 12]), 1);
  });

  test("multiples réguliers", () => {
    assert.ok(rejets([5, 10, 15, 33, 47]).includes("multiples"), "trois multiples de 5");
    assert.ok(rejets([34, 38, 42, 46, 7]).includes("multiples"), "progression de pas 4");
    assert.ok(!rejets([5, 33, 38, 41, 47]).includes("multiples"));
  });

  test("combinaison déjà sortie", () => {
    const historique = [{ date: "2024-01-02", numeros: [7, 19, 33, 41, 48], etoiles: [3, 9] }];
    assert.ok(rejets([48, 41, 33, 19, 7], [1, 2], historique).includes("historique"));
    assert.ok(!rejets([7, 19, 33, 41, 49], [1, 2], historique).includes("historique"));
  });

  test("une grille « propre » n'est pas rejetée", () => {
    assert.deepEqual(rejets([7, 19, 33, 41, 48]), []);
  });
});

describe("générateur", () => {
  test("1 000 grilles générées respectent toutes les règles", () => {
    const src = sourceDeterministe(2026);
    for (let i = 0; i < 1000; i++) verifierGrilleAcceptable(G.genererGrille({ remplir: src }));
  });

  test("avec la vraie source crypto aussi", () => {
    for (let i = 0; i < 300; i++) verifierGrilleAcceptable(G.genererGrille());
  });

  test("n'émet jamais une combinaison de l'historique", () => {
    // Historique artificiel : on y place les 200 premières grilles qu'aurait produites la même graine.
    const historique = [];
    const src1 = sourceDeterministe(99);
    for (let i = 0; i < 200; i++) historique.push(G.genererGrille({ remplir: src1 }));
    const src2 = sourceDeterministe(99);
    for (let i = 0; i < 200; i++) verifierGrilleAcceptable(G.genererGrille({ remplir: src2, historique }), historique);
  });

  test("genererGrilles renvoie des grilles toutes différentes", () => {
    const grilles = G.genererGrilles(10, { remplir: sourceDeterministe(5) });
    assert.equal(grilles.length, 10);
    const cles = new Set(grilles.map((g) => g.numeros.join("-") + "|" + g.etoiles.join("-")));
    assert.equal(cles.size, 10);
  });

  test("les grilles générées ont un score d'originalité d'au moins 90", () => {
    const src = sourceDeterministe(11);
    for (let i = 0; i < 500; i++) {
      const g = G.genererGrille({ remplir: src });
      assert.ok(G.scoreOriginalite(g.numeros, g.etoiles, []).score >= 90);
    }
  });

  test("taux d'acceptation raisonnable (pas de boucle interminable)", () => {
    const src = sourceDeterministe(3);
    let essais = 0;
    for (let i = 0; i < 500; i++) essais += G.genererGrille({ remplir: src }).essais;
    const moyenne = essais / 500;
    assert.ok(moyenne < 4, `${moyenne.toFixed(2)} essais en moyenne`);
  });

  test("abandonne proprement si aucune grille n'est acceptable", () => {
    const toujoursZero = (t) => t.fill(0); // tire toujours 1,2,3,4,5 : suite rejetée
    assert.throws(() => G.genererGrille({ remplir: toujoursZero, maxEssais: 20 }), /20 essais/);
  });

  test("ne prétend rien prédire : couverture uniforme des 50 numéros", () => {
    const comptes = Array(51).fill(0);
    const src = sourceDeterministe(17);
    for (let i = 0; i < 4000; i++) for (const n of G.genererGrille({ remplir: src }).numeros) comptes[n]++;
    // Le filtre favorise 32-50 (moins de dates), mais chaque numéro doit rester possible.
    for (let n = 1; n <= 50; n++) assert.ok(comptes[n] > 0, `numéro ${n} jamais proposé`);
  });
});

describe("score d'originalité", () => {
  test("grille très jouée : score bas et critères expliqués", () => {
    const r = G.scoreOriginalite([1, 2, 3, 4, 5], [1, 2], []);
    assert.ok(r.score <= 30, `score ${r.score}`);
    assert.equal(r.criteres.length, 5);
    for (const c of r.criteres) assert.ok(c.explication.length > 10);
  });

  test("grille originale : 100", () => {
    assert.equal(G.scoreOriginalite([7, 19, 33, 41, 48], [3, 11], [{ numeros: [1, 2, 3, 4, 6], etoiles: [1, 2] }]).score, 100);
  });

  test("historique absent : critère signalé comme non vérifié", () => {
    const c = G.scoreOriginalite([7, 19, 33, 41, 48], [3, 11], []).criteres.find((x) => x.id === "historique");
    assert.equal(c.verifie, false);
    assert.equal(c.penalite, 0);
  });

  test("score borné entre 0 et 100", () => {
    const h = [{ numeros: [1, 2, 3, 4, 5], etoiles: [1, 2] }];
    assert.equal(G.scoreOriginalite([1, 2, 3, 4, 5], [1, 2], h).score, 0);
  });
});

describe("import CSV et statistiques", () => {
  test("format FDJ avec en-tête", () => {
    const csv = [
      "annee_numero_de_tirage;jour_de_tirage;date_de_tirage;date_de_forclusion;boule_1;boule_2;boule_3;boule_4;boule_5;etoile_1;etoile_2",
      "2024098;VE;06/12/2024;05/02/2025;12;3;44;27;8;10;2",
      "2024097;MA;03/12/2024;02/02/2025;50;1;19;23;31;7;5",
      "ligne;invalide;x;y;99;1;2;3;4;5;6",
    ].join("\n");
    const { tirages, ignorees } = G.analyserCSV(csv);
    assert.equal(tirages.length, 2);
    assert.equal(ignorees, 1);
    assert.deepEqual(tirages[0], { date: "2024-12-06", numeros: [3, 8, 12, 27, 44], etoiles: [2, 10] });
  });

  test("format simple sans en-tête", () => {
    const { tirages } = G.analyserCSV("2024-12-06,12,3,44,27,8,10,2\n2024-12-03,50,1,19,23,31,7,5\n");
    assert.equal(tirages.length, 2);
    assert.equal(tirages[1].date, "2024-12-03");
  });

  test("fréquences et écarts", () => {
    const s = G.statistiques([
      { date: "2024-01-05", numeros: [1, 2, 3, 4, 5], etoiles: [1, 2] },
      { date: "2024-01-09", numeros: [1, 10, 20, 30, 40], etoiles: [1, 3] },
    ]);
    assert.equal(s.dernier, "2024-01-09");
    assert.equal(s.numeros[0].frequence, 2); // numéro 1
    assert.equal(s.numeros[0].ecart, 0);
    assert.equal(s.numeros[1].ecart, 1); // numéro 2 : sorti au tirage précédent
    assert.equal(s.numeros[49].jamais, true); // numéro 50
  });
});

describe("simulateur et budget", () => {
  test("dépense, gain moyen et probabilité", () => {
    const r = G.simuler({ grillesParSemaine: 2, annees: 10, prix: 2.5, tauxRetour: 0.5 });
    assert.equal(r.grilles, 1040);
    assert.equal(r.depense, 2600);
    assert.equal(r.gainMoyen, 1300);
    assert.equal(r.perteMoyenne, 1300);
    assert.ok(Math.abs(r.probaJackpot / (1040 / 139838160) - 1) < 1e-5);
  });

  test("état du budget", () => {
    const depenses = [{ date: "2026-11-02", montant: 10 }, { date: "2026-11-10", montant: 7.5 }, { date: "2026-10-30", montant: 50 }];
    assert.equal(G.totalDuMois(depenses, "2026-11"), 17.5);
    assert.equal(G.etatBudget(17.5, 20), "attention");
    assert.equal(G.etatBudget(10, 20), "ok");
    assert.equal(G.etatBudget(25, 20), "depasse");
    assert.equal(G.etatBudget(25, null), "sans-plafond");
  });
});

// ---------- Analyse approfondie et mode « les plus sortis » ----------
// Historique SIMULÉ (tirages aléatoires), uniquement pour les tests : ce ne sont pas de vrais résultats.
function historiqueSimule(nombre, remplir, biais = null) {
  const t = [];
  const d0 = Date.UTC(2004, 1, 13);
  for (let i = 0; i < nombre; i++) {
    const date = new Date(d0 + i * 3.5 * 864e5).toISOString().slice(0, 10);
    let numeros = G.tirerSansRemise(50, 5, remplir);
    if (biais && !numeros.includes(biais) && G.entierAleatoire(4, remplir) === 0) {
      numeros = [...numeros.slice(1), biais].sort((a, b) => a - b); // le numéro biaisé sort plus souvent
    }
    t.push({ date, numeros, etoiles: G.tirerSansRemise(G.etoilesEnVigueur(date), 2, remplir) });
  }
  return t;
}

describe("outils statistiques", () => {
  test("p-valeurs du khi-deux et de la loi normale", () => {
    assert.ok(Math.abs(G.pValeurKhi2(3.841, 1) - 0.05) < 1e-3);
    assert.ok(Math.abs(G.pValeurKhi2(85.35, 49) - 0.001) < 1e-4);
    assert.ok(Math.abs(G.normaleQ(1.96) - 0.025) < 1e-4);
    assert.ok(Math.abs(G.normaleQ(-1) - 0.8413) < 1e-4);
  });

  test("lois hypergéométriques : somme à 1", () => {
    let s = 0;
    for (let k = 0; k <= 5; k++) s += G.hypergeometrique(50, 25, 5, k);
    assert.ok(Math.abs(s - 1) < 1e-12);
  });

  test("nombre d'étoiles selon la date", () => {
    assert.equal(G.etoilesEnVigueur("2004-02-13"), 9);
    assert.equal(G.etoilesEnVigueur("2011-05-10"), 11);
    assert.equal(G.etoilesEnVigueur("2016-09-27"), 12);
    assert.equal(G.etoilesEnVigueur(null), 12);
  });
});

describe("analyse approfondie", () => {
  test("sur des tirages équitables : environ 5 % de fausses alertes au seuil de 5 %", () => {
    const src = sourceDeterministe(123);
    let alertes = 0, alertesRetro = 0;
    const S = 60;
    for (let s = 0; s < S; s++) {
      const a = G.analyseApprofondie(historiqueSimule(800, src));
      if (a.testNumeros.p < 0.05) alertes++;
      if (a.retro[0].p < 0.05) alertesRetro++;
    }
    assert.ok(alertes / S <= 0.15, `khi² : ${alertes}/${S}`);
    assert.ok(alertesRetro / S <= 0.15, `rétrospectif : ${alertesRetro}/${S}`);
  });

  test("détecte un biais réel quand il existe (puissance du test)", () => {
    const a = G.analyseApprofondie(historiqueSimule(1900, sourceDeterministe(8), 7));
    assert.ok(a.testNumeros.p < 0.001);
    assert.equal(a.numeros.sort((x, y) => y.frequence - x.frequence)[0].valeur, 7);
    assert.ok(a.retro[0].moyenne > a.retro[0].attenduParTirage && a.retro[0].p < 0.01);
  });

  test("valeurs théoriques de structure", () => {
    const a = G.analyseApprofondie(historiqueSimule(500, sourceDeterministe(4)));
    assert.equal(a.sommes.theorique.moyenne, 127.5);
    assert.ok(Math.abs(a.sommes.theorique.ecartType - 30.923) < 1e-3);
    assert.ok(Math.abs(a.suites.proba - 0.35304) < 1e-4);
    assert.equal(a.ecarts.theorique, 9);
    assert.ok(Math.abs(a.paires.attendu - 500 * 10 / 1225) < 1e-9);
  });

  test("étoiles : l'attendu suit l'évolution des règles", () => {
    const a = G.analyseApprofondie(historiqueSimule(1900, sourceDeterministe(6)));
    const total = a.etoiles.reduce((s, e) => s + e.attendu, 0);
    assert.ok(Math.abs(total - 1900 * 2) < 1e-6);
    assert.ok(a.etoiles[11].attendu < a.etoiles[0].attendu, "l'étoile 12 a moins d'historique");
  });
});

describe("générateur « les plus sortis »", () => {
  const historique = historiqueSimule(1000, sourceDeterministe(77));

  test("ne pioche que dans le vivier des plus sortis", () => {
    const vivier = G.viviersFrequents(historique, 15, 5);
    const nums = new Set(vivier.numeros.map((x) => x.valeur)), etoiles = new Set(vivier.etoiles.map((x) => x.valeur));
    for (const g of G.genererGrillesFrequentes(10, { tirages: historique, remplir: sourceDeterministe(1) })) {
      assert.equal(G.validerGrille(g.numeros, g.etoiles), null);
      assert.ok(g.numeros.every((n) => nums.has(n)));
      assert.ok(g.etoiles.every((e) => etoiles.has(e)));
      assert.equal(G.analyser(g.numeros, g.etoiles, historique).dejaSorti.numeros, false);
    }
  });

  test("le vivier contient bien les plus fréquents", () => {
    const vivier = G.viviersFrequents(historique, 15, 5);
    const freq = Array(51).fill(0);
    for (const t of historique) for (const n of t.numeros) freq[n]++;
    const seuil = Math.min(...vivier.numeros.map((x) => freq[x.valeur]));
    for (let n = 1; n <= 50; n++) if (!vivier.numeros.some((x) => x.valeur === n)) assert.ok(freq[n] <= seuil);
  });

  test("refuse de fonctionner sans historique", () => {
    assert.throws(() => G.genererGrilleFrequente({ tirages: [] }), /historique/);
  });
});
