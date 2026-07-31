# MELLADO Électricité — Gestion de devis

Application web de gestion de devis pour **Francisco MELLADO** (électricité générale),
pensée pour un usage quotidien sur chantier (mobile-first) par un artisan non-technique.

- **Stack :** Next.js 16 (App Router, React 19) · Prisma 7 · PostgreSQL (Supabase) · Tailwind CSS 4
- **Auth :** email + mot de passe (session par cookie signé, `jose` + `bcrypt`)
- **PDF :** génération native via le moteur d'impression du navigateur (aucun service externe)

---

## 1. Fonctionnalités

- **Devis** : création, édition, **duplication**, suppression ; calcul automatique
  **HT / TVA (multi-taux 20 %, 10 %, 5,5 %, 0 %) / TTC** ; numérotation automatique
  `DEV-2026-001` ; statuts **Brouillon → Envoyé → Accepté → Refusé → Facturé**.
- **Catalogue** de prestations pré-enregistrées (pré-chargé avec les 7 prestations
  types : prise, interrupteur, tableau, câblage/ml, mise aux normes NF C 15-100,
  luminaire, VMC).
- **Clients** : fiche (nom, adresse, téléphone, email, notes) + **historique des devis**.
- **Tableau de bord** : CA prévisionnel, CA signé, taux d'acceptation, répartition
  par statut, derniers devis.
- **PDF** avec en-tête société complet : nom, adresse, téléphone, email, SIRET,
  N° TVA intracommunautaire, mention d'assurance décennale, mentions légales et
  validité (« Devis valable 30 jours… »), zone « Bon pour accord ».
- **Réglages** : toutes les coordonnées de l'entreprise sont modifiables (SIRET,
  TVA, préfixe des devis, TVA par défaut, durée de validité, mentions légales).
- **Factures** : conversion d'un devis accepté en facture (numérotation `FAC-2026-001`,
  copie figée des lignes, PDF facture avec mentions légales de facturation), suivi
  du statut **Émise → Payée**, tableau « encaissé / en attente ».
- **Acompte** : pourcentage d'acompte par devis, avec calcul automatique du montant
  à la commande et du solde, repris dans le PDF et la facture.
- **Logo** : téléversement d'un logo (Réglages) affiché dans l'interface et les PDF.
- **Envoi par email** : bouton « Envoyer par email » qui adresse le devis au client
  (via Resend) et le passe automatiquement en « Envoyé ». Sans clé configurée,
  l'envoi est simulé (voir variables d'environnement).

Les coordonnées de MELLADO Électricité et le catalogue sont **pré-remplis à la
création du compte** — rien à saisir pour démarrer.

---

## 2. Architecture

### Schéma de la base de données

| Table            | Rôle |
|------------------|------|
| `User`           | Compte de connexion (email + hash du mot de passe). |
| `Company`        | Coordonnées de l'entreprise (en-tête PDF). 1–1 avec `User`. |
| `Client`         | Fiche client. |
| `Prestation`     | Bibliothèque de prestations (prix catalogue HT). |
| `Devis`          | Devis + totaux dénormalisés (centimes) + statut. |
| `DevisLigne`     | Lignes d'un devis (`quantiteMilli` = quantité × 1000). |
| `Facture` / `FactureLigne` | Facture issue d'un devis (copie figée des lignes) + statut. |
| `CompteurDevis` / `CompteurFacture` | Numérotation atomique par (utilisateur, année). |

> **Précision comptable :** tous les montants sont stockés et calculés **en centimes
> (entiers)** et les quantités en millièmes, pour éviter toute erreur d'arrondi de
> virgule flottante (voir `src/lib/calcul.ts` et `src/lib/money.ts`).

### Routes principales

| Route | Écran |
|-------|-------|
| `/connexion`, `/inscription` | Authentification (1er compte à l'inscription). |
| `/tableau-de-bord` | Tableau de bord (KPIs + derniers devis). |
| `/tableau-de-bord/devis` | Liste des devis + filtre par statut. |
| `/tableau-de-bord/devis/nouveau` | Création (choix du client). |
| `/tableau-de-bord/devis/[id]` | Éditeur (lignes, calculs en direct, statuts, duplication). |
| `/tableau-de-bord/devis/[id]/imprimer` | Document PDF imprimable. |
| `/tableau-de-bord/factures`, `/factures/[id]`, `/factures/[id]/imprimer` | Factures + PDF. |
| `/tableau-de-bord/clients`, `/clients/[id]` | Clients + historique. |
| `/tableau-de-bord/prestations`, `/prestations/[id]` | Catalogue. |
| `/tableau-de-bord/parametres` | Réglages société. |

---

## 3. Démarrage en local

Prérequis : **Node.js 20.9+**.

```bash
cd electricien-devis
npm install
cp .env.example .env        # puis remplissez DATABASE_URL et SESSION_SECRET
npm run db:deploy           # applique les migrations (ou `npm run db:migrate` en dev)
npm run dev                 # http://localhost:3000
```

Générez un secret de session : `openssl rand -base64 32`.

Au premier lancement, l'application redirige vers `/inscription` : créez le compte
(email + mot de passe). Les coordonnées MELLADO et le catalogue sont alors pré-remplis.

---

## 4. Déploiement (Supabase + Vercel)

### a) Base de données Supabase

1. Créez un projet sur [supabase.com](https://supabase.com) (région Europe, ex. Paris).
2. Notez le **mot de passe** de la base choisi à la création.
3. **Project Settings → Database → Connection string → URI** : copiez l'URI de la
   connexion **directe** (port `5432`) et remplacez `[YOUR-PASSWORD]` par le mot de passe.
   C'est votre `DATABASE_URL`.

### b) Application sur Vercel

1. Poussez ce dossier sur GitHub, puis importez le dépôt sur
   [vercel.com](https://vercel.com). **Réglez « Root Directory » sur `electricien-devis`.**
2. **Environment Variables** :
   - `DATABASE_URL` = l'URI Supabase (port 5432)
   - `SESSION_SECRET` = une longue chaîne aléatoire (`openssl rand -base64 32`)
   - *(optionnel)* `RESEND_API_KEY` + `EMAIL_FROM` pour l'envoi réel des devis par
     email. Sans elles, l'app fonctionne mais l'envoi est simulé.
3. Déployez. Le script de build (`prisma migrate deploy && next build`) crée
   automatiquement les tables dans Supabase au premier déploiement.
4. Ouvrez l'URL Vercel → `/inscription` → créez le compte. C'est prêt.

> **Astuce mobile :** sur le téléphone, ouvrez l'URL puis « Ajouter à l'écran
> d'accueil » pour lancer l'app comme une application native.

### Générer / exporter un PDF

Ouvrez un devis → **Aperçu / PDF** → **Imprimer / Enregistrer en PDF**. La boîte
d'impression du navigateur permet d'enregistrer le devis en PDF ou de l'imprimer,
sur ordinateur comme sur mobile.

---

## 5. Scripts

| Commande | Effet |
|----------|-------|
| `npm run dev` | Serveur de développement. |
| `npm run build` | Migrations + build de production. |
| `npm run build:local` | Build sans migration (vérification). |
| `npm run db:migrate` | Crée/applique une migration en dev. |
| `npm run db:deploy` | Applique les migrations (prod). |
| `npm run lint` | Analyse ESLint. |
