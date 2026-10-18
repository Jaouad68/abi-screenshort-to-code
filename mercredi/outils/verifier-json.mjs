// Vérifie data/dessins-animes.json avant publication.
// Usage : node outils/verifier-json.mjs   (depuis le dossier mercredi)
import { readFileSync } from "node:fs";

const fichier = new URL("../data/dessins-animes.json", import.meta.url);
const erreurs = [];
const avertissements = [];

let json;
try {
  json = JSON.parse(readFileSync(fichier, "utf8"));
} catch (e) {
  console.error(`JSON invalide : ${e.message}`);
  process.exit(1);
}

const liste = json.dessinsAnimes;
if (!Array.isArray(liste)) {
  console.error("La clé « dessinsAnimes » doit être une liste.");
  process.exit(1);
}

const CHAMPS_A_VERIFIER = ["date", "chaine", "emission", "studio", "pays"];
const SOURCES_EXTRAITS = ["youtube", "dailymotion", "ina"];
const ids = new Set();

for (const [i, d] of liste.entries()) {
  const ici = `#${i + 1} ${d.id || "(sans id)"}`;
  if (!d.id || !/^[a-z0-9-]+$/.test(d.id)) erreurs.push(`${ici} : « id » en minuscules, chiffres et tirets uniquement.`);
  if (ids.has(d.id)) erreurs.push(`${ici} : id en double.`);
  ids.add(d.id);
  if (!d.titre) erreurs.push(`${ici} : « titre » obligatoire.`);
  if (!Array.isArray(d.pays)) erreurs.push(`${ici} : « pays » doit être une liste.`);

  const p = d.premiereDiffusion || {};
  if (p.date && !/^\d{4}(-\d{2}(-\d{2})?)?$/.test(p.date)) erreurs.push(`${ici} : date au format AAAA, AAAA-MM ou AAAA-MM-JJ.`);
  if (p.annee != null && !Number.isInteger(p.annee)) erreurs.push(`${ici} : « annee » doit être un nombre ou null.`);
  if (p.date && p.annee && !p.date.startsWith(String(p.annee))) erreurs.push(`${ici} : « annee » ne correspond pas à « date ».`);
  if (p.annee && (p.annee < 1975 || p.annee > 1987) && !d.notes) avertissements.push(`${ici} : première diffusion hors 1975-1987 (${p.annee}), à justifier dans « notes ».`);

  const g = d.generique || {};
  if (g.youtube && !/^[\w-]{11}$/.test(g.youtube)) erreurs.push(`${ici} : generique.youtube doit être l'identifiant à 11 caractères.`);
  if (g.dailymotion && !/^[a-z0-9]{5,12}$/i.test(g.dailymotion)) erreurs.push(`${ici} : generique.dailymotion doit être l'identifiant de la vidéo.`);
  if (g.ina && !/^https:\/\/(www\.|player\.)?ina\.fr\//.test(g.ina)) erreurs.push(`${ici} : generique.ina doit être une adresse https://www.ina.fr/… ou https://player.ina.fr/…`);

  for (const e of d.extraits || []) {
    if (!SOURCES_EXTRAITS.includes(e.source)) erreurs.push(`${ici} : extrait avec une source inconnue (${e.source}).`);
    if (!e.id && !e.url) erreurs.push(`${ici} : extrait sans « id » ni « url ».`);
  }
  for (const c of d.aVerifier || []) {
    if (!CHAMPS_A_VERIFIER.includes(c)) erreurs.push(`${ici} : aVerifier contient « ${c} » (valeurs possibles : ${CHAMPS_A_VERIFIER.join(", ")}).`);
  }
  if (!(d.sources || []).length) avertissements.push(`${ici} : aucune source citée.`);
  if (!d.description) avertissements.push(`${ici} : description vide.`);
}

avertissements.forEach((a) => console.warn(`⚠ ${a}`));
erreurs.forEach((e) => console.error(`✗ ${e}`));
const jouables = liste.filter((d) => d.generique?.youtube || d.generique?.dailymotion || d.generique?.ina).length;
console.log(`${liste.length} dessins animés, ${jouables} avec un générique, ${erreurs.length} erreur(s), ${avertissements.length} avertissement(s).`);
process.exit(erreurs.length ? 1 : 0);
