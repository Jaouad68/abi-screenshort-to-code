# MargeZen

« Photographie ta facture fournisseur. En 30 secondes, tu sais quels plats de ta carte ne sont plus rentables. »

SaaS mobile-first pour restaurateurs indépendants français. Ce dossier est un
projet Next.js autonome, distinct de l'application déjà présente à la racine
du dépôt.

## Sprint 1 — Fondations et modèle de données

Ce qui est livré à ce stade :

- Next.js 15 (App Router) + TypeScript strict + Tailwind CSS 4.
- Migration SQL Supabase (`supabase/migrations/0001_init.sql`) : schéma
  complet (établissement, ingrédient, fournisseur, facture, plat, fiche
  technique, snapshot de marge...) et RLS stricte multi-tenant sur toutes
  les tables.
- Moteur de calcul pur `src/lib/marge.ts` (coût matière, marge brute,
  coefficient multiplicateur, prix conseillé, classement menu engineering),
  33 tests Vitest, 100 % de couverture.
- Test d'intégration RLS (`tests/integration/rls.test.ts`) qui applique la
  vraie migration sur un Postgres local jetable et prouve qu'un
  établissement ne voit jamais les données d'un autre.

## Sprint 2 — Extraction de facture par vision

Ce qui est livré à ce stade :

- `POST /api/factures/extraire` : reçoit une photo de facture (JPEG/PNG,
  10 Mo max), appelle Claude (`claude-sonnet-4-6`) en vision avec le prompt
  d'extraction, valide la réponse par schéma Zod, retente une fois avec un
  message de correction en cas d'échec, puis bascule en saisie manuelle —
  jamais de crash.
- Contrôle de cohérence (`lib/factures/coherence.ts`) : écart > 2 % entre
  la somme des lignes et le total déclaré → avertissement explicite.
- Rapprochement automatique des libellés fournisseur avec les ingrédients
  connus (`lib/factures/rapprochement.ts` + RPC trigramme
  `supabase/migrations/0002_rapprochement.sql`) : alias exact, puis
  similarité trigramme (seuil 0.4), puis proposition de création.
- Compression et normalisation d'image côté client
  (`lib/images/compression.ts`) : redimensionnement et ré-encodage
  systématique en JPEG (l'API vision n'accepte pas HEIC).
- Écran de validation (`/factures/[id]/valider`) : lignes triées et
  surlignées par confiance, édition en ligne au doigt (cibles ≥ 44px),
  bouton unique « Valider la facture ».
- 5 fixtures de réponses LLM (nominale, valeurs nulles, JSON malformé,
  balises de code parasites, document non reconnu) et tests du pipeline
  complet sans appel réseau (`lib/factures/extraction.test.ts`).

## Sprint 3 — Onboarding et fiches techniques

Le sprint le plus important du produit : si l'onboarding est long ou produit
des fiches fausses, le produit est mort. Traité avec un soin particulier.

- **Étape 1 — Import de carte** : `POST /api/carte/importer`, même
  discipline que l'extraction de facture (Zod strict, une relance, bascule
  manuelle). Un plat par ligne détectée, aucun prix inventé.
- **Étape 2 — Génération assistée de fiche technique** :
  `POST /api/plats/{id}/fiche-technique/proposer` — propose une composition
  (grammages professionnels, garniture et assaisonnement inclus) que le
  restaurateur corrige ensuite ; ne persiste rien tant que ce n'est pas
  validé. Chaque ingrédient proposé est rapproché des ingrédients déjà
  connus de l'établissement par nom normalisé.
- **Étape 3 — Écran de correction** (`/plats/{id}/fiche-technique`) :
  curseur + champ numérique par ingrédient, coût matière/marge/coefficient
  affichés en direct (réutilise `lib/marge.ts`, jamais un second calcul
  parallèle), bouton unique « Cette fiche est bonne » qui enchaîne
  automatiquement sur le plat suivant sans fiche.
- **Point de vigilance obligatoire** (fait avant l'écriture de l'écran) :
  voir `docs/validation-fiches.md` — validation de la crédibilité des
  grammages sur les 20 plats de référence de la spécification.
