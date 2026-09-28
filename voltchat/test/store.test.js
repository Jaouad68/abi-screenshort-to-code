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
  DUREE_SESSION,
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

test("le limiteur libère les clés inactives", () => {
  const ok = creerLimiteur(2, 1000);
  ok("a", 0);
  ok("b", 900);
  ok.nettoyer(1500);
  assert.equal(ok.taille(), 1);
  ok.nettoyer(3000);
  assert.equal(ok.taille(), 0);
});

// ---------- Sessions ----------

test("la session expire, se prolonge et se révoque à la déconnexion", () => {
  const store = creerStore(etatInitial());
  const { membre } = store.inscrire(profil, 1000);
  assert.equal(store.membre(membre.jeton, 1000 + DUREE_SESSION - 1), membre);
  assert.equal(store.membre(membre.jeton, 1000 + DUREE_SESSION), undefined);

  store.prolonger(membre, 1000 + DUREE_SESSION - 1);
  assert.equal(store.membre(membre.jeton, 1000 + DUREE_SESSION + 10), membre);

  const ancien = membre.jeton;
  store.deconnecter(membre);
  assert.equal(store.membre(ancien), undefined);
  assert.equal(store.membre(membre.jeton), undefined);
});

test("le rôle est membre par défaut, modérateur sur demande", () => {
  const store = creerStore(etatInitial());
  assert.equal(store.public(store.inscrire(profil).membre).role, "membre");
  const mod = store.inscrire({ ...profil, nom: "Modo" }, Date.now(), { moderateur: true }).membre;
  assert.equal(store.public(mod).role, "moderateur");
  assert.equal(store.estModerateur(mod), true);
});

// ---------- Modification & suppression ----------

test("seul l'auteur peut modifier son message", () => {
  const store = creerStore(etatInitial());
  const a = store.inscrire(profil).membre;
  const b = store.inscrire({ ...profil, nom: "Sam Leroy" }).membre;
  const { message } = store.publier(a, "general", "Bonjuor", 1000);

  assert.equal(store.modifier(b, "general", message.id, "piraté").statut, 403);
  assert.equal(store.modifier(a, "general", message.id, "   ").ok, false);
  const r = store.modifier(a, "general", message.id, "Bonjour", 2000);
  assert.ok(r.ok);
  assert.equal(message.texte, "Bonjour");
  assert.equal(message.modifie, 2000);
  assert.equal(store.modifier(a, "general", "nope", "x").ok, false);
});

test("suppression : auteur ou modérateur, jamais un autre membre", () => {
  const store = creerStore(etatInitial());
  const a = store.inscrire(profil).membre;
  const b = store.inscrire({ ...profil, nom: "Sam Leroy" }).membre;
  const mod = store.inscrire({ ...profil, nom: "Modo" }, Date.now(), { moderateur: true }).membre;
  const m1 = store.publier(a, "general", "un").message;
  const m2 = store.publier(a, "general", "deux").message;

  assert.equal(store.supprimer(b, "general", m1.id).statut, 403);
  assert.ok(store.supprimer(a, "general", m1.id).ok);
  assert.ok(store.supprimer(mod, "general", m2.id).ok);
  assert.ok(!store.etat.messages.general.some((m) => m.id === m1.id || m.id === m2.id));
});

// ---------- Messages privés ----------

test("conversation privée : unique par paire, réservée aux participants", () => {
  const store = creerStore(etatInitial());
  const a = store.inscrire(profil).membre;
  const b = store.inscrire({ ...profil, nom: "Sam Leroy" }).membre;
  const c = store.inscrire({ ...profil, nom: "Eve Curieuse" }).membre;

  const r1 = store.conversation(a, b.id);
  assert.ok(r1.ok && r1.cree);
  const r2 = store.conversation(b, a.id);
  assert.equal(r2.conversation.id, r1.conversation.id);
  assert.equal(r2.cree, false);

  const id = r1.conversation.id;
  assert.equal(store.peutAcceder(a, id), true);
  assert.equal(store.peutAcceder(c, id), false);
  assert.equal(store.peutAcceder(c, "general"), true);
  assert.deepEqual(store.participants(id), [a.id, b.id]);
  assert.equal(store.participants("general"), null);

  assert.equal(store.publier(c, id, "intrus").ok, false);
  assert.ok(store.publier(b, id, "Salut Camille").ok);

  const liste = store.conversationsDe(a);
  assert.equal(liste.length, 1);
  assert.equal(liste[0].avec.nom, "Sam Leroy");
  assert.equal(liste[0].total, 1);
  assert.equal(store.conversationsDe(c).length, 0);

  assert.equal(store.conversation(a, a.id).ok, false);
  assert.equal(store.conversation(a, "inconnu").ok, false);
});

