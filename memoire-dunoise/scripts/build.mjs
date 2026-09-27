// Générateur du site Mémoire dunoise : content/ → dist/ (ou dist-preview/ avec --preview).
// Usage : node scripts/build.mjs [--preview] [--out=dossier] [--override=fichier.json]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { loadContent, CONTENT_DIR } from './lib/content.mjs';
import { esc, md, mdInline, dateLongue, linker, picture, layout, listeSources } from './lib/html.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')).map(([k, v]) => [k, v ?? true]));
const PREVIEW = Boolean(args.preview);
const OUT = path.resolve(ROOT, args.out || (PREVIEW ? 'dist-preview' : 'dist'));
const override = args.override ? JSON.parse(fs.readFileSync(path.resolve(args.override), 'utf8')) : undefined;
const AUJOURDHUI = args.today || new Date().toISOString().slice(0, 10);

const data = loadContent({ override });
const { site, articles, documents, combattants, evenements, actualites, pages, rapport } = data;
const BASE = site.urlPublique.replace(/\/$/, '');

// ---------------------------------------------------------------- navigation
const contactActif = Boolean(site.contact.email || site.contact.telephone || site.contact.adressePostale || (site.contact.formulaire.actif && site.contact.formulaire.endpoint));
const aLaUne = evenements.length > 0 || actualites.length > 0;
const NAV = [
  { id: 'accueil', label: 'Accueil', route: '' },
  { id: 'histoire', label: 'Histoire locale', route: 'histoire/' },
  { id: 'combattants', label: 'Combattants', route: 'combattants/' },
  { id: 'archives', label: 'Archives', route: 'archives/' },
  aLaUne && { id: 'actualites', label: 'Actualités', route: 'actualites/' },
  site.participer.actif && { id: 'participer', label: 'Participer', route: 'participer/' },
  { id: 'a-propos', label: site.association.identiteConfirmee ? 'L’association' : 'Le projet', route: 'a-propos/' },
  contactActif && { id: 'contact', label: 'Contact', route: 'contact/' },
].filter(Boolean);

// ---------------------------------------------------------------- images
const LARGEURS = [480, 800, 1200];
async function traiterImages() {
  const dossier = path.join(OUT, 'media');
  fs.mkdirSync(dossier, { recursive: true });
  const images = {};
  for (const d of documents) {
    const src = path.join(CONTENT_DIR, 'media', path.basename(d.image));
    if (!fs.existsSync(src)) {
      rapport.refuses.push(`${d.fichier} — image introuvable : ${d.image}`);
      continue;
    }
    const base = path.basename(d.image).replace(/\.[a-z]+$/i, '');
    const meta = await sharp(src).metadata();
    images[d.slug] = await variantes(src, base, meta.width, meta.height, null, dossier);
    if (d.recadrage) {
      const [left, top, width, height] = d.recadrage.map(Number);
      images[`${d.slug}:recadrage`] = await variantes(src, `${base}-recadrage`, width, height, { left, top, width, height }, dossier);
    }
  }
  return images;
}
async function variantes(src, base, largeur, hauteur, extract, dossier) {
  const variants = [];
  for (const w of LARGEURS.filter((w) => w < largeur).concat(largeur)) {
    const fichier = `${base}-${w}`;
    let pipe = () => {
      let p = sharp(src);
      if (extract) p = p.extract(extract);
      return p.resize({ width: w, withoutEnlargement: true });
    };
    await pipe().webp({ quality: 80 }).toFile(path.join(dossier, `${fichier}.webp`));
    await pipe().jpeg({ quality: 84, mozjpeg: true }).toFile(path.join(dossier, `${fichier}.jpg`));
    variants.push({ fichier, largeur: w });
  }
  // Fichier d'origine, pour l'agrandissement et le téléchargement.
  if (!extract) fs.copyFileSync(src, path.join(dossier, path.basename(src)));
  return { variants, largeur, hauteur, original: path.basename(src) };
}

// ---------------------------------------------------------------- écriture
const ecrits = [];
function page(route, { id, titre, description, contenu, jsonLd, ogImage, noindex, fichier }) {
  const cible = fichier || `${route}index.html`;
  const depth = cible.split('/').length - 1;
  const L = linker(depth, PREVIEW);
  const html = layout({
    site,
    nav: NAV,
    courant: id,
    titre,
    description,
    canonical: noindex ? '' : `${BASE}/${route}`,
    contenu: typeof contenu === 'function' ? contenu(L) : contenu,
    L,
    jsonLd,
    ogImage,
    noindex,
    // Pour la prévisualisation publiée, la page racine est un fragment (le squelette est ajouté à la publication).
    fragment: PREVIEW && cible === 'index.html',
  });
  const dest = path.join(OUT, cible);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, html);
  ecrits.push({ route, cible, titre, description, noindex });
}

const fil = (L, items) =>
  `<nav class="fil" aria-label="Fil d’Ariane"><ol>${items
    .map((it, i) => (i < items.length - 1 ? `<li><a href="${L(it.route)}">${esc(it.label)}</a></li>` : `<li><span aria-current="page">${esc(it.label)}</span></li>`))
    .join('')}</ol></nav>`;