- Écrans `/carte` (liste des plats, avancement des fiches techniques) et
  `/carte/importer` (photo de la carte, enchaîne directement sur la
  première fiche technique à corriger).
- 99,3 % de couverture sur `lib/` (seuils v8 ciblés sur la logique propre,
  les wrappers réseau Anthropic/Supabase et les fonctions navigateur pur
  canvas sont explicitement exclus — voir `vitest.config.ts`).

## Installation

```bash
npm install
cp .env.example .env.local   # à compléter avec les clés Supabase et Anthropic
npm run dev
```

## Commandes

- `npm test` — tests unitaires (`src/`) et test d'intégration RLS
  (`tests/integration/`, nécessite un Postgres local sur `127.0.0.1:5432`,
  rôle `postgres` / mot de passe `postgres` ; ignoré proprement sinon).
- `npm run typecheck` — `tsc --noEmit` en mode strict.
- `npm run build` — build de production.
- `npm run lint` — ESLint.

## Base de données

Le fichier `supabase/migrations/0001_init.sql` est destiné à être appliqué
tel quel sur un projet Supabase réel (via `supabase db push` ou le SQL
Editor). Le schéma `auth` (dont `auth.users` et `auth.uid()`) est déjà
fourni par Supabase et n'est jamais recréé par cette migration.

Pour les tests d'intégration en local, `tests/integration/stub-auth-local.sql`
reproduit un `auth` minimal (uniquement utilisé en test, jamais appliqué en
production).

## Décisions prises pendant ce sprint

- **`classerPlat`** : la spécification d'origine ne prend que `margePct` et
  `volumeVentes` en paramètres, mais un classement en quadrants n'a de sens
  que relativement à des seuils de comparaison (marge et volume médians de
  la carte, par exemple). La fonction prend donc deux paramètres
  supplémentaires explicites (`seuilMargePct`, `seuilVolume`) plutôt que des
  constantes globales — ces seuils seront calculés par l'appelant au
  Sprint 5, à partir de l'ensemble des plats actifs.
- **`margeBrutePct`, `prixVenteHT`, `coefficientMultiplicateur`,
  `prixConseille`** : les cas limites (prix de vente nul ou négatif, coût
  matière nul, marge cible ≥ 100 %) renvoient `0` plutôt que `NaN` ou
  `Infinity`, pour ne jamais faire fuiter une valeur non affichable vers
  l'interface. C'est à l'appelant de décider, selon le contexte, d'afficher
  « — » quand une de ces conditions limites est rencontrée plutôt que ce 0
  brut.
- **`coutMatierePortion`** : si une fiche technique est vide, ou si un
  ingrédient de la fiche n'a pas de prix connu, ou si son unité ne
  correspond pas à celle de la fiche, la fonction renvoie
  `{ coutCts: null, complet: false }` plutôt que de tenter une conversion
  d'unité ou d'ignorer silencieusement la ligne — aucune estimation
  implicite.
- **Environnement de test RLS** : ce environnement n'a pas Docker
  fonctionnel (le CLI Supabase nécessite Docker). Le test d'intégration
  utilise donc le PostgreSQL local déjà installé, avec un stub minimal du
  schéma `auth` fidèle au comportement réel de `auth.uid()` (lecture du
  claim JWT `sub`) et un rôle `authenticated` sans `BYPASSRLS`, pour que
  les policies RLS soient réellement exercées pendant le test — pas
  contournées par un rôle superutilisateur.

Décisions prises pendant ce sprint :

- **HEIC non envoyé à Anthropic** : l'API vision n'accepte que
  JPEG/PNG/GIF/WebP. La compression côté client convertit donc
  systématiquement en JPEG, y compris depuis un HEIC — pas seulement un
  redimensionnement. Le décodage HEIC via `createImageBitmap`/`<canvas>`
  ne fonctionne nativement que sur iOS/Safari (plateforme d'origine du
  format et cible principale du parcours « photo au téléphone ») ; sur un
  navigateur desktop non Apple avec un HEIC, l'erreur est explicite plutôt
  qu'un plantage silencieux. Aucune bibliothèque de décodage HEIC dédiée
  (type `heic2any`) n'a été ajoutée à ce stade pour rester léger.
