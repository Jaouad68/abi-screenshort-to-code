# Atelier Radar — Agents automatiques pour garages indépendants

Application SaaS multi-garages : chaque garagiste crée son compte et démarre
avec deux agents automatiques qui relancent à sa place, pensée pour un usage
quotidien au comptoir.

- **Stack :** Next.js 16 (App Router, React 19) · Prisma 7 · PostgreSQL (Supabase) · Tailwind CSS 4
- **Auth :** email + mot de passe (session par cookie signé, `jose` + `bcrypt`), inscription ouverte — un compte = un garage
- **Design :** habillage sombre néon (lime/menthe/corail sur fond quasi noir)

---

## 1. Les agents

- **Agent 1 — Rappel du contrôle technique.** Chaque véhicule suivi reçoit un
  SMS de rappel à des paliers configurables avant son échéance CT (par défaut
  J-21, J-10, J-3). Une route cron quotidienne (`/api/cron/rappels-ct`)
  déclenche le palier dû pour chaque véhicule ; le gérant peut aussi envoyer un
  rappel manuel ou marquer un RDV pris depuis le tableau de bord.
- **Agent 2 — Réveille les devis.** Les devis « en attente » sans réponse
  depuis le délai configuré (30 jours par défaut) sont relancés automatiquement
  (`/api/cron/relances-devis`) ; passé un second délai (60 jours par défaut),
  la relance propose d'elle-même un paiement en 2 fois pour lever le dernier
  frein.
- **Agent 3 — Décroche à sa place.** Agent vocal répondant au téléphone à la
  place du comptoir. Volontairement **non implémenté** ici : stack différente
  (téléphonie + IA voix temps réel), à traiter comme un lot séparé une fois un
  garage pilote validé. La page d'accueil et le tableau de bord l'affichent en
  « bientôt disponible ».

Les deux agents actifs envoient de vrais SMS via Brevo si `BREVO_API_KEY` /
`SMS_SENDER_NAME` sont configurées ; sans ces variables, les envois sont
simulés (journalisés) et l'application reste entièrement utilisable en démo.

---

## 2. Architecture

### Schéma de la base de données

| Table          | Rôle |
|----------------|------|
| `User`         | Compte de connexion du gérant (email + hash du mot de passe). |
| `Garage`       | Le garage + réglages des agents (paliers CT, délais de relance devis). 1–1 avec `User`. |
| `Vehicule`     | Véhicule suivi par l'agent 1 (plaque, client, échéance CT, statut). |
| `RappelCt`     | Journal des rappels CT envoyés (un par palier déclenché). |
| `Devis`        | Devis suivi par l'agent 2 (montant en centimes, statut). |
| `RelanceDevis` | Journal des relances de devis envoyées. |

> **Précision comptable :** les montants sont stockés en **centimes**
> (entiers) pour éviter les erreurs d'arrondi (voir `src/lib/money.ts`).

La logique de décision des deux agents (quel palier CT relancer, quand relancer
un devis, quand proposer le paiement fractionné) vit dans des fonctions pures
et testées : `src/lib/ct.ts` et `src/lib/devis.ts`.

### Routes principales

| Route | Écran |
|-------|-------|
| `/`, `/connexion`, `/inscription` | Vitrine + authentification. |
| `/tableau-de-bord` | Aperçu : KPIs, répartition des rappels CT, devis en attente, activité récente. |
| `/tableau-de-bord/vehicules` | Agent 1 : liste des véhicules, ajout, rappel manuel, RDV pris. |
| `/tableau-de-bord/devis` | Agent 2 : liste des devis, ajout, relance manuelle, marquer signé. |
| `/tableau-de-bord/parametres` | Réglages du garage et des deux agents. |
| `/api/cron/rappels-ct` | Cron quotidien — agent 1. |
| `/api/cron/relances-devis` | Cron quotidien — agent 2. |

---

## 3. Démarrage en local

Prérequis : **Node.js 20.9+**.

```bash
cd garage-agents
npm install
cp .env.example .env        # puis remplissez DATABASE_URL et SESSION_SECRET
npm run db:deploy           # applique les migrations
npm run dev                 # http://localhost:3000
```

Générez un secret de session : `openssl rand -base64 32`.

Ouvrez `/inscription` pour créer un garage, ou chargez le jeu de données de
démonstration :

```bash
DATABASE_URL="postgresql://…" npm run seed:demo
```

Compte de démo créé : `demo@atelier-radar.fr` / `demo1234`.

## 4. Tests

```bash
npm test        # Vitest — paliers de rappel CT, relance devis, temps relatif
npm run lint     # ESLint
npm run build:local   # build de production + vérification TypeScript (sans migration)
```

## 5. Déploiement (Supabase + Vercel)

1. Créez un projet [Supabase](https://supabase.com) (région Europe), notez le
   mot de passe de la base, et récupérez l'URI de connexion **directe** (port
   5432) → c'est votre `DATABASE_URL`.
2. Importez ce dossier sur [Vercel](https://vercel.com), **Root Directory :
   `garage-agents`**.
3. Variables d'environnement : `DATABASE_URL`, `SESSION_SECRET`, `CRON_SECRET`
   (Vercel Cron l'envoie automatiquement dans `Authorization`), et
   optionnellement `BREVO_API_KEY` / `SMS_SENDER_NAME` pour l'envoi réel des
   SMS.
4. Déployez — `prisma migrate deploy && next build` crée les tables au premier
   déploiement. `vercel.json` planifie déjà les deux crons quotidiens.