const breadcrumbLd = (items) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.label, item: `${BASE}/${it.route}` })),
});
const porteeBadge = (a) =>
  a.portee === 'national'
    ? '<span class="badge badge-national">Contexte national</span>'
    : '<span class="badge badge-local">Fait local, sourcé</span>';

function carteArticle(a, L, niveau = 3) {
  return `<article class="liste-article">
  <p class="liste-meta">${porteeBadge(a)}<span class="theme">${esc(a.theme || '')}</span></p>
  <h${niveau} class="liste-titre"><a href="${L(`histoire/${a.slug}/`)}">${esc(a.titre)}</a></h${niveau}>
  <p>${esc(a.resume)}</p>
  <p class="liste-sources">${a.sources.length} source${a.sources.length > 1 ? 's' : ''} citée${a.sources.length > 1 ? 's' : ''}</p>
</article>`;
}

function legendeDocument(d, L, lien = true) {
  return `<figcaption class="legende">
  <span class="legende-titre">${lien ? `<a href="${L(`archives/${d.slug}/`)}">${esc(d.titre)}</a>` : esc(d.titre)}</span>
  <span>${esc(d.date)}${d.datation === 'estimee' ? ' (date estimée)' : ''} · Lieu : ${esc(d.lieu || 'non précisé')}</span>
  <span class="legende-credit">${esc(d.credit || d.provenance)}</span>
</figcaption>`;
}

// ---------------------------------------------------------------- pages
function evenementsHtml(L, niveau = 3) {
  const aVenir = evenements.filter((e) => e.date >= AUJOURDHUI).sort((a, b) => a.date.localeCompare(b.date));
  const passes = evenements.filter((e) => e.date < AUJOURDHUI).sort((a, b) => b.date.localeCompare(a.date));
  const item = (e) => `<li class="evenement" data-date="${e.date}">
    <p class="evenement-date"><time datetime="${e.date}">${dateLongue(e.date)}</time></p>
    <h${niveau + 1} class="evenement-titre">${esc(e.titre)}</h${niveau + 1}>
    <dl class="evenement-infos">
      <div><dt>Horaires</dt><dd>${esc(e.heure_debut)}${e.heure_fin ? ` – ${esc(e.heure_fin)}` : ''}</dd></div>
      <div><dt>Lieu</dt><dd>${esc(e.lieu)}${e.adresse ? `, ${esc(e.adresse)}` : ''}</dd></div>
      ${e.infos_pratiques ? `<div><dt>Informations pratiques</dt><dd>${esc(e.infos_pratiques)}</dd></div>` : ''}
    </dl>
    ${e.body ? `<div class="prose-courte">${md(e.body)}</div>` : ''}
  </li>`;
  return `<section class="bloc" aria-labelledby="t-avenir">
  <h${niveau} id="t-avenir">À venir</h${niveau}>
  <ul class="evenements" data-liste="avenir">${aVenir.map(item).join('')}</ul>
  <p class="vide" data-vide="avenir"${aVenir.length ? ' hidden' : ''}>Aucun rendez-vous à venir n’est publié pour le moment.</p>
</section>
<section class="bloc" aria-labelledby="t-passes"${passes.length ? '' : ' data-masquable'}>
  <h${niveau} id="t-passes">Événements passés</h${niveau}>
  <ul class="evenements evenements-passes" data-liste="passes">${passes.map(item).join('')}</ul>
</section>`;
}

