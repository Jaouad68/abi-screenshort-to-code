# Resto Pilot HACCP

> Passez votre contrôle sanitaire sans paperasse. Tout est horodaté et exportable en un clic.

MVP web **mobile-first** qui remplace le classeur HACCP papier des restaurants
indépendants (TPE de la restauration) et produit en un clic un **dossier de
conformité horodaté** présentable lors d'un contrôle DDPP.

## Fonctionnalités (périmètre MVP)

1. 🌡️ **Relevés de température** — équipements paramétrables, alerte visuelle immédiate hors plage, ouverture automatique d'une non-conformité tracée.
2. 🧽 **Plan de nettoyage** — tâches récurrentes (quotidienne/hebdo/mensuelle), validation horodatée et signée.
3. 📦 **Contrôle à réception** — fournisseur, produit, température, n° lot, conformité, photo du bon de livraison.
4. 🏷️ **Traçabilité / DLC secondaire** — étiquette numérique, DLC calculée, alertes sur DLC dépassées.
5. ⚠️ **Non-conformités** — déclaration + action corrective + statut ouvert/résolu.
6. 📄 **Archivage & export PDF** — dossier de conformité sur période choisie, horodaté, avec en-tête établissement.

Gestion **multi-utilisateurs** (rôles Gérant / Employé) sur un établissement.

### Améliorations clés

- 📶 **Mode hors-ligne (PWA)** — application installable ; les relevés saisis
  sans réseau sont conservés dans une file locale (IndexedDB) et **synchronisés
  automatiquement** à la reconnexion. L'heure de saisie déclarée (`saisiAt`) est
  conservée, mais l'horodatage qui fait foi reste celui du serveur (`createdAt`).
- 📈 **Historiques & courbes** — historique filtrable par équipement/période,
  avec **courbe de température** (SVG, plage cible et écarts en rouge).
- ✍️ **Correction tracée** — un relevé validé n'est jamais modifié ; une
  correction crée une **nouvelle entrée liée à l'originale** (motif obligatoire,
  audit trail affiché).
- ✅ **Tests (Vitest) & CI (GitHub Actions)** — logique métier, schémas de
  validation et génération PDF couverts ; lint + typecheck + tests + build en CI.

## Pile technique

- **Next.js 14** (App Router, TypeScript) — server actions + route handlers
- **Prisma** + **PostgreSQL** (Docker en local, base managée UE en prod — parité dev/prod, migrations versionnées)
- **Auth** email/mot de passe : `bcryptjs` (hachage) + **JWT** signé (`jose`) en cookie httpOnly, rôles
- **Horodatage serveur** (`createdAt = now()` côté base) — jamais l'horloge du client
- **Inviolabilité** : aucune route ne modifie/supprime un enregistrement validé ; une correction crée une nouvelle entrée tracée
- **PDF serveur** via `pdfkit`
- **Tailwind CSS** — interface mobile-first, gros boutons

## Démarrage rapide (local)

Base **PostgreSQL** en local via Docker (parité avec la production) :

```bash
cp .env.example .env        # ajuster AUTH_SECRET (openssl rand -base64 48)
docker compose up -d        # démarre Postgres 16 sur localhost:5432
npm install
npm run db:reset            # applique les migrations + jeu de démonstration
npm run dev                 # http://localhost:3000
```

### Qualité

```bash
npm run lint        # ESLint (next/core-web-vitals)
npm run typecheck   # tsc --noEmit
npm test            # Vitest (logique HACCP, validation, export PDF)
```

### Comptes de démonstration

| Rôle    | Email            | Mot de passe |
| ------- | ---------------- | ------------ |
| Gérant  | gerant@demo.fr   | Demo1234     |
| Employé | employe@demo.fr  | Demo1234     |

## Déploiement Vercel (UE / RGPD)

L'application est prête pour Vercel : `vercel.json` fixe la région **`cdg1` (Paris)**
et la commande de build `npm run vercel-build` (`prisma generate` →
`prisma migrate deploy` → `next build`).

**1. Créer une base Postgres managée dans l'UE** (ex. [Supabase](https://supabase.com)
région `eu-*`, ou [Neon](https://neon.tech) `eu-*`). Récupérer :
- l'URL **poolée** (PgBouncer, port `6543`) → `DATABASE_URL`
- l'URL **directe** (port `5432`) → `DIRECT_URL`

**2. Importer le repo dans Vercel** et définir les variables d'environnement
(Project → Settings → Environment Variables) :

| Variable        | Valeur                                                                 |
| --------------- | ---------------------------------------------------------------------- |
| `DATABASE_URL`  | `postgresql://…@…:6543/postgres?pgbouncer=true&connection_limit=1`     |
| `DIRECT_URL`    | `postgresql://…@…:5432/postgres`                                        |
| `AUTH_SECRET`   | `openssl rand -base64 48`                                               |

**3. Déployer.** Le build exécute automatiquement `prisma migrate deploy` (via
`DIRECT_URL`) puis construit l'app. Pour charger le jeu de démonstration une
fois en ligne : `DATABASE_URL=<directe> npm run db:seed` (optionnel).

> Données personnelles limitées (noms employés, email gérant), mots de passe
> hachés (bcrypt), HTTPS, hébergement UE → conforme à l'esprit RGPD. Pour les
> photos, prévoir un stockage objet UE en v2 (actuellement stockées en base).

## Conformité réglementaire

Outil d'**aide à la conformité** (esprit du Paquet Hygiène / méthode HACCP) :
autocontrôles, traçabilité, plan de maîtrise sanitaire. **La responsabilité
réglementaire reste celle de l'exploitant.** Données conservées ≥ 12 mois
glissants, exportables et supprimables sur demande (RGPD).

---

> Le précédent contenu du dépôt (site « Maroc ») a été déplacé dans `legacy/`.
