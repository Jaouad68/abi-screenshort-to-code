# SuiviCVC

Application web de suivi des contrats d'entretien pour petites entreprises de
chauffage et de climatisation (2 à 5 techniciens, plusieurs centaines de
contrats). Stack : Next.js 16 (App Router) + Tailwind CSS 4 + Prisma 7 /
PostgreSQL.

## Parcours principal

1. **Le dirigeant crée le compte de son entreprise** (`/inscription`) — chaque
   inscription crée une entreprise indépendante (multi-tenant).
2. Il **importe ses clients** depuis un export Excel (CSV), avec aperçu et
   détection des doublons avant import (`Clients → Importer`).
3. Il **crée des contrats d'entretien** liés aux clients/équipements, avec
   périodicité, montant et échéance.
4. La page **Renouvellements** affiche les contrats à échéance sous 30/60/90
   jours, permet de préparer un message de relance (brouillon) et de suivre le
   statut (À contacter → Contacté → Renouvelé/Perdu).
5. Il **crée les comptes de son équipe** (Administratif, Technicien) depuis
   `Équipe`, et **planifie des interventions** en les affectant à un
   technicien.
6. Le **technicien** se connecte, voit ses interventions du jour, coche la
   checklist, ajoute des photos et des commentaires sur le terrain, puis
   génère le **compte rendu PDF** (impression navigateur).

## État d'avancement — Phase 1 : terminée

- **Comptes et rôles** : Dirigeant (tout), Administratif (gestion complète
  hors équipe), Technicien (accès limité à ses interventions + lecture des
  fiches clients/contrats liées). Comptes créés par le dirigeant avec un mot
  de passe temporaire affiché une seule fois (aucun envoi d'e-mail).
- **Séparation des données entre entreprises** : chaque ligne métier porte un
  `companyId` ; `src/lib/auth.ts` (`requireUser`/`requireRole`) est le seul
  point d'entrée des données côté serveur et toutes les requêtes Prisma
  filtrent explicitement par l'entreprise de l'utilisateur connecté.
- **Clients / Équipements / Contrats** : CRUD complet, historique des
  changements de statut de renouvellement, formulaires validés (Zod).
- **Import CSV** : assistant en 2 temps (aperçu avec détection de doublons —
  par e-mail ou nom+téléphone — puis sélection ligne à ligne avant import),
  tolérant aux variantes d'en-têtes courantes (accents, casse). Un client, son
  équipement et son contrat peuvent être créés en une seule ligne.
- **Renouvellements** : fenêtres 30/60/90 jours + retard, changement de statut
  avec historique horodaté, messages de relance email/SMS **préparés en
  brouillon** (voir ci-dessous).
- **Interventions** : planification, affectation technicien, checklist
  standard modifiable, commentaires, photos, statuts, **compte rendu PDF**
  via impression navigateur (aucun service externe requis).
- **Export CSV** (clients, contrats, interventions), compatible Excel FR.
- **Données de démonstration** explicitement identifiées (bandeau visible
  partout dans l'app quand `Company.demo = true`), générées par
  `npm run db:demo`.
- **États vides, de chargement et d'erreur** : messages explicites partout
  (listes vides, erreurs de formulaire, accès refusé, 404).
- **Persistance serveur** : PostgreSQL via Prisma ; testé après déconnexion/
  reconnexion.

## Ce qui est simulé (aucun service externe requis pour tester)

- **Envoi des messages de renouvellement (email/SMS)** : la page
  Renouvellements génère un **brouillon** personnalisé (objet + corps d'e-mail,
  texte de SMS) avec un bouton « Copier » et un lien `mailto:` pré-rempli.
  **Rien n'est envoyé automatiquement.** Pour brancher un envoi réel, ajoutez
  un fournisseur (Brevo, Resend, Twilio...) dans `src/lib/messages.ts` et dans
  la page Renouvellements.
- **Mot de passe temporaire des nouveaux comptes** : affiché une seule fois à
  l'écran (aucun e-mail d'invitation). À transmettre manuellement.
- **Photos d'intervention** : stockées en base64 directement en base de
  données. Fonctionnel et suffisant pour un usage courant (compressées côté
  navigateur avant envoi, ~12 photos max par intervention), mais à faire
  évoluer vers un stockage objet externe (S3, Cloudinary...) avant un usage
  intensif ou beaucoup de photos par entreprise.
- **Compte rendu PDF** : généré via l'impression du navigateur (« Imprimer /
  Enregistrer en PDF »), pas de service de génération de PDF externe.

## Démarrer

Nécessite une base PostgreSQL (locale, ou un service gratuit type
[Neon](https://neon.tech)/Supabase/Vercel Postgres).

```bash
npm install
cp .env.example .env   # renseigner DATABASE_URL et SESSION_SECRET
npx prisma migrate dev # crée les tables
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

### Charger les données de démonstration

```bash
npm run db:demo
```

Crée (ou recrée) une entreprise « Chauffage Confort Démo » avec 4 comptes,
12 clients, autant d'équipements et de contrats aux échéances variées (en
retard, 30/60/90 jours, renouvelé, perdu), et quelques interventions à
différents statuts. Mot de passe pour tous les comptes : `demo1234`.

| Rôle | E-mail |
| --- | --- |
| Dirigeant | demo@suivicvc.fr |
| Administratif | admin.demo@suivicvc.fr |
| Technicien | tech1.demo@suivicvc.fr |
| Technicien | tech2.demo@suivicvc.fr |

Cette entreprise est marquée `demo = true` en base : un bandeau orange le
rappelle sur toutes les pages de l'application.

## Variables d'environnement (voir `.env.example`)

- `DATABASE_URL` — chaîne de connexion PostgreSQL.
- `SESSION_SECRET` — secret de signature des cookies de session
  (`openssl rand -base64 32`).
- `RESEND_API_KEY` / `EMAIL_FROM`, `SMS_API_KEY` / `SMS_SENDER_NAME` —
  optionnels, non branchés dans cette V1 (voir « Ce qui est simulé »).

## Tests

```bash
npm test         # Vitest — échéances/renouvellement, import CSV, permissions
npm run lint      # ESLint
npm run build     # build de production + vérification TypeScript
```

## Structure

- `src/app/inscription`, `src/app/connexion` — création de compte (= nouvelle
  entreprise) et connexion
- `src/app/tableau-de-bord` — application protégée
  - `clients/` — CRUD clients + assistant d'import CSV (`clients/import`)
  - `equipements/` — fiches équipement (créées depuis une fiche client)
  - `contrats/` — CRUD contrats, historique de suivi
  - `renouvellements/` — fenêtres 30/60/90 jours, statuts, messages de
    relance en brouillon
  - `interventions/` — planification, checklist, photos, compte rendu PDF
  - `equipe/` — gestion des comptes (dirigeant uniquement)
  - `export/` — exports CSV
  - `mon-compte/` — changement de mot de passe
- `src/lib` — logique métier partagée : auth/session, permissions par rôle,
  calcul des fenêtres d'échéance (`echeance.ts`), import/dédoublonnage CSV
  (`import.ts`), génération des messages de relance (`messages.ts`)
- `prisma/schema.prisma` — modèle de données (multi-entreprise via
  `companyId` sur chaque table)
- `scripts/setup-demo.mjs` — génère les données de démonstration