- **Image conservée même en échec d'extraction** : si l'extraction LLM
  échoue définitivement (après relance) ou si le document n'est pas
  reconnu comme facture, l'image est tout de même uploadée dans le
  premier cas (pour ne pas faire retaper la photo, saisie manuelle
  ensuite) mais pas dans le second (document non reconnu = pas une
  vraie facture, rien à conserver).
- **Fournisseur non assigné si non lu** : si l'extraction ne lit pas le
  nom du fournisseur, aucun fournisseur n'est deviné ni créé — le
  rapprochement se rabat sur la seule similarité trigramme (pas d'alias
  exact possible sans fournisseur), et l'établissement doit l'assigner
  manuellement.
- **Code couleur de l'écran de validation** : trois paliers (rouge <0.7,
  jaune 0.7–0.9, vert ≥0.9) plutôt qu'un simple binaire, pour donner un
  signal visuel gradué en plus du seuil dur de 0.7 imposé par la
  spécification.
- **`ingredient.prix_unitaire_cts` rendu nullable**
  (`0004_ingredient_prix_nullable.sql`) : le schéma initial l'imposait
  `not null`, mais l'onboarding crée des fiches techniques (donc des
  ingrédients) avant qu'aucune facture n'ait jamais été scannée — le prix
  est alors inconnu. Un prix manquant se traduit par un coût matière
  incomplet (« — », jamais une estimation), exactement comme
  `coutMatierePortion` le gère déjà.
- **`plat.description` ajoutée** (`0003_plat_description.sql`) : absente du
  schéma du Sprint 1, mais nécessaire pour alimenter le prompt de
  génération de fiche technique (« Description sur la carte »).
- **`docs/validation-fiches.md` sans appel API réel** : aucune clé
  Anthropic n'est disponible dans cet environnement. Le prompt exact a été
  appliqué par le modèle de cette session lui-même plutôt que par un appel
  réseau à `claude-sonnet-4-6` — voir la méthodologie détaillée en tête de
  ce document. À rejouer avec un vrai appel API avant mise en production.
- **La proposition de fiche technique ne persiste rien** : la génération
  (étape 2) ne fait aucune écriture en base ; seule la validation
  explicite (« Cette fiche est bonne », étape 3) crée les ingrédients
  manquants et les lignes de `fiche_technique` — cohérent avec la règle
  « jamais de composition inventée sans validation humaine ».
- **Établissement passé en paramètre d'URL** (`?etablissement=...`) sur
  `/carte` et `/carte/importer` : il n'existe pas encore d'authentification
  ni de sélecteur d'établissement (prévus plus tard). Solution temporaire
  et clairement documentée, pas un choix définitif.

## Ouvert / à valider

- Aucune connexion à un vrai projet Supabase ni à une vraie clé Anthropic
  n'a été effectuée dans cet environnement (pas de identifiants
  fournis) : la route `/api/factures/extraire` et l'écran de validation
  sont écrits et typés correctement, mais n'ont pas pu être exercés de
  bout en bout contre un projet réel. À tester avec de vrais identifiants
  avant mise en production.
- Le rôle exact des tables `fournisseur.siret` (nullable) suit le schéma
  demandé ; aucune validation de format SIREN/SIRET n'est faite ici
  (à discuter si utile).
- Un bucket de stockage Supabase nommé `factures` est attendu par la
  route d'extraction — à créer (avec ses propres policies RLS) avant le
  premier test réel.
- Le rate limiting sur les routes d'appel LLM est prévu au Sprint 6
  (durcissement) — la route actuelle ne le fait pas encore.
- `docs/validation-fiches.md` doit être rejoué avec un vrai appel à l'API
  Anthropic avant mise en production (voir méthodologie dans ce document).
- Aucune authentification ni sélecteur d'établissement n'existe encore :
  les écrans d'onboarding prennent l'établissement en paramètre d'URL en
  attendant. À remplacer par le contexte de session dès que
  l'authentification sera en place.
- Le rapprochement d'un nouvel ingrédient en doublon (nom légèrement
  différent d'un ingrédient existant non détecté par la similarité
  trigramme) peut provoquer un conflit d'unicité sur
  `(etablissement_id, nom_normalise)` à la validation de la fiche
  technique — pas de fusion automatique à ce stade.