test("un modérateur ne supprime pas les messages privés des autres, et ils ne sont pas signalables", () => {
  const store = creerStore(etatInitial());
  const a = store.inscrire(profil).membre;
  const mod = store.inscrire({ ...profil, nom: "Modo" }, Date.now(), { moderateur: true }).membre;
  const { conversation } = store.conversation(a, mod.id);
  const { message } = store.publier(a, conversation.id, "privé");
  assert.equal(store.supprimer(mod, conversation.id, message.id).statut, 403);
  assert.equal(store.signaler(mod, conversation.id, message.id, "Spam").ok, false);
});

// ---------- Signalements & exclusion ----------

test("signalement : pas le sien, pas de doublon, retiré avec le message", () => {
  const store = creerStore(etatInitial());
  const a = store.inscrire(profil).membre;
  const b = store.inscrire({ ...profil, nom: "Sam Leroy" }).membre;
  const mod = store.inscrire({ ...profil, nom: "Modo" }, Date.now(), { moderateur: true }).membre;
  const { message } = store.publier(a, "general", "Achetez mes bornes !!!");

  assert.equal(store.signaler(a, "general", message.id, "Spam").ok, false);
  assert.equal(store.signaler(b, "general", message.id, "  ").ok, false);
  const accueil = store.etat.messages.general[0];
  assert.equal(store.signaler(b, "general", accueil.id, "Spam").ok, false);

  const r = store.signaler(b, "general", message.id, "Spam ou publicité");
  assert.ok(r.ok && r.nouveau);
  assert.equal(store.signaler(b, "general", message.id, "Spam").nouveau, false);
  assert.equal(store.signalements().length, 1);
  assert.equal(store.signalements()[0].auteur.id, a.id);

  store.supprimer(mod, "general", message.id);
  assert.equal(store.signalements().length, 0);

  const m2 = store.publier(a, "general", "encore").message;
  const s2 = store.signaler(b, "general", m2.id, "Hors sujet").signalement;
  assert.ok(store.ignorerSignalement(s2.id).ok);
  assert.equal(store.ignorerSignalement(s2.id).ok, false);
});

test("exclusion : réservée aux modérateurs, révoque la session et purge les messages publics", () => {
  const store = creerStore(etatInitial());
  const spam = store.inscrire({ ...profil, nom: "Spammeur" }).membre;
  const b = store.inscrire({ ...profil, nom: "Sam Leroy" }).membre;
  const mod = store.inscrire({ ...profil, nom: "Modo" }, Date.now(), { moderateur: true }).membre;
  const mod2 = store.inscrire({ ...profil, nom: "Modo 2" }, Date.now(), { moderateur: true }).membre;
  const jeton = spam.jeton;
  const m1 = store.publier(spam, "general", "pub 1").message;
  store.publier(spam, "batteries", "pub 2");
  store.publier(b, "general", "message légitime");
  store.signaler(b, "general", m1.id, "Spam");

  assert.equal(store.exclure(b, spam.id).statut, 403);
  assert.equal(store.exclure(mod, mod2.id).ok, false);
  assert.equal(store.exclure(mod, mod.id).ok, false);

  const r = store.exclure(mod, spam.id);
  assert.ok(r.ok);
  assert.equal(r.retires.length, 2);
  assert.equal(store.membre(jeton), undefined);
  assert.ok(!store.etat.messages.general.some((m) => m.auteur.id === spam.id));
  assert.ok(store.etat.messages.general.some((m) => m.auteur.id === b.id));
  assert.equal(store.signalements().length, 0);
  assert.equal(store.conversation(b, spam.id).ok, false);
  assert.equal(store.exclure(mod, spam.id).ok, false);
});
