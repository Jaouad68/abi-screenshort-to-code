// Parcours essentiels dans Chromium : petit écran, clavier, visionneuse, formulaire réel contre un serveur de réception local.
// Usage : npm run test:e2e   (CHROMIUM_PATH pour indiquer un autre exécutable)
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { creerServeur } from '../scripts/serve.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'dist-test');
const PORT_SITE = 4280;
const PORT_RECEPTION = 4281;
const resultats = [];
async function etape(nom, fn) {
  try { await fn(); resultats.push(['ok', nom]); console.log(`ok   ${nom}`); }
  catch (e) { resultats.push(['ÉCHEC', nom]); console.log(`ÉCHEC ${nom}\n     ${e.message.split('\n')[0]}`); }
}

// --- Serveur de réception factice : enregistre les messages et peut simuler une panne.
const recus = [];
let modeReception = 'ok';
const reception = http.createServer((req, res) => {
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'accept', 'content-type': 'application/json' };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors).end(); return; }
  let corps = '';
  req.on('data', (c) => (corps += c));
  req.on('end', () => {
    if (modeReception === 'panne') { res.writeHead(500, cors).end('{"error":"panne"}'); return; }
    if (modeReception === 'refus') { res.writeHead(422, cors).end('{"errors":[{"message":"refusé"}]}'); return; }
    recus.push(corps);
    res.writeHead(200, cors).end('{"ok":true}');
  });
});
await new Promise((r) => reception.listen(PORT_RECEPTION, r));

// --- Build avec formulaire activé (configuration de test uniquement).
const override = path.join(ROOT, 'tests-e2e/override-formulaire.json');
fs.writeFileSync(override, JSON.stringify({ contact: { formulaire: { actif: true, endpoint: `http://localhost:${PORT_RECEPTION}/recevoir`, fournisseur: 'serveur de test' } } }));
execFileSync('node', ['scripts/build.mjs', `--out=${OUT}`, `--override=${override}`], { cwd: ROOT });
fs.rmSync(override);
const site = creerServeur(OUT);
await new Promise((r) => site.listen(PORT_SITE, r));
const BASE = `http://localhost:${PORT_SITE}/`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

// Liste des pages à partir du plan du site.
const plan = fs.readFileSync(path.join(OUT, 'sitemap.xml'), 'utf8');
const routes = [...plan.matchAll(/<loc>[^<]*?\.site\/([^<]*)<\/loc>/g)].map((m) => m[1]);

await etape(`visiteur non connecté : ${routes.length} pages ouvertes sans erreur, images chargées`, async () => {
  const page = await browser.newPage();
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  page.on('response', (r) => { if (r.status() >= 400 && r.url().startsWith(BASE)) erreurs.push(`${r.status()} ${r.url()}`); });
  for (const r of routes) {
    const rep = await page.goto(BASE + r, { waitUntil: 'networkidle' });
    assert.equal(rep.status(), 200, r);
    const cassees = await page.$$eval('img', (imgs) => imgs.filter((i) => i.getAttribute('src')).filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src));
    assert.deepEqual(cassees, [], `image non chargée sur ${r}`);
  }
  assert.deepEqual(erreurs, []);
  await page.close();
});

await etape('petit écran (320 px) : aucun débordement horizontal, texte agrandi à 200 % compris', async () => {
  const ctx = await browser.newContext({ viewport: { width: 320, height: 640 } });
  const page = await ctx.newPage();
  for (const r of routes) {
    await page.goto(BASE + r, { waitUntil: 'networkidle' });
    for (const zoom of ['100%', '200%']) {
      await page.evaluate((z) => { document.documentElement.style.fontSize = z; }, zoom);
      const deborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(deborde <= 0, `${r} déborde de ${deborde}px (texte ${zoom})`);
    }
  }
  await ctx.close();
});

await etape('clavier : lien d’évitement, menu mobile ouvrable et refermable avec Échap', async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Aller au contenu');
  assert.equal(await page.isVisible('#navigation'), false, 'menu replié par défaut');
  await page.focus('.menu-bouton');
  await page.keyboard.press('Enter');
  assert.equal(await page.getAttribute('.menu-bouton', 'aria-expanded'), 'true');
  assert.equal(await page.isVisible('#navigation a[href="histoire/"]'), true);
  await page.keyboard.press('Escape');
  assert.equal(await page.getAttribute('.menu-bouton', 'aria-expanded'), 'false');
  assert.equal(await page.evaluate(() => document.activeElement.className), 'menu-bouton');
  await ctx.close();
});

