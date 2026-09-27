// Tests de la logique du formulaire (validation, anti-abus), exécutée hors navigateur.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const code = fs.readFileSync(path.resolve(import.meta.dirname, '../static/assets/formulaire.js'), 'utf8');
const ctx = { module: { exports: {} }, globalThis: {} };
vm.runInNewContext(code, ctx);
const { valider, estAbusif } = ctx.module.exports;

const ok = { nom: 'Marie Martin', email: 'marie@exemple.fr', objet: 'Autre demande', message: 'Bonjour, une question sur mon arrière-grand-père.' };

test('un message complet est valide', () => assert.deepEqual({ ...valider(ok) }, {}));
test('chaque champ manquant produit un message explicite', () => {
  const e = valider({});
  assert.deepEqual(Object.keys(e).sort(), ['email', 'message', 'nom', 'objet']);
  assert.match(e.email, /adresse électronique/);
});
test('une adresse incomplète est signalée avec un exemple', () => assert.match(valider({ ...ok, email: 'marie@exemple' }).email, /Exemple/));
test('un message trop court ou trop long est refusé', () => {
  assert.match(valider({ ...ok, message: 'Salut' }).message, /trop court/);
  assert.match(valider({ ...ok, message: 'x'.repeat(5001) }).message, /trop long/);
});
test('le champ piège, l’envoi trop rapide et les envois répétés sont bloqués', () => {
  assert.equal(estAbusif({ ...ok, _gotcha: 'spam' }, 1, 10000, 0), 'piege');
  assert.equal(estAbusif(ok, 1000, 2000, 0), 'trop-rapide');
  assert.equal(estAbusif(ok, 1000, 100000, 90000), 'trop-frequent');
  assert.equal(estAbusif(ok, 1000, 100000, 0), '');
});
