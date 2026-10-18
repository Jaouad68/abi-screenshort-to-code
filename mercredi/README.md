# Mercredi 75-87

Application web monopage (HTML, CSS, JavaScript, sans backend) qui recense les dessins
animés diffusés à la télévision française entre 1975 et 1987 : TF1, Antenne 2, FR3,
Canal+, La Cinq, et des émissions comme Récré A2, Croque-Vacances ou Cabou Cadin.

## Fonctionnalités

- Catalogue en grille, vignettes générées façon écran cathodique (aucune image protégée hébergée)
- Recherche par titre français ou original, sans tenir compte des accents
- Filtres : année de première diffusion, chaîne, émission, pays d'origine
- Fiche détaillée (adresse partageable `#/dessin-anime/<id>`) avec lecteur intégré dans un téléviseur
- Juke-box des génériques : lecture en continu, suivant / précédent, aléatoire, tous ou favoris
- Favoris enregistrés dans le navigateur (`localStorage`)
- Responsive, utilisable au doigt sur mobile

## Contrainte légale

Aucun fichier audio ou vidéo n'est hébergé. L'application n'affiche que des intégrations
YouTube, Dailymotion ou INA renseignées dans le JSON, et « Non disponible » sinon.
N'ajoutez une vidéo que si elle est publiée par un ayant droit (chaîne officielle du
studio, du distributeur, de la chaîne de télévision, ou l'INA). Les mises en ligne
d'amateurs ne sont pas des sources légales.

## Lancer en local

```bash
cd mercredi
python3 -m http.server 8000
```

Puis ouvrir http://localhost:8000. Le navigateur refuse de lire le JSON si l'on ouvre
`index.html` directement depuis le disque : il faut passer par un petit serveur.

Mise en ligne : n'importe quel hébergement statique (Vercel avec `vercel.json`, Netlify,
GitHub Pages).

## État des données

`data/dessins-animes.json` contient 40 dessins animés. Les dates, chaînes et émissions
ont été recoupées avec des sources secondaires (encyclopédies, bases de séries, presse),
citées dans chaque fiche. Quand une information n'a pas pu être confirmée ou que les
sources se contredisent, le champ est listé dans `aVerifier` et l'application affiche
un badge « à vérifier ». Rien n'a été comblé par supposition : un champ inconnu reste vide.

Aucun générique n'est encore renseigné : je n'ai trouvé, pour ces séries, que des mises en
ligne d'amateurs sur YouTube et Dailymotion. Trois fiches renvoient vers des archives
officielles de l'INA (Goldorak, Albator, Les Mystérieuses Cités d'or).

---

## Notice : ajouter un dessin animé

1. Ouvrez `data/dessins-animes.json` et copiez ce modèle dans la liste `dessinsAnimes`
   (n'importe où : l'application trie par titre). Séparez-le des autres fiches par une virgule.

```json
{
  "id": "mon-dessin-anime",
  "titre": "Titre français",
  "titreOriginal": "Titre original",
  "pays": ["Japon"],
  "studio": "Nom du studio",
  "premiereDiffusion": { "date": "1984-09-12", "annee": 1984, "chaine": "TF1", "emission": "Croque-Vacances" },
  "description": "Deux ou trois phrases.",
  "image": "",
  "couleurs": ["#1d3fa8", "#e8262b"],
  "generique": { "youtube": "", "dailymotion": "", "ina": "" },
  "extraits": [],
  "episodes": [],
  "aVerifier": [],
  "notes": "",
  "sources": ["https://…"]
}
```

2. Remplissez les champs :

| Champ | Contenu |
| --- | --- |
| `id` | Identifiant unique en minuscules et tirets, il sert d'adresse à la fiche |
| `pays` | Une liste, même pour un seul pays : `["France", "Japon"]` |
| `premiereDiffusion.date` | `AAAA-MM-JJ`, `AAAA-MM` ou `AAAA` selon ce que l'on sait, `""` si inconnu |
| `premiereDiffusion.annee` | L'année en nombre (sert au filtre), ou `null` si inconnue |
| `chaine`, `emission` | Écrits exactement comme dans les autres fiches (« Antenne 2 », « Récré A2 »), sinon le filtre crée une nouvelle entrée |
| `image` | Facultatif : chemin d'une image libre de droits (par exemple `images/mon-dessin-anime.jpg`) ; vide = vignette générée |
| `couleurs` | Deux couleurs de la vignette générée |
| `generique.youtube` | L'identifiant de 11 caractères (ce qui suit `v=` dans l'adresse) |
| `generique.dailymotion` | L'identifiant de la vidéo (par exemple `x10okq0`) |
| `generique.ina` | Une page `https://www.ina.fr/…` (lien) ou un lecteur `https://player.ina.fr/…` (intégré) |
| `extraits` | `{ "titre": "…", "source": "youtube" \| "dailymotion" \| "ina", "id": "…" }` ou avec `"url"` |
| `episodes` | `{ "titre": "Intégrale", "plateforme": "France TV", "url": "https://…" }`, seulement sur des plateformes légales |
| `aVerifier` | Les champs non confirmés parmi `date`, `chaine`, `emission`, `studio`, `pays` |
| `sources` | Les adresses qui justifient les informations |

3. Vérifiez le fichier, puis rechargez la page :

```bash
node outils/verifier-json.mjs
```

Le script signale une virgule manquante, un identifiant en double, une date mal écrite
ou un identifiant vidéo invalide. Le juke-box prend automatiquement chaque fiche qui a un
`generique.youtube`.
