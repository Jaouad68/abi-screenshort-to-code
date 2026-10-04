# Cours ou Pas ? 95

L'état des lycées du Val d'Oise face aux grèves et blocages lycéens, **en temps réel**, lycée par lycée et jour par jour.

Application web mobile, pensée comme une app iOS (installable sur l'écran d'accueil de l'iPhone), avec mode sombre.

## Fonctionnalités (V1)

- **68 lycées du 95** (publics et privés), issus de l'Annuaire de l'Éducation nationale.
- **Accueil** : choix du jour (lundi → samedi, cette semaine ou la suivante), compteurs Bloqués / Perturbés / Normaux (cliquables pour filtrer), recherche, filtre par ville, liste groupée par ville.
- **Fiche lycée** : statut du jour, niveau de fiabilité, nombre de signalements, heure de mise à jour, vue de la semaine, répartition des signalements, itinéraire, favori, partage.
- **Signalement anonyme** : un signalement par appareil, par lycée et par jour (le dernier remplace le précédent).
- **Temps réel** : Supabase Realtime prévient les navigateurs à chaque changement ; rafraîchissement de secours toutes les 60 s et au retour sur l'app.
- **Fiabilité** : `Vérifié` (modération) · `Confirmé` (≥ 3 signalements, ≥ 70 % d'accord) · `Non confirmé` · `Contradictoire` (< 60 % d'accord). Un signalement perd la moitié de son poids toutes les 6 h.
- **Modération** (`/admin`) : publier ou retirer un statut vérifié avec une note, supprimer les faux signalements.
- **Anti-abus** : 15 signalements max par réseau toutes les 10 min, IP jamais stockée (empreinte salée uniquement).
- **Favoris** « Mes lycées », stockés sur le téléphone.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Supabase (Postgres + Realtime) · Vercel.

## Lancer en local

```bash
npm install
cp .env.example .env.local   # facultatif : sans Supabase, l'app tourne en mode démo
npm run dev
```

Ouvre http://localhost:3000. En mode démo, les données sont en mémoire (perdues au redémarrage) et `/admin` accepte le mot de passe `admin`.

```bash
npm test          # tests unitaires (calcul des statuts, dates)
npm run lint
npm run build
```

## Mise en production

### 1. Supabase

1. Crée un projet sur https://supabase.com (offre gratuite suffisante pour démarrer, région Europe conseillée).
2. **SQL Editor** → colle et exécute `supabase/schema.sql`.
3. **Project Settings → API** : récupère l'URL, la clé `anon` et la clé `service_role`.

### 2. Vercel

1. Importe le dépôt sur https://vercel.com (si l'app est dans un sous-dossier, règle **Root Directory** sur `cours-ou-pas-95`).
2. Ajoute les variables d'environnement :

| Variable | Valeur |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clé `anon` |
| `SUPABASE_SERVICE_ROLE_KEY` | clé `service_role` (secrète) |
| `SESSION_SECRET` | 32 caractères aléatoires minimum (`openssl rand -base64 48`) |
| `ADMIN_PASSWORD` | mot de passe de l'espace `/admin` |

3. Déploie.

## Mettre à jour la liste des lycées

```bash
npm run import:lycees
```

Le script interroge l'API open data et affiche les lignes à coller dans `src/data/lycees.ts`.

## Architecture

```
src/
  app/
    page.tsx, home-view.tsx        Accueil
    lycee/[uai]/                   Fiche lycée + signalement
    a-propos/                      Fonctionnement, statuts, vie privée
    admin/                         Modération
    api/week                       GET  statuts d'une semaine
    api/reports                    POST signalement (validation, anti-spam)
    api/admin/*                    connexion, signalements, statuts vérifiés
    manifest.ts, icon.tsx, apple-icon.tsx   PWA / icônes
  data/lycees.ts                   Référentiel des lycées (open data)
  lib/status.ts                    Algorithme de calcul du statut (+ tests)
  lib/dates.ts                     Dates en heure de Paris
  lib/server/store.ts              Supabase ou mémoire (mode démo)
  lib/server/security.ts           Empreinte IP, cookie appareil, session admin
  lib/client/hooks.ts              Temps réel, favoris, mes signalements
supabase/schema.sql                Tables, RLS, Realtime
```

## Feuille de route (V2)

- Carte interactive (Leaflet + OpenStreetMap)
- Notifications push quand le statut d'un lycée suivi change
- Référents vérifiés par lycée (délégués, parents, personnels)

## Avertissement

Information participative et neutre : elle ne remplace pas les communications officielles des établissements ni du rectorat de Versailles.
