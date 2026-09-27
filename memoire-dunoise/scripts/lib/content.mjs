// Chargement et validation des contenus éditables (dossier content/).
// Un contenu incomplet n'est jamais publié : il est écarté et signalé dans le rapport de build.
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

export const CONTENT_DIR = path.resolve(import.meta.dirname, '../../content');

function readCollection(dir) {
  const full = path.join(CONTENT_DIR, dir);
  if (!fs.existsSync(full)) return [];
  return fs
    .readdirSync(full)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => {
      const { data, content } = matter(fs.readFileSync(path.join(full, f), 'utf8'));
      return { ...data, slug: data.slug || f.replace(/\.md$/, ''), body: content.trim(), fichier: `${dir}/${f}` };
    });
}

function readPage(name) {
  const file = path.join(CONTENT_DIR, 'pages', `${name}.md`);
  const { data, content } = matter(fs.readFileSync(file, 'utf8'));
  return { ...data, body: content.trim() };
}

// gray-matter convertit les dates YAML en objets Date : on revient à une chaîne AAAA-MM-JJ.
export function isoDate(v) {
  if (!v) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

const nonVide = (v) => (Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && String(v).trim() !== '');

// Champs obligatoires par collection : sans eux, le contenu reste hors ligne.
const REGLES = {
  articles: ['titre', 'resume', 'portee', 'sources'],
  documents: ['titre', 'image', 'alt', 'date', 'datation', 'provenance', 'droits', 'url_source'],
  combattants: ['nom', 'prenoms', 'lien_chateaudun', 'references'],
  evenements: ['titre', 'date', 'lieu', 'heure_debut'],
  actualites: ['titre', 'date'],
};

function filtrerPublies(items, collection, rapport) {
  return items.filter((item) => {
    if (item.statut !== 'publie') {
      rapport.brouillons.push(`${item.fichier} (statut : ${item.statut || 'non renseigné'})`);
      return false;
    }
    const manquants = REGLES[collection].filter((champ) => !nonVide(item[champ]));
    if (manquants.length) {
      rapport.refuses.push(`${item.fichier} — champs manquants : ${manquants.join(', ')}`);
      return false;
    }
    return true;
  });
}

export function loadContent({ override } = {}) {
  const rapport = { brouillons: [], refuses: [], aFournir: [] };
  let site = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'site.json'), 'utf8'));
  if (override) site = deepMerge(site, override);

  const articles = filtrerPublies(readCollection('articles'), 'articles', rapport).map((a) => ({
    ...a,
    date_publication: isoDate(a.date_publication),
    mise_a_jour: isoDate(a.mise_a_jour),
  }));
  articles.sort((a, b) => (a.ordre ?? 99) - (b.ordre ?? 99) || b.date_publication.localeCompare(a.date_publication));

  const documents = filtrerPublies(readCollection('documents'), 'documents', rapport);
  documents.sort((a, b) => (a.ordre ?? 99) - (b.ordre ?? 99));

  const combattants = filtrerPublies(readCollection('combattants'), 'combattants', rapport);
  combattants.sort((a, b) => `${a.nom} ${a.prenoms}`.localeCompare(`${b.nom} ${b.prenoms}`, 'fr'));

  const evenements = filtrerPublies(readCollection('evenements'), 'evenements', rapport).map((e) => ({ ...e, date: isoDate(e.date) }));
  const actualites = filtrerPublies(readCollection('actualites'), 'actualites', rapport)
    .map((a) => ({ ...a, date: isoDate(a.date) }))
    .sort((a, b) => b.date.localeCompare(a.date));

  const pages = Object.fromEntries(
    ['accueil', 'projet', 'histoire', 'retrouver-un-combattant', 'mentions-legales', 'confidentialite'].map((n) => [n, readPage(n)]),
  );

  // Informations manquantes : listées pour l'administrateur, jamais inventées sur le site.
  const a = site.association;
  if (!a.identiteConfirmee) rapport.aFournir.push('Identité officielle de l’association (dénomination exacte, forme juridique, n° RNA, siège, date de création, objet statutaire)');
  if (!a.responsables?.length) rapport.aFournir.push('Responsables à publier (noms et fonctions, avec leur accord)');
  if (!site.directeurPublication) rapport.aFournir.push('Directeur ou directrice de la publication (mentions légales)');
  if (!site.hebergeur?.nom) rapport.aFournir.push('Hébergeur : nom, adresse, téléphone (mentions légales)');
  if (!site.contact.email && !site.contact.telephone && !site.contact.adressePostale) rapport.aFournir.push('Coordonnées de contact validées');
  if (!site.contact.formulaire.actif || !site.contact.formulaire.endpoint) rapport.aFournir.push('Destination du formulaire de contact (service d’envoi à choisir) — formulaire désactivé');
  if (!site.participer.actif) rapport.aFournir.push('Modalités confirmées pour adhérer, être bénévole ou transmettre des documents — rubrique « Participer » masquée');
  if (!evenements.length) rapport.aFournir.push('Aucun événement validé — rubrique « Actualités » masquée');
  if (!combattants.length) rapport.aFournir.push('Aucune fiche de combattant vérifiée — seule la méthode de recherche est publiée');

  return { site, articles, documents, combattants, evenements, actualites, pages, rapport };
}

function deepMerge(a, b) {
  if (Array.isArray(b) || typeof b !== 'object' || b === null) return b;
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = k in a ? deepMerge(a[k], v) : v;
  return out;
}
