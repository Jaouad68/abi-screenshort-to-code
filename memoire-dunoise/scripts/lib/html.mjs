// Gabarits HTML du site. Aucune dépendance côté navigateur hormis assets/site.js (facultatif).
import { marked } from 'marked';

export const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
export function dateLongue(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d === 1 ? '1er' : d} ${MOIS[m - 1]} ${y}`;
}

marked.use({ gfm: true, breaks: false });

// [[2]] dans un texte → appel de note vers la source n° 2 de la liste en bas d'article.
export function md(texte = '') {
  const avecRefs = texte.replace(/\[\[(\d+)\]\]/g, '<sup class="ref"><a href="#source-$1" aria-label="Source $1">$1</a></sup>');
  return marked.parse(avecRefs);
}
export const mdInline = (t = '') => marked.parseInline(t);

// Construit une fonction de liens relatifs depuis une page donnée.
// mode « pretty » : liens vers dossier/ ; mode « explicite » : dossier/index.html (prévisualisation, file://).
export function linker(depth, explicite) {
  const prefix = depth === 0 ? '' : '../'.repeat(depth);
  const link = (route = '') => {
    if (route.endsWith('.xml') || route.endsWith('.html') || route.startsWith('assets/') || route.startsWith('media/') || route.startsWith('fonts/')) return prefix + route;
    if (explicite) return `${prefix}${route}index.html`;
    return prefix + route || './';
  };
  return link;
}

export function picture(img, { sizes, alt, eager = false, cls = '' }, L) {
  if (!img) return '';
  const srcset = (fmt) => img.variants.map((v) => `${L(`media/${v.fichier}.${fmt}`)} ${v.largeur}w`).join(', ');
  const plus = img.variants[img.variants.length - 1];
  return `<picture${cls ? ` class="${cls}"` : ''}>
  <source type="image/webp" srcset="${srcset('webp')}" sizes="${sizes}">
  <img src="${L(`media/${plus.fichier}.jpg`)}" srcset="${srcset('jpg')}" sizes="${sizes}" width="${img.largeur}" height="${img.hauteur}" alt="${esc(alt)}"${eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async">
</picture>`;
}

export function layout({ site, nav, courant, titre, description, canonical, contenu, L, jsonLd, ogImage, noindex, fragment }) {
  const titreComplet = courant === 'accueil' ? `${site.nom} — Combattants de 1914–1918 à Châteaudun` : `${titre} · ${site.nom}`;
  const lienNav = (n) =>
    `<li><a href="${L(n.route)}"${n.id === courant ? ' aria-current="page"' : ''}>${esc(n.label)}</a></li>`;
  const head = `<title>${esc(titreComplet)}</title>
<meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex">' : ''}
${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ''}
<meta property="og:type" content="website">
<meta property="og:locale" content="fr_FR">
<meta property="og:site_name" content="${esc(site.nom)}">
<meta property="og:title" content="${esc(titre)}">
<meta property="og:description" content="${esc(description)}">
${canonical ? `<meta property="og:url" content="${esc(canonical)}">` : ''}
${ogImage ? `<meta property="og:image" content="${esc(ogImage)}">` : ''}
<meta name="theme-color" content="#16233d">
<link rel="icon" href="${L('assets/favicon.svg')}" type="image/svg+xml">
<link rel="preload" href="${L('fonts/source-serif-4-latin-wght-normal.woff2')}" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${L('fonts/atkinson-hyperlegible-next-latin-400-normal.woff2')}" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${L('assets/site.css')}">
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>` : ''}`;

  const corps = `<a class="evitement" href="#contenu">Aller au contenu</a>
${site.previsualisation ? `<div class="bandeau-previsu" role="note"><p>Version de prévisualisation, en attente de validation par l’association.</p></div>` : ''}
<header class="entete">
  <div class="entete-inner">
    <a class="marque" href="${L('')}"${courant === 'accueil' ? ' aria-current="page"' : ''}>
      <span class="marque-nom">${esc(site.nom)}</span>
      <span class="marque-sous">${esc(site.sousTitre)}</span>
    </a>
    <button class="menu-bouton" type="button" aria-expanded="false" aria-controls="navigation" hidden>Menu</button>
    <nav id="navigation" class="nav" aria-label="Navigation principale">
      <ul>${nav.map(lienNav).join('')}</ul>
    </nav>
  </div>
</header>
<main id="contenu" tabindex="-1">
${contenu}
</main>
<footer class="pied">
  <div class="pied-inner">
    <div class="pied-marque">
      <p class="pied-nom">${esc(site.nom)}</p>
      <p>Mémoire et transmission de l’histoire des combattants de 1914–1918 liés à Châteaudun.</p>
    </div>
    <nav aria-label="Informations du site">
      <ul class="pied-liens">
        ${nav.map(lienNav).join('')}
        <li><a href="${L('credits/')}"${courant === 'credits' ? ' aria-current="page"' : ''}>Crédits</a></li>
        <li><a href="${L('mentions-legales/')}"${courant === 'mentions-legales' ? ' aria-current="page"' : ''}>Mentions légales</a></li>
        <li><a href="${L('confidentialite/')}"${courant === 'confidentialite' ? ' aria-current="page"' : ''}>Confidentialité</a></li>
      </ul>
    </nav>
  </div>
</footer>
<script src="${L('assets/site.js')}" defer></script>`;

  if (fragment) return `${head}\n${corps}\n`;
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${head}
</head>
<body>
${corps}
</body>
</html>
`;
}

// Liste de sources numérotée, cible des appels [[n]].
export function listeSources(sources = [], titre = 'Sources') {
  if (!sources.length) return '';
  return `<section class="sources" aria-labelledby="titre-sources">
  <h2 id="titre-sources">${esc(titre)}</h2>
  <ol>
    ${sources
      .map(
        (s, i) => `<li id="source-${i + 1}">
      <span class="source-num" aria-hidden="true">${i + 1}</span>
      <div>
        <p class="source-titre">${s.url ? `<a href="${esc(s.url)}">${esc(s.titre)}</a>` : esc(s.titre)}</p>
        <p class="source-meta">${[s.auteur, s.editeur].filter(Boolean).map(esc).join(' · ')}</p>
        <p class="source-nature">${esc(s.nature || '')}${s.consulte ? ` · consulté le ${dateLongue(typeof s.consulte === 'string' ? s.consulte : s.consulte.toISOString().slice(0, 10))}` : ''}</p>
      </div>
    </li>`,
      )
      .join('\n')}
  </ol>
</section>`;
}