function pageAccueil(images) {
  const p = pages.accueil;
  const doc = documents.find((d) => d.slug === p.image_hero) || documents[0];
  const img = doc && (images[`${doc.slug}:recadrage`] || images[doc.slug]);
  page('', {
    id: 'accueil',
    titre: site.nom,
    description: p.description_seo,
    ogImage: doc ? `${BASE}/media/${images[doc.slug].original}` : undefined,
    jsonLd: { '@context': 'https://schema.org', '@type': 'WebSite', name: site.nom, url: `${BASE}/`, inLanguage: 'fr', description: site.description },
    contenu: (L) => `
<section class="hero">
  <div class="hero-texte">
    <p class="surtitre">${esc(p.accroche)}</p>
    <h1>${esc(p.titre_principal)}</h1>
    <p class="hero-intro">${esc(p.introduction)}</p>
    <ul class="actions">
      <li><a class="bouton" href="${L('histoire/')}">Lire les articles</a></li>
      <li><a class="bouton bouton-second" href="${L('combattants/')}">Retrouver un combattant</a></li>
    </ul>
  </div>
  ${doc ? `<figure class="hero-image">
    ${picture(img, { sizes: '(min-width: 60em) 36rem, 100vw', alt: doc.alt, eager: true }, L)}
    ${legendeDocument(doc, L)}
  </figure>` : ''}
</section>

<section class="section" aria-labelledby="t-lire">
  <div class="section-tete">
    <h2 id="t-lire">Châteaudun pendant la guerre</h2>
    <p>Articles fondés sur des sources identifiées, citées en fin de page.</p>
  </div>
  <div class="liste-articles">${articles.slice(0, 3).map((a) => carteArticle(a, L)).join('')}</div>
  <p class="plus"><a href="${L('histoire/')}">Tous les articles et les repères nationaux</a></p>
</section>

${aLaUne ? `<section class="section" aria-labelledby="t-agenda">
  <div class="section-tete"><h2 id="t-agenda">Commémorations et rendez-vous</h2></div>
  ${evenementsHtml(L, 3)}
  <p class="plus"><a href="${L('actualites/')}">Toutes les actualités</a></p>
</section>` : ''}

<section class="section section-bande" aria-labelledby="t-recherche">
  <div class="bande-inner">
    <div>
      <h2 id="t-recherche">Un ancêtre a combattu en 1914–1918 ?</h2>
      <p>Fiche matricule, base des Morts pour la France, journaux de marche : la plupart des sources sont en ligne et gratuites. Notre guide indique où chercher et dans quel ordre.</p>
    </div>
    <p><a class="bouton bouton-clair" href="${L('combattants/')}">Consulter le guide de recherche</a></p>
  </div>
</section>

<section class="section section-deux" aria-labelledby="t-demarche">
  <div>
    <h2 id="t-demarche">Une démarche de mémoire et de transmission</h2>
    <p>${esc(pages.projet.chapeau)} Chaque fait publié est rattaché à sa source ; ce qui reste incertain est signalé comme tel.</p>
    <p class="plus"><a href="${L('a-propos/')}">${site.association.identiteConfirmee ? 'Découvrir l’association' : 'Lire la démarche du projet'}</a></p>
  </div>
  <div>
    <h2 id="t-archives">Archives et photographies</h2>
    <p>Chaque document est présenté avec sa date, sa provenance, sa cote et ses conditions de réutilisation.</p>
    <p class="plus"><a href="${L('archives/')}">Voir les documents (${documents.length})</a></p>
  </div>
</section>`,
  });
}

function pagesHistoire() {
  const p = pages.histoire;
  const crumbs = [{ label: 'Accueil', route: '' }, { label: p.titre, route: 'histoire/' }];
  page('histoire/', {
    id: 'histoire',
    titre: p.titre,
    description: p.description_seo,
    jsonLd: { '@context': 'https://schema.org', ...breadcrumbLd(crumbs) },
    contenu: (L) => `${fil(L, crumbs)}
<header class="page-tete"><h1>${esc(p.titre)}</h1><p class="chapeau">${esc(p.chapeau)}</p></header>
<section class="section" aria-labelledby="t-articles">
  <h2 id="t-articles" class="visually-hidden">Articles</h2>
  <div class="liste-articles">${articles.map((a) => carteArticle(a, L, 3)).join('')}</div>
</section>
<section class="section reperes" aria-labelledby="t-reperes">
  <div class="section-tete">
    <p class="badge badge-national">Contexte national</p>
    <h2 id="t-reperes">${esc(p.reperes_titre)}</h2>
    <p>${esc(p.reperes_intro)}</p>
  </div>
  <ol class="frise">
    ${p.reperes.map((r) => `<li><p class="frise-annee">${esc(r.annee)}</p><h3>${esc(r.titre)}</h3><p>${esc(r.texte)}</p></li>`).join('')}
  </ol>
  <p class="note-source">Pour approfondir : <a href="${esc(p.reperes_source_url)}">${esc(p.reperes_source_titre)}</a>.</p>
</section>`,
  });

  for (const a of articles) {
    const c = [...crumbs, { label: a.titre, route: `histoire/${a.slug}/` }];
    const autres = articles.filter((x) => x.slug !== a.slug);
    page(`histoire/${a.slug}/`, {
      id: 'histoire',
      titre: a.titre,
      description: a.resume,
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Article',
            headline: a.titre,
            description: a.resume,
            datePublished: a.date_publication,
            ...(a.mise_a_jour ? { dateModified: a.mise_a_jour } : {}),
            inLanguage: 'fr',
            about: { '@type': 'Place', name: 'Châteaudun' },
            citation: a.sources.map((s) => ({ '@type': 'CreativeWork', name: s.titre, ...(s.url ? { url: s.url } : {}) })),
          },
          breadcrumbLd(c),
        ],
      },
      contenu: (L) => `${fil(L, c)}
<article class="article">
  <header class="page-tete">
    <p class="liste-meta">${porteeBadge(a)}<span class="theme">${esc(a.theme || '')}</span></p>
    <h1>${esc(a.titre)}</h1>
    <p class="chapeau">${esc(a.resume)}</p>
    <p class="article-dates">Publié le <time datetime="${a.date_publication}">${dateLongue(a.date_publication)}</time>${a.mise_a_jour ? ` · mis à jour le <time datetime="${a.mise_a_jour}">${dateLongue(a.mise_a_jour)}</time>` : ''}</p>
  </header>
  <div class="prose">${md(a.body)}</div>
  ${a.corrections?.length ? `<aside class="corrections" aria-labelledby="t-corr"><h2 id="t-corr">Corrections apportées</h2><ul>${a.corrections.map((x) => `<li>${mdInline(x)}</li>`).join('')}</ul></aside>` : ''}
  ${listeSources(a.sources)}
</article>
${autres.length ? `<aside class="section" aria-labelledby="t-autres"><h2 id="t-autres">À lire aussi</h2><div class="liste-articles">${autres.slice(0, 2).map((x) => carteArticle(x, L, 3)).join('')}</div></aside>` : ''}`,
    });
  }
}

