// Génère data/countries.js : tracés SVG pré-projetés, noms FR, continent et surface
// de chaque pays. À relancer seulement si on change de projection ou de source.
// Usage : npm install && npm run build:map
import { writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { feature, mergeArcs } from "topojson-client";
import { presimplify, simplify, quantile } from "topojson-simplify";
import { geoNaturalEarth1, geoPath, geoArea } from "d3-geo";
import iso from "i18n-iso-countries";
import { countries as countryList } from "countries-list";

const require = createRequire(import.meta.url);
const topo = require("world-atlas/countries-50m.json");
iso.registerLocale(require("i18n-iso-countries/langs/fr.json"));

// Pays sans code ISO dans Natural Earth : code maison, nom et continent à la main.
const SANS_ISO = {
  Somaliland: { code: "XS", name: "Somaliland", continent: "AF" },
  Kosovo: { code: "XK", name: "Kosovo", continent: "EU" },
  "N. Cyprus": { code: "XC", name: "Chypre du Nord", continent: "EU" },
  "Indian Ocean Ter.": null,
  "Siachen Glacier": null,
};
const CONTINENTS = { AF: "Afrique", AS: "Asie", EU: "Europe", NA: "Amérique du Nord", SA: "Amérique du Sud", OC: "Océanie" };
// Noms plus courts ou plus courants que ceux du paquet i18n.
// Le Sahara marocain (Natural Earth : « W. Sahara », 732) est rattaché au Maroc (504) :
// un seul tracé, sans frontière intérieure, colorié en entier quand le Maroc est visité.
{
  const geoms = topo.objects.countries.geometries;
  const parts = geoms.filter((g) => g.id === "504" || g.id === "732");
  const maroc = { ...mergeArcs(topo, parts), id: "504", properties: { name: "Morocco" } };
  topo.objects.countries.geometries = [...geoms.filter((g) => !parts.includes(g)), maroc];
}

const NOMS = {
  US: "États-Unis", GB: "Royaume-Uni", RU: "Russie", KR: "Corée du Sud", KP: "Corée du Nord",
  CD: "RD Congo", CG: "Congo", IR: "Iran", SY: "Syrie", LA: "Laos", VN: "Vietnam", BO: "Bolivie",
  VE: "Venezuela", TZ: "Tanzanie", MD: "Moldavie", MK: "Macédoine du Nord", CZ: "Tchéquie",
  PS: "Palestine", FM: "Micronésie", TW: "Taïwan", BN: "Brunei", VA: "Vatican", FK: "Malouines",
  CI: "Côte d'Ivoire", MM: "Birmanie", SZ: "Eswatini", BA: "Bosnie-Herzégovine",
};

const simplified = simplify(presimplify(topo), quantile(presimplify(topo), 0.45));
const fc = feature(simplified, simplified.objects.countries);
const projection = geoNaturalEarth1().fitExtent([[4, 4], [996, 516]], {
  type: "FeatureCollection",
  features: fc.features.filter((f) => f.id !== "010"),
});
const path = geoPath(projection).digits(1);

const out = [];
for (const f of fc.features) {
  if (f.id === "010") continue; // Antarctique : ni sur la carte ni dans le %
  let code, name, continent;
  if (!f.id) {
    const m = SANS_ISO[f.properties.name];
    if (!m) continue;
    ({ code, name, continent } = m);
  } else {
    code = iso.numericToAlpha2(f.id);
    name = NOMS[code] || iso.getName(code, "fr", { select: "official" }) || f.properties.name;
    continent = countryList[code]?.continent;
  }
  if (!continent || continent === "AN") continue; // îles subantarctiques
  const d = path(f);
  if (!d) continue;
  // Surface réelle (sur la sphère) depuis la géométrie non simplifiée.
  const full = feature(topo, topo.objects.countries.geometries.find((g) => g.id === f.id && g.properties.name === f.properties.name));
  const area = geoArea(full) * 1e4;
  const dup = out.find((c) => c.code === code); // ex. îlots Ashmore rattachés à l'Australie
  if (dup) {
    dup.d += d;
    dup.area = +(dup.area + area).toFixed(3);
  } else {
    out.push({ code, name, continent, area: +area.toFixed(3), d });
  }
}
out.sort((a, b) => a.name.localeCompare(b.name, "fr"));

mkdirSync(new URL("../data/", import.meta.url), { recursive: true });
writeFileSync(
  new URL("../data/countries.js", import.meta.url),
  "// Fichier généré par scripts/build-map.mjs à partir de Natural Earth (domaine public).\n" +
    `window.CONTINENTS = ${JSON.stringify(CONTINENTS)};\n` +
    `window.COUNTRIES = ${JSON.stringify(out)};\n`,
);
console.log(`${out.length} pays écrits.`);
