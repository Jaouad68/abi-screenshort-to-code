#!/usr/bin/env node
/**
 * Récupère la liste à jour des lycées du Val d'Oise depuis l'Annuaire de
 * l'Éducation nationale et affiche les lignes à coller dans
 * src/data/lycees.ts (tableau ROWS).
 *
 * Usage : npm run import:lycees
 */

const API =
  "https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-annuaire-education/records";

const params = new URLSearchParams({
  select:
    "identifiant_de_l_etablissement,nom_etablissement,statut_public_prive,nom_commune,latitude,longitude,voie_generale,voie_technologique,voie_professionnelle",
  where: 'code_departement="095" and type_etablissement="Lycée"',
  limit: "100",
});

const res = await fetch(`${API}?${params}`);
if (!res.ok) {
  console.error(`Erreur HTTP ${res.status}`);
  process.exit(1);
}
const { total_count, results } = await res.json();
if (total_count > 100) console.warn(`⚠️  ${total_count} résultats : il faut paginer (offset).`);

const rows = results
  // Les SEP sont rattachées à un lycée polyvalent déjà présent.
  .filter((r) => !/^Section d'enseignement professionnel/i.test(r.nom_etablissement))
  .map((r) => {
    const voies = [
      r.voie_generale === "1" ? "G" : "",
      r.voie_technologique === "1" ? "T" : "",
      r.voie_professionnelle === "1" ? "P" : "",
    ].join("");
    const round = (n) => Math.round(n * 1e6) / 1e6;
    return `  [${JSON.stringify(r.identifiant_de_l_etablissement)}, ${JSON.stringify(r.nom_etablissement)}, ${JSON.stringify(
      r.nom_commune,
    )}, ${r.statut_public_prive === "Privé" ? 1 : 0}, ${JSON.stringify(voies)}, ${round(r.latitude)}, ${round(r.longitude)}],`;
  });

console.log(rows.join("\n"));
console.error(`\n✓ ${rows.length} établissements (sur ${total_count}, SEP exclues).`);
console.error("Pense à relire les noms longs (« Lycée des métiers… ») avant de coller.");
