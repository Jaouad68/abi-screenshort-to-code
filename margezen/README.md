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

## Ouvert / à valider

- Aucune connexion à un vrai projet Supabase n'a été effectuée (pas de
  clés fournies) : `npm run dev` affiche l'écran d'accueil mais les appels
  Supabase ne sont pas encore branchés à une UI (prévu Sprint 2/3).
- Le rôle exact des tables `fournisseur.siret` (nullable) suit le schéma
  demandé ; aucune validation de format SIREN/SIRET n'est faite ici
  (à discuter si utile).
- Merci de créer un projet Supabase et de renseigner `.env.local` avant le
  Sprint 2 (extraction de facture par vision), qui appellera l'API
  Anthropic et Supabase Storage.
