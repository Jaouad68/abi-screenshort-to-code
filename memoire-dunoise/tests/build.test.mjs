// Tests du générateur : liens, structure des pages, règles éditoriales (brouillons, sources obligatoires).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'dist-test');
const build = (...extra) => execFileSync('node', ['scripts/build.mjs', `--out=${OUT}`, ...extra], { cwd: ROOT, encoding: 'utf8' });

function pagesHtml(dir = OUT) {
  const res = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory() && e.name !== 'admin') res.push(...pagesHtml(p));
    else if (e.name.endsWith('.html')) res.push(p);
  }
  return res;
}
const attr = (html, re) => [...html.matchAll(re)].map((m) => m[1]);

// Crée un fichier de contenu temporaire le temps d'un test.
function avecFichier(rel, texte, fn) {
  const f = path.join(ROOT, 'content', rel);
  fs.writeFileSync(f, texte);
  try { return fn(); } finally { fs.rmSync(f); }
}

test('toutes les pages ont une structure correcte et des liens internes valides', () => {
  build();
  const fichiers = pagesHtml();
  assert.ok(fichiers.length >= 12, 'au moins 12 pages générées');
  const titres = new Set();
  const descriptions = new Set();
  for (const f of fichiers) {
    const html = fs.readFileSync(f, 'utf8');
    const nom = path.relative(OUT, f);
    assert.match(html, /<html lang="fr">/, `${nom} : langue déclarée`);
    assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, `${nom} : un seul h1`);
    const titre = attr(html, /<title>([^<]+)<\/title>/g)[0];
    assert.ok(titre, `${nom} : titre présent`);
    assert.ok(!titres.has(titre), `${nom} : titre unique (${titre})`);
    titres.add(titre);
    const desc = attr(html, /<meta name="description" content="([^"]+)"/g)[0];
    assert.ok(desc && desc.length > 40, `${nom} : description présente`);
    assert.ok(!descriptions.has(desc), `${nom} : description unique`);
    descriptions.add(desc);
    assert.doesNotMatch(html, /\{\{\w+\}\}/, `${nom} : aucun champ non remplacé`);
    for (const img of html.match(/<img [^>]*>/g) || []) assert.match(img, / alt="[^"]+"/, `${nom} : image sans texte alternatif`);
    // Hiérarchie : pas de saut de niveau de titre (h2 → h4).
    const niveaux = [...html.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
    niveaux.reduce((prec, n) => { assert.ok(n <= prec + 1, `${nom} : saut de niveau h${prec} → h${n}`); return n; });
    // Liens et ressources internes.
    for (const lien of [...attr(html, /href="([^"#]+)(?:#[^"]*)?"/g), ...attr(html, /src="([^"]+)"/g), ...attr(html, /srcset="([^"]+)"/g).flatMap((s) => s.split(',').map((x) => x.trim().split(' ')[0]))]) {
      if (/^(https?:|mailto:|tel:)/.test(lien)) continue;
      let cible = path.resolve(path.dirname(f), lien);
      if (lien.endsWith('/') || lien === './') cible = path.join(cible, 'index.html');
      assert.ok(fs.existsSync(cible), `${nom} : lien cassé → ${lien}`);
    }
  }
});

test('les liens externes pointent vers des adresses https complètes', () => {
  for (const f of pagesHtml()) {
    const html = fs.readFileSync(f, 'utf8');
    for (const l of attr(html, /href="(https?:[^"]+)"/g)) assert.match(l, /^https:\/\/[a-z0-9.-]+\.[a-z]{2,}/i, `${path.relative(OUT, f)} : ${l}`);
  }
});

test('les rubriques sans contenu validé ne sont ni générées ni dans le menu', () => {
  const accueil = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8');
  for (const r of ['actualites', 'participer', 'contact']) {
    assert.ok(!fs.existsSync(path.join(OUT, r)), `${r}/ ne doit pas exister`);
    assert.doesNotMatch(accueil, new RegExp(`href="${r}/"`), `pas de lien vers ${r}/`);
  }
  assert.doesNotMatch(accueil, /<form/, 'aucun formulaire sans destination configurée');
});

test('le plan du site, robots.txt et l’administration sont cohérents', () => {
  const plan = fs.readFileSync(path.join(OUT, 'sitemap.xml'), 'utf8');
  assert.match(plan, /\/histoire\/monument-aux-morts\//);
  assert.doesNotMatch(plan, /404/);
  assert.match(fs.readFileSync(path.join(OUT, 'robots.txt'), 'utf8'), /Disallow: \/admin\//);
  assert.match(fs.readFileSync(path.join(OUT, 'admin/index.html'), 'utf8'), /noindex/);
});

test('un brouillon n’est jamais publié', () => {
  avecFichier('articles/zz-brouillon-test.md', `---\ntitre: "Brouillon secret"\nresume: "Texte de test"\nstatut: brouillon\nportee: local\nsources:\n  - titre: X\n---\nCorps`, () => {
    const sortie = build();
    assert.match(sortie, /zz-brouillon-test/);
    assert.ok(!fs.existsSync(path.join(OUT, 'histoire/zz-brouillon-test')));
    assert.doesNotMatch(fs.readFileSync(path.join(OUT, 'histoire/index.html'), 'utf8'), /Brouillon secret/);
  });
});

test('un article sans source est refusé à la publication', () => {
  avecFichier('articles/zz-sans-source.md', `---\ntitre: "Sans source"\nresume: "Texte de test"\nstatut: publie\nportee: local\nsources: []\n---\nCorps`, () => {
    const sortie = build();
    assert.match(sortie, /zz-sans-source\.md — champs manquants : sources/);
    assert.ok(!fs.existsSync(path.join(OUT, 'histoire/zz-sans-source')));
  });
});

test('une fiche de combattant sans lien établi avec Châteaudun est refusée', () => {
  avecFichier('combattants/zz-test.md', `---\nnom: Test\nprenoms: Jean\nstatut: publie\nreferences:\n  - titre: X\n---\n`, () => {
    const sortie = build();
    assert.match(sortie, /zz-test\.md — champs manquants : lien_chateaudun/);
    assert.ok(!fs.existsSync(path.join(OUT, 'combattants/zz-test')));
  });
});

test('les événements sont classés à venir / passés et la rubrique apparaît', () => {
  const ev = (d, t) => `---\ntitre: "${t}"\nstatut: publie\ndate: ${d}\nheure_debut: "10:30"\nlieu: "Lieu de test"\n---\n`;
  avecFichier('evenements/zz-passe.md', ev('2026-01-10', 'Événement passé'), () =>
    avecFichier('evenements/zz-futur.md', ev('2026-12-20', 'Événement futur'), () => {
      build('--today=2026-09-27');
      const html = fs.readFileSync(path.join(OUT, 'actualites/index.html'), 'utf8');
      const [avenir, passes] = html.slice(html.indexOf('<main')).split('id="t-passes"');
      assert.match(avenir, /Événement futur/);
      assert.doesNotMatch(avenir, /Événement passé/);
      assert.match(passes, /Événement passé/);
      assert.match(html, /"@type":"Event"/);
      assert.match(fs.readFileSync(path.join(OUT, 'index.html'), 'utf8'), /href="actualites\/"/);
    }),
  );
  build(); // état de référence
});

test('le mode prévisualisation produit des liens explicites et une page racine en fragment', () => {
  const out = path.join(ROOT, 'dist-test-preview');
  execFileSync('node', ['scripts/build.mjs', '--preview', `--out=${out}`], { cwd: ROOT });
  const racine = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
  assert.doesNotMatch(racine, /<!doctype/i);
  assert.match(racine, /href="histoire\/index\.html"/);
  assert.ok(!fs.existsSync(path.join(out, 'admin')));
  fs.rmSync(out, { recursive: true, force: true });
});
