import { test } from "node:test";
import assert from "node:assert/strict";
import {
  creerStore,
  etatInitial,
  validerProfil,
  validerTexte,
  creerLimiteur,
  LIMITES,
  SALONS_PAR_DEFAUT,
} from "../lib/store.js";

const profil = { nom: "  Camille   Martin ", metier: "Ingénieur·e batteries", entreprise: "Volta" };

test("validerProfil nettoie et exige nom + métier", () => {
  assert.deepEqual(validerProfil(profil), {
    ok: true,
    profil: { nom: "Camille Martin", metier: "Ingénieur·e batteries", entreprise: "Volta" },
  });
  assert.equal(validerProfil({ nom: "A", metier: "x" }).ok, false);
  assert.equal(validerProfil({ nom: "Alex" }).ok, false);
  assert.equal(validerProfil(null).ok, false);
  assert.equal(validerProfil({ nom: "x".repeat(100), metier: "m" }).profil.nom.length, LIMITES.nom);
});

test("validerTexte refuse vide, trop long et non-chaîne", () => {
  assert.equal(validerTexte("   ").ok, false);
  assert.equal(validerTexte(42).ok, false);
  assert.equal(validerTexte("a".repeat(LIMITES.message + 1)).ok, false);
  assert.deepEqual(validerTexte(" salut\n\n\n\nça va\u0000 "), { ok: true, texte: "salut\n\nça va" });
});

test("état initial : tous les salons, avec messages d'accueil", () => {
  const store = creerStore(etatInitial());
  const salons = store.salons();
  assert.equal(salons.length, SALONS_PAR_DEFAUT.length);
  assert.ok(salons.find((s) => s.id === "general").total >= 1);
});

test("inscription, authentification par jeton, profil public sans jeton", () => {
  let sauvegardes = 0;
  const store = creerStore(etatInitial(), () => sauvegardes++);
  const r = store.inscrire(profil);
  assert.ok(r.ok);
  assert.equal(store.membre(r.membre.jeton), r.membre);
  assert.equal(store.membre("faux"), undefined);
  assert.equal(store.membre(undefined), undefined);
  assert.equal(store.public(r.membre).jeton, undefined);
  assert.equal(sauvegardes, 1);
});

test("publier puis paginer les messages", () => {
  const store = creerStore(etatInitial());
  const { membre } = store.inscrire(profil);
  const base = store.messages("recharge").messages.length;
  for (let i = 0; i < 60; i++) assert.ok(store.publier(membre, "recharge", `msg ${i}`, 1000 + i).ok);

  const page1 = store.messages("recharge");
  assert.equal(page1.messages.length, LIMITES.page);
  assert.equal(page1.messages.at(-1).texte, "msg 59");
  assert.equal(page1.plusAnciens, true);

  const page2 = store.messages("recharge", { avant: page1.messages[0].id });
  assert.equal(page2.messages.length, 60 + base - LIMITES.page);
  assert.equal(page2.plusAnciens, false);

  assert.equal(store.messages("inconnu"), null);
  assert.equal(store.publier(membre, "inconnu", "x").ok, false);
});

test("l'historique est plafonné", () => {
  const store = creerStore(etatInitial());
  const { membre } = store.inscrire(profil);
  for (let i = 0; i < LIMITES.historique + 10; i++) store.publier(membre, "general", `m${i}`);
  assert.equal(store.etat.messages.general.length, LIMITES.historique);
  assert.equal(store.etat.messages.general.at(-1).texte, `m${LIMITES.historique + 9}`);
});

test("les réactions basculent et n'acceptent que les emojis autorisés", () => {
  const store = creerStore(etatInitial());
  const a = store.inscrire(profil).membre;
  const b = store.inscrire({ ...profil, nom: "Sam Leroy" }).membre;
  const { message } = store.publier(a, "batteries", "Sodium-ion ?");

  store.reagir(a, "batteries", message.id, "⚡");
  store.reagir(b, "batteries", message.id, "⚡");
  assert.deepEqual(message.reactions["⚡"], [a.id, b.id]);

  store.reagir(a, "batteries", message.id, "⚡");
  assert.deepEqual(message.reactions["⚡"], [b.id]);
  store.reagir(b, "batteries", message.id, "⚡");
  assert.equal(message.reactions["⚡"], undefined);

  assert.equal(store.reagir(a, "batteries", message.id, "💩").ok, false);
  assert.equal(store.reagir(a, "batteries", "nope", "⚡").ok, false);
});

test("une ancienne sauvegarde récupère les nouveaux salons", () => {
  const ancien = { salons: [{ id: "general", nom: "Général", icone: "⚡", description: "" }], messages: { general: [] } };
  const store = creerStore(ancien);
  assert.equal(store.salons().length, SALONS_PAR_DEFAUT.length);
  assert.deepEqual(store.etat.membres, {});
});

test("le limiteur bloque au-delà du quota dans la fenêtre", () => {
  const ok = creerLimiteur(2, 1000);
  assert.equal(ok("x", 0), true);
  assert.equal(ok("x", 10), true);
  assert.equal(ok("x", 20), false);
  assert.equal(ok("y", 20), true);
  assert.equal(ok("x", 1005), true);
});