function pagesCombattants() {
  const p = pages['retrouver-un-combattant'];
  const crumbs = [{ label: 'Accueil', route: '' }, { label: 'Parcours de combattants', route: 'combattants/' }];
  const filtre = combattants.length >= 12;
  page('combattants/', {
    id: 'combattants',
    titre: 'Parcours de combattants',
    description: p.description_seo,
    jsonLd: { '@context': 'https://schema.org', ...breadcrumbLd(crumbs) },
    contenu: (L) => `${fil(L, crumbs)}
<header class="page-tete"><h1>Parcours de combattants</h1><p class="chapeau">${esc(p.chapeau)}</p></header>
${combattants.length ? `<section class="section" aria-labelledby="t-fiches">
  <h2 id="t-fiches">Fiches publiées</h2>
  ${filtre ? `<div class="filtre"><label for="filtre-combattants">Filtrer par nom, unité ou lieu</label><input id="filtre-combattants" type="search" data-filtre="#liste-combattants" autocomplete="off"><p class="filtre-compte" aria-live="polite"></p></div>` : ''}
  <ul class="fiches" id="liste-combattants">${combattants
    .map((c) => `<li data-texte="${esc(`${c.nom} ${c.prenoms} ${c.unite || ''} ${c.naissance_lieu || ''}`.toLowerCase())}"><a href="${L(`combattants/${c.slug}/`)}"><span class="fiche-nom">${esc(c.nom.toUpperCase())} ${esc(c.prenoms)}</span><span class="fiche-meta">${esc([c.unite, c.naissance_date && `né le ${c.naissance_date}`].filter(Boolean).join(' · '))}</span></a></li>`)
    .join('')}</ul>
</section>` : ''}
<section class="section" aria-labelledby="t-guide">
  <div class="section-tete"><h2 id="t-guide">Retrouver un combattant : la méthode</h2></div>
  <ol class="etapes">
    ${p.etapes
      .map(
        (e) => `<li><h3>${esc(e.titre)}</h3><p>${esc(e.texte)}</p>${e.lien_url ? `<p><a class="lien-externe" href="${esc(e.lien_url)}">${esc(e.lien_titre)}</a></p>` : ''}</li>`,
      )
      .join('')}
  </ol>
</section>
<section class="section prose">${md(p.body)}</section>`,
  });

  for (const c of combattants) {
    const cc = [...crumbs, { label: `${c.prenoms} ${c.nom}`, route: `combattants/${c.slug}/` }];
    const champs = [
      ['Naissance', [c.naissance_date, c.naissance_lieu].filter(Boolean).join(', ')],
      ['Décès', [c.deces_date, c.deces_lieu].filter(Boolean).join(', ')],
      ['Mention « Mort pour la France »', c.mort_pour_la_france === true ? 'Oui' : c.mort_pour_la_france === false ? 'Non' : ''],
      ['Lien avec Châteaudun', c.lien_chateaudun],
      ['Grade', c.grade],
      ['Unité(s)', c.unite],
      ['Classe et matricule', c.matricule],
    ].filter(([, v]) => v);
    page(`combattants/${c.slug}/`, {
      id: 'combattants',
      titre: `${c.prenoms} ${c.nom}`,
      description: `Parcours de ${c.prenoms} ${c.nom} (1914–1918) : ${c.lien_chateaudun}`.slice(0, 160),
      jsonLd: { '@context': 'https://schema.org', ...breadcrumbLd(cc) },
      contenu: (L) => `${fil(L, cc)}
<article class="article">
  <header class="page-tete"><p class="surtitre">Fiche de combattant</p><h1>${esc(c.prenoms)} ${esc(c.nom.toUpperCase())}</h1></header>
  <dl class="fiche-archive">${champs.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
  ${c.body ? `<section class="prose" aria-labelledby="t-parcours"><h2 id="t-parcours">Parcours connu</h2>${md(c.body)}</section>` : ''}
  ${listeSources(c.references, 'Références consultées')}
  <p class="note-source">Les informations absentes de cette fiche ne sont pas connues à ce jour. Vous disposez d’un document ? ${contactActif ? `<a href="${L('contact/')}">Écrivez-nous</a>.` : 'Un moyen de contact sera bientôt publié.'}</p>
</article>`,
    });
  }
}