await etape('visionneuse : ouverture au clavier, fermeture par Échap, retour du focus', async () => {
  const page = await browser.newPage();
  await page.goto(BASE + 'archives/loc-ggbain-17032/', { waitUntil: 'networkidle' });
  await page.focus('[data-agrandir]');
  await page.keyboard.press('Enter');
  assert.equal(await page.isVisible('dialog.visionneuse'), true);
  assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Fermer');
  assert.ok(await page.$eval('dialog.visionneuse img', (i) => i.complete && i.naturalWidth > 0), 'image agrandie chargée');
  await page.keyboard.press('Escape');
  assert.equal(await page.isVisible('dialog.visionneuse'), false);
  assert.equal(await page.evaluate(() => document.activeElement.hasAttribute('data-agrandir')), true);
  await page.close();
});

await etape('formulaire : erreurs compréhensibles, rien n’est transmis', async () => {
  const page = await browser.newPage();
  await page.goto(BASE + 'contact/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3200);
  await page.click('button[type="submit"]');
  assert.match(await page.textContent('.form-statut'), /4 champ\(s\) à corriger/);
  assert.equal(await page.getAttribute('#c-nom', 'aria-invalid'), 'true');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'c-nom');
  assert.equal(recus.length, 0);
  await page.close();
});

async function remplir(page) {
  await page.fill('#c-nom', 'Marie Martin');
  await page.fill('#c-email', 'marie@exemple.fr');
  await page.selectOption('#c-objet', 'Proposer un document');
  await page.fill('#c-message', 'Je conserve le livret militaire de mon arrière-grand-père.');
}

await etape('formulaire : un envoi immédiat (robot) est bloqué', async () => {
  const page = await browser.newPage();
  await page.goto(BASE + 'contact/', { waitUntil: 'networkidle' });
  await remplir(page);
  await page.click('button[type="submit"]');
  assert.match(await page.textContent('.form-statut'), /quelques secondes/);
  assert.equal(recus.length, 0);
  await page.close();
});

await etape('formulaire : champ piège rempli → rien n’est transmis, aucun succès annoncé', async () => {
  const page = await browser.newPage();
  await page.goto(BASE + 'contact/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3200);
  await remplir(page);
  await page.evaluate(() => { document.getElementById('c-site').value = 'http://spam.example'; });
  await page.click('button[type="submit"]');
  assert.doesNotMatch(await page.textContent('.form-statut'), /bien été reçu/);
  assert.equal(recus.length, 0);
  await page.close();
});

await etape('formulaire : panne du service → message d’échec, pas de faux succès, texte conservé', async () => {
  modeReception = 'panne';
  const page = await browser.newPage();
  await page.goto(BASE + 'contact/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3200);
  await remplir(page);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => document.querySelector('.form-statut').classList.contains('echec'));
  assert.match(await page.textContent('.form-statut'), /refusé/);
  assert.equal(await page.inputValue('#c-message'), 'Je conserve le livret militaire de mon arrière-grand-père.');
  assert.equal(recus.length, 0);
  await page.close();
});

await etape('formulaire : réception confirmée → succès affiché et message réellement reçu', async () => {
  modeReception = 'ok';
  const page = await browser.newPage();
  await page.goto(BASE + 'contact/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3200);
  await remplir(page);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => document.querySelector('.form-statut').classList.contains('succes'));
  assert.match(await page.textContent('.form-statut'), /bien été reçu/);
  assert.equal(recus.length, 1);
  assert.match(decodeURIComponent(recus[0]), /livret militaire/);
  // Deuxième envoi immédiat depuis le même navigateur : limité.
  await remplir(page);
  await page.click('button[type="submit"]');
  assert.match(await page.textContent('.form-statut'), /patienter une minute/);
  assert.equal(recus.length, 1);
  await page.close();
});

await etape('page inexistante : réponse 404 avec page d’aide', async () => {
  const page = await browser.newPage();
  const rep = await page.goto(BASE + 'nexiste-pas/');
  assert.equal(rep.status(), 404);
  assert.match(await page.textContent('h1'), /Page introuvable/);
  await page.close();
});

await browser.close();
site.close();
reception.close();
const echecs = resultats.filter(([s]) => s !== 'ok').length;
console.log(`\n${resultats.length - echecs}/${resultats.length} parcours réussis`);
process.exit(echecs ? 1 : 0);