function pagesArchives(images) {
  const crumbs = [{ label: 'Accueil', route: '' }, { label: 'Archives et photographies', route: 'archives/' }];
  page('archives/', {
    id: 'archives',
    titre: 'Archives et photographies',
    description: 'Documents et photographies de la Première Guerre mondiale, présentés avec leur date, leur provenance, leur cote et leurs conditions de réutilisation.',
    jsonLd: { '@context': 'https://schema.org', ...breadcrumbLd(crumbs) },
    contenu: (L) => `${fil(L, crumbs)}
<header class="page-tete"><h1>Archives et photographies</h1>
<p class="chapeau">Chaque document est accompagné de sa notice : date connue ou estimée, lieu lorsqu’il est documenté, provenance, cote et conditions de réutilisation. Un document dont le lieu n’est pas établi n’est jamais attribué à Châteaudun.</p></header>
<section class="section" aria-labelledby="t-docs">
  <h2 id="t-docs" class="visually-hidden">Documents</h2>
  <ul class="documents">${documents
    .map(
      (d) => `<li><figure>
      <a class="document-vignette" href="${L(`archives/${d.slug}/`)}" aria-label="Notice : ${esc(d.titre)}">${picture(images[d.slug], { sizes: '(min-width: 48em) 30rem, 100vw', alt: d.alt }, L)}</a>
      ${legendeDocument(d, L)}
    </figure></li>`,
    )
    .join('')}</ul>
</section>
<section class="section prose" aria-labelledby="t-proposer">
  <h2 id="t-proposer">Vous conservez des documents de famille ?</h2>
  ${site.participer.actif && site.participer.transmissionDocuments ? md(site.participer.transmissionDocuments) : `<p>Lettres, photographies, livrets militaires : ces documents peuvent éclairer l’histoire locale. Les modalités pour les proposer seront publiées dès qu’elles auront été définies par l’association. Tout document proposé sera vérifié avant une éventuelle publication, avec l’accord de ses détenteurs.</p>`}
</section>`,
  });

  for (const d of documents) {
    const img = images[d.slug];
    if (!img) continue;
    const cc = [...crumbs, { label: d.titre, route: `archives/${d.slug}/` }];
    page(`archives/${d.slug}/`, {
      id: 'archives',
      titre: d.titre,
      description: `${d.titre} — ${d.date}. Provenance : ${d.provenance}.`.slice(0, 160),
      ogImage: `${BASE}/media/${img.original}`,
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Photograph',
            name: d.titre,
            ...(d.titre_original ? { alternateName: d.titre_original } : {}),
            description: d.alt,
            dateCreated: d.date,
            creator: { '@type': 'Organization', name: d.auteur },
            image: `${BASE}/media/${img.original}`,
            isBasedOn: d.url_source,
            creditText: d.credit || d.provenance,
          },
          breadcrumbLd(cc),
        ],
      },
      contenu: (L) => `${fil(L, cc)}
<article class="article article-large">
  <header class="page-tete"><p class="surtitre">Notice de document</p><h1>${esc(d.titre)}</h1>${d.titre_original ? `<p class="chapeau">Titre d’origine : <span lang="en">${esc(d.titre_original)}</span></p>` : ''}</header>
  <figure class="document-grand">
    ${picture(img, { sizes: '(min-width: 64em) 56rem, 100vw', alt: d.alt, eager: true }, L)}
    ${legendeDocument(d, L, false)}
  </figure>
  <p class="document-actions">
    <button class="bouton bouton-second" type="button" data-agrandir="${L(`media/${img.original}`)}" data-alt="${esc(d.alt)}" data-legende="${esc(`${d.titre} — ${d.credit || d.provenance}`)}" hidden>Agrandir l’image</button>
    <a href="${L(`media/${img.original}`)}">Ouvrir l’image en taille réelle</a> <span class="discret">(JPEG, ${img.largeur} × ${img.hauteur} px)</span>
  </p>
  <section aria-labelledby="t-notice">
    <h2 id="t-notice">Notice</h2>
    <dl class="fiche-archive">
      ${[
        ['Date', `${d.date}${d.datation === 'estimee' ? ' — date estimée par la source' : ''}`],
        ['Lieu', d.lieu || 'Non précisé'],
        ['Auteur', d.auteur],
        ['Support', d.support],
        ['Provenance', d.provenance],
        ['Cote', d.cote],
        ['Conditions de réutilisation', d.droits],
        ['Crédit à mentionner', d.credit],
      ]
        .filter(([, v]) => v)
        .map(([k, v]) => `<div><dt>${esc(k)}</dt><dd${k === 'Cote' ? ' class="cote"' : ''}>${esc(v)}</dd></div>`)
        .join('')}
      <div><dt>Notice d’origine</dt><dd><a href="${esc(d.url_source)}">Consulter la notice chez le détenteur</a></dd></div>
    </dl>
  </section>
  ${d.body ? `<section class="prose" aria-labelledby="t-comm"><h2 id="t-comm">Commentaire</h2>${md(d.body)}</section>` : ''}
</article>`,
    });
  }
}

function pageActualites() {
  if (!aLaUne) return;
  const crumbs = [{ label: 'Accueil', route: '' }, { label: 'Actualités et commémorations', route: 'actualites/' }];
  page('actualites/', {
    id: 'actualites',
    titre: 'Actualités et commémorations',
    description: 'Commémorations, rendez-vous et publications validés par l’association.',
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        breadcrumbLd(crumbs),
        ...evenements.map((e) => ({
          '@type': 'Event',
          name: e.titre,
          startDate: `${e.date}T${e.heure_debut}`,
          ...(e.heure_fin ? { endDate: `${e.date}T${e.heure_fin}` } : {}),
          eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
          location: { '@type': 'Place', name: e.lieu, ...(e.adresse ? { address: e.adresse } : {}) },
        })),
      ],
    },
    contenu: (L) => `${fil(L, crumbs)}
<header class="page-tete"><h1>Actualités et commémorations</h1><p class="chapeau">Seuls les rendez-vous confirmés sont publiés ici, avec leur date, leur lieu et leurs horaires.</p></header>
${evenementsHtml(L, 2)}
${actualites.length ? `<section class="bloc" aria-labelledby="t-pub"><h2 id="t-pub">Publications</h2>${actualites
      .map((a) => `<article class="actualite"><p class="evenement-date"><time datetime="${a.date}">${dateLongue(a.date)}</time></p><h3>${esc(a.titre)}</h3><div class="prose-courte">${md(a.body)}</div></article>`)
      .join('')}</section>` : ''}`,
  });
}

function pageParticiper() {
  if (!site.participer.actif) return;
  const s = site.participer;
  page('participer/', {
    id: 'participer',
    titre: 'Participer',
    description: 'Adhérer, devenir bénévole ou transmettre des documents : les modalités confirmées par l’association.',
    contenu: (L) => `${fil(L, [{ label: 'Accueil', route: '' }, { label: 'Participer', route: 'participer/' }])}
<header class="page-tete"><h1>Participer</h1></header>
<div class="prose">
${s.adhesion ? `<h2>Adhérer</h2>${md(s.adhesion)}` : ''}
${s.benevolat ? `<h2>Être bénévole</h2>${md(s.benevolat)}` : ''}
${s.transmissionDocuments ? `<h2>Transmettre des documents</h2>${md(s.transmissionDocuments)}` : ''}
</div>`,
  });
}

function formulaireHtml() {
  const f = site.contact.formulaire;
  if (!f.actif || !f.endpoint) return '';
  return `<form id="formulaire-contact" class="formulaire" action="${esc(f.endpoint)}" method="post" novalidate data-endpoint="${esc(f.endpoint)}">
  <p class="form-aide">Tous les champs sont obligatoires.</p>
  <div class="champ"><label for="c-nom">Nom et prénom</label><input id="c-nom" name="nom" type="text" autocomplete="name" required maxlength="120" aria-describedby="c-nom-err"><p class="erreur" id="c-nom-err" hidden></p></div>
  <div class="champ"><label for="c-email">Adresse électronique</label><p class="aide" id="c-email-aide">Utilisée uniquement pour vous répondre.</p><input id="c-email" name="email" type="email" autocomplete="email" required maxlength="200" aria-describedby="c-email-aide c-email-err"><p class="erreur" id="c-email-err" hidden></p></div>
  <div class="champ"><label for="c-objet">Objet</label><select id="c-objet" name="objet" required aria-describedby="c-objet-err">
    <option value="">Choisir…</option>
    <option>Question sur un combattant</option>
    <option>Proposer un document</option>
    <option>Signaler une erreur</option>
    <option>Autre demande</option>
  </select><p class="erreur" id="c-objet-err" hidden></p></div>
  <div class="champ"><label for="c-message">Message</label><textarea id="c-message" name="message" rows="7" required minlength="10" maxlength="5000" aria-describedby="c-message-err"></textarea><p class="erreur" id="c-message-err" hidden></p></div>
  <div class="piege" aria-hidden="true"><label for="c-site">Laisser ce champ vide</label><input id="c-site" name="_gotcha" type="text" tabindex="-1" autocomplete="off"></div>
  <input type="hidden" name="debut" value="">
  <p class="form-rgpd">Vos données servent uniquement à traiter votre demande. Voir la page <a href="${'{{L_CONF}}'}">Confidentialité</a>.</p>
  <button class="bouton" type="submit">Envoyer le message</button>
  <div class="form-statut" role="status" aria-live="polite" tabindex="-1"></div>
</form>`;
}

function pageContact() {
  if (!contactActif) return;
  const c = site.contact;
  page('contact/', {
    id: 'contact',
    titre: 'Contact',
    description: `Contacter ${site.association.denomination || site.nom} : coordonnées et formulaire.`,
    contenu: (L) => `${fil(L, [{ label: 'Accueil', route: '' }, { label: 'Contact', route: 'contact/' }])}
<header class="page-tete"><h1>Contact</h1><p class="chapeau">Une question sur un combattant, un document à signaler, une erreur à corriger : écrivez-nous.</p></header>
<div class="section-deux">
  <section aria-labelledby="t-coord"><h2 id="t-coord">Coordonnées</h2>
    ${c.email || c.telephone || c.adressePostale ? `<dl class="fiche-archive">
      ${c.email ? `<div><dt>Courriel</dt><dd><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></dd></div>` : ''}
      ${c.telephone ? `<div><dt>Téléphone</dt><dd><a href="tel:${esc(c.telephone.replace(/\s/g, ''))}">${esc(c.telephone)}</a></dd></div>` : ''}
      ${c.adressePostale ? `<div><dt>Adresse postale</dt><dd>${esc(c.adressePostale)}</dd></div>` : ''}
    </dl>` : '<p>Les coordonnées postales et téléphoniques seront publiées après validation.</p>'}
  </section>
  <section aria-labelledby="t-form"><h2 id="t-form">Écrire un message</h2>
    ${formulaireHtml().replace('{{L_CONF}}', L('confidentialite/')) || '<p>Le formulaire en ligne n’est pas encore activé.</p>'}
  </section>
  ${formulaireHtml() ? `<script src="${L('assets/formulaire.js')}" defer></script>` : ''}
</div>`,
  });
}

function pageAPropos() {
  const p = pages.projet;
  const a = site.association;
  const titre = a.identiteConfirmee ? 'L’association' : p.titre;
  page('a-propos/', {
    id: 'a-propos',
    titre,
    description: p.description_seo,
    jsonLd: a.identiteConfirmee
      ? { '@context': 'https://schema.org', '@type': 'NGO', name: a.denomination, url: `${BASE}/`, ...(a.dateCreation ? { foundingDate: a.dateCreation } : {}) }
      : undefined,
    contenu: (L) => `${fil(L, [{ label: 'Accueil', route: '' }, { label: titre, route: 'a-propos/' }])}
<header class="page-tete"><h1>${esc(titre)}</h1><p class="chapeau">${esc(p.chapeau)}</p></header>
${a.identiteConfirmee ? `<section class="section" aria-labelledby="t-identite"><h2 id="t-identite">Identité</h2><dl class="fiche-archive">
  ${[
    ['Dénomination', a.denomination],
    ['Forme juridique', a.formeJuridique],
    ['Numéro RNA', a.numeroRNA],
    ['Siège', a.siegeSocial],
    ['Création', a.dateCreation],
    ['Objet', a.objet],
  ]
    .filter(([, v]) => v)
    .map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`)
    .join('')}
</dl></section>` : ''}
${a.responsables?.length ? `<section class="section" aria-labelledby="t-resp"><h2 id="t-resp">Responsables</h2><ul class="personnes">${a.responsables.map((r) => `<li><span class="personne-nom">${esc(r.nom)}</span> <span class="personne-role">${esc(r.fonction)}</span></li>`).join('')}</ul></section>` : ''}
${a.partenaires?.length ? `<section class="section" aria-labelledby="t-part"><h2 id="t-part">Partenaires</h2><ul class="personnes">${a.partenaires.map((r) => `<li>${r.url ? `<a href="${esc(r.url)}">${esc(r.nom)}</a>` : esc(r.nom)}</li>`).join('')}</ul></section>` : ''}
${a.documentsOfficiels?.length ? `<section class="section" aria-labelledby="t-docoff"><h2 id="t-docoff">Documents officiels</h2><ul>${a.documentsOfficiels.map((d) => `<li><a href="${L(`media/${esc(d.fichier)}`)}">${esc(d.titre)}</a></li>`).join('')}</ul></section>` : ''}
<div class="prose">${md(p.body)}</div>`,
  });
}

const enAttente = 'Information en cours de validation par l’association.';
function remplacer(texte, L) {
  const c = site.contact;
  const a = site.association;
  const moyen = c.email ? `par courriel à ${c.email}` : contactActif ? 'via la page Contact' : '';
  const vals = {
    editeur: a.identiteConfirmee
      ? [a.denomination, a.formeJuridique, a.siegeSocial, a.numeroRNA && `RNA ${a.numeroRNA}`, c.email].filter(Boolean).join(' — ')
      : enAttente,
    directeur_publication: site.directeurPublication || enAttente,
    hebergeur: site.hebergeur?.nom ? [site.hebergeur.nom, site.hebergeur.adresse, site.hebergeur.contact].filter(Boolean).join(' — ') : enAttente,
    contact_signalement: moyen ? `Signalez-la ${moyen}.` : 'Un moyen de contact sera publié prochainement.',
    contact_droits: moyen ? `Pour exercer ces droits, écrivez ${moyen}.` : '',
    formulaire_confidentialite:
      site.contact.formulaire.actif && site.contact.formulaire.endpoint
        ? `Le formulaire de contact transmet votre nom, votre adresse électronique, l’objet et le message au service ${site.contact.formulaire.fournisseur || 'd’envoi configuré'}, qui les remet à l’association. Ces données servent uniquement à répondre à votre demande (intérêt légitime) et sont supprimées au plus tard un an après le dernier échange. Elles ne sont ni publiées, ni cédées.`
        : 'Aucun formulaire n’est actif sur le site pour le moment : aucune donnée personnelle n’est collectée.',
  };
  return texte.replace(/\{\{(\w+)\}\}/g, (_, k) => vals[k] ?? '');
}

function pagesLegales() {
  for (const [slug, id] of [['mentions-legales', 'mentions-legales'], ['confidentialite', 'confidentialite']]) {
    const p = pages[slug];
    page(`${slug}/`, {
      id,
      titre: p.titre,
      description: p.description_seo,
      contenu: (L) => `${fil(L, [{ label: 'Accueil', route: '' }, { label: p.titre, route: `${slug}/` }])}
<header class="page-tete"><h1>${esc(p.titre)}</h1><p class="chapeau">${esc(p.chapeau)}</p></header>
<div class="prose">${md(remplacer(p.body, L))}</div>`,
    });
  }

  page('credits/', {
    id: 'credits',
    titre: 'Crédits',
    description: 'Provenance et conditions de réutilisation des images, polices et textes du site.',
    contenu: (L) => `${fil(L, [{ label: 'Accueil', route: '' }, { label: 'Crédits', route: 'credits/' }])}
<header class="page-tete"><h1>Crédits</h1><p class="chapeau">Provenance des documents reproduits et des ressources utilisées.</p></header>
<div class="prose">
<h2>Documents et photographies</h2>
<ul>${documents.map((d) => `<li><a href="${L(`archives/${d.slug}/`)}">${esc(d.titre)}</a> — ${esc(d.auteur)}. ${esc(d.provenance)}. ${esc(d.droits)} ${d.credit ? `Crédit : ${esc(d.credit)}.` : ''} <a href="${esc(d.url_source)}">Notice d’origine</a>.</li>`).join('')}</ul>
<h2>Sources des articles</h2>
<p>Les sources de chaque article sont citées en fin de page, avec un lien vers le document lorsqu’il est consultable en ligne.</p>
<h2>Polices de caractères</h2>
<ul>
<li>Source Serif 4 — Frank Grießhammer / Adobe, licence SIL Open Font License 1.1.</li>
<li>Atkinson Hyperlegible Next — Braille Institute of America, licence SIL Open Font License 1.1.</li>
<li>IBM Plex Mono — IBM Corp., licence SIL Open Font License 1.1.</li>
</ul>
<p>Les polices sont hébergées avec le site : aucune requête n’est envoyée à un service tiers.</p>
</div>`,
  });
}

function page404() {
  page('404.html', {
    id: '404',
    fichier: '404.html',
    titre: 'Page introuvable',
    description: 'Cette page n’existe pas ou a été déplacée.',
    noindex: true,
    contenu: (L) => `<header class="page-tete"><h1>Page introuvable</h1><p class="chapeau">Cette adresse ne correspond à aucune page du site. Elle a peut-être été déplacée.</p></header>
<ul class="actions"><li><a class="bouton" href="${L('')}">Retour à l’accueil</a></li><li><a class="bouton bouton-second" href="${L('histoire/')}">Articles d’histoire locale</a></li></ul>`,
  });
}

// ---------------------------------------------------------------- statique, plan du site, admin
function copierStatique() {
  fs.cpSync(path.join(ROOT, 'static'), OUT, { recursive: true });
  if (PREVIEW) fs.rmSync(path.join(OUT, 'admin'), { recursive: true, force: true });
}
function planDuSite() {
  const urls = ecrits.filter((e) => !e.noindex).map((e) => `  <url><loc>${BASE}/${e.route}</loc></url>`);
  fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
  fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nDisallow: /admin/\n\nSitemap: ${BASE}/sitemap.xml\n`);
}

// ---------------------------------------------------------------- exécution
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
copierStatique();
const images = await traiterImages();
pageAccueil(images);
pagesHistoire();
pagesCombattants();
pagesArchives(images);
pageActualites();
pageParticiper();
pageContact();
pageAPropos();
pagesLegales();
page404();
planDuSite();
fs.writeFileSync(path.join(ROOT, PREVIEW ? 'rapport-build-preview.json' : 'rapport-build.json'), JSON.stringify({ date: new Date().toISOString(), pages: ecrits.map((e) => e.cible), ...rapport }, null, 2));

console.log(`✔ ${ecrits.length} pages générées dans ${path.relative(ROOT, OUT)}/${PREVIEW ? ' (prévisualisation)' : ''}`);
if (rapport.refuses.length) console.log(`\n⚠ Contenus non publiés (incomplets) :\n  - ${rapport.refuses.join('\n  - ')}`);
if (rapport.brouillons.length) console.log(`\n• Brouillons non publiés :\n  - ${rapport.brouillons.join('\n  - ')}`);
if (rapport.aFournir.length) console.log(`\n• Informations à fournir :\n  - ${rapport.aFournir.join('\n  - ')}`);
