# RésaZen

Application de réservation en ligne anti-« no-show » pour salons de coiffure,
barbiers et instituts de beauté. Stack : Next.js (App Router) + Tailwind CSS +
Prisma/PostgreSQL.

## État d'avancement

**Phase 1 — MVP réservation : terminée.**

- Compte gérant (inscription / connexion / déconnexion, session par cookie signé)
- Prestations (CRUD : nom, durée, battement, prix, activer/désactiver)
- Horaires d'ouverture par jour, avec coupure méridienne
- Moteur de créneaux (`src/lib/slots.ts`, couvert par des tests unitaires)
- Page de réservation publique pour les clientes (`/r/[slug]`), sans compte
- Agenda du gérant avec actions Terminé / Non venu et badge de réputation

**Phase 2 — SMS : terminée.**

- Journal SMS (`src/lib/sms`) : abstraction fournisseur (Null par défaut, Brevo
  prêt à activer), gabarits sans accent (GSM7, 1 segment), compteur de segments
- Confirmation cliente + notification gérant à la réservation
- Page publique `/b/[token]` (sans compte) pour confirmer ou annuler un RDV
- Rappel J-2 via une route cron protégée (`/api/cron/rappels-j2`)
- Accusé d'annulation cliente + notification « créneau libéré » au gérant
- Vue « Journal SMS » dans le tableau de bord (`/tableau-de-bord/sms`)

**Phase 3 — Réputation & acompte : terminée.**

- Règle d'acompte (`src/lib/acompte.ts`) : acompte dû dès `noShowCount >= seuilNoShow`,
  sauf pardon après `seuilPardon` RDV honorés ; montant en % ou fixe
- Paiement (`src/lib/paiement`) : abstraction fournisseur (Null par défaut, Stripe
  Checkout prêt à activer), webhook `/api/stripe/webhook` pour confirmer le paiement
- Réservation publique : redirige vers Stripe Checkout si l'acompte est requis et
  Stripe configuré, sinon l'enregistre comme dû (mode simulé)
- Transitions automatiques : Terminé rembourse un acompte réglé, Non venu et
  annulation tardive (< 48h) le conservent, annulation précoce le rembourse
- Badge acompte dans l'agenda gérant (dû / réglé / conservé / remboursé)

**Phase 4 — Bilan & fidélisation : partiellement terminée.**

- Bilan honnête (`src/lib/bilan.ts`) : ne compte que l'argent prouvable — acomptes
  conservés + créneaux libérés réellement repris (détection par chevauchement de
  créneau) ; les créneaux libérés non repris sont affichés mais comptés à zéro
- Vue « Bilan du mois » (`/tableau-de-bord/bilan`) avec navigation par mois, 2 KPIs
  (taux de non-venue vs mois précédent, % de RDV pris en ligne)
- Export CSV du fichier client, RGPD (`/api/export/clients`)

Volontairement non traité — aucune règle ni maquette précise dans le dossier de
passation pour ces points, à cadrer avec vous avant implémentation : relances
(offre Premium), avis Google, mentions légales / politique de confidentialité.

**Phase 5 — Durcissement RGPD/sécurité, facturation, multi-salons : terminée.**

- Réinitialisation de mot de passe gérant (`/mot-de-passe-oublie`), par e-mail
  (`src/lib/email`, même abstraction Null/Brevo que les SMS), lien à usage unique
  valable 1h, aucune fuite d'information sur l'existence d'un compte
- Gestion du STOP SMS obligatoire : webhook entrant (`/api/sms/inbound`) qui coupe
  le consentement du client dès qu'il répond STOP ; les envois automatiques
  (rappel J-2, accusés) le respectent aussitôt
- Droit à la suppression : page « Clients » (`/tableau-de-bord/clients`) avec
  anonymisation des données personnelles (nom, téléphone, consentement) tout en
  conservant l'historique de rendez-vous pour la comptabilité/le bilan
- Facturation par abonnement (`src/lib/facturation`) : 3 plans (Essentiel,
  Sérénité, Premium), Stripe Checkout en mode abonnement + Billing Portal,
  webhook étendu (`customer.subscription.updated/deleted`,
  `invoice.payment_failed`) qui met à jour le statut d'abonnement du salon ;
  quota SMS mensuel appliqué selon le plan (Essentiel : 100 SMS/mois)
- Page « Facturation » dans le tableau de bord (`/tableau-de-bord/facturation`)
- Multi-salons : un compte gérant peut gérer plusieurs salons (relation
  many-to-many via `Membership`), chacun avec ses propres prestations,
  horaires, clients et abonnement ; sélecteur de salon actif dans l'en-tête dès
  qu'un compte a 2 salons ou plus, page « Ajouter un salon »
  (`/tableau-de-bord/salons/nouveau`)

Volontairement non traité — aucune règle ni maquette précise dans le dossier de
passation pour ces points, à cadrer avant implémentation : relances (offre
Premium), avis Google, mentions légales / politique de confidentialité,
facturation consolidée multi-salons (un abonnement Stripe par salon pour
l'instant, choix confirmé).

## Démarrer

Nécessite une base PostgreSQL (locale, ou un service gratuit type
[Neon](https://neon.tech)/Supabase/Vercel Postgres pour éviter d'installer
PostgreSQL en local).

```bash
npm install
npx prisma migrate dev   # crée les tables dans la base pointée par DATABASE_URL
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

Variables d'environnement (voir `.env.example`) :

- `DATABASE_URL` — chaîne de connexion PostgreSQL (`postgresql://user:password@host:5432/dbname`)
- `SESSION_SECRET` — secret de signature des cookies de session
- `BREVO_API_KEY` / `SMS_SENDER_NAME` — optionnels ; sans eux, les SMS sont
  seulement journalisés (Journal SMS), jamais envoyés réellement
- `CRON_SECRET` — secret partagé exigé par la route `/api/cron/rappels-j2`
- `NEXT_PUBLIC_BASE_URL` — base des liens `/b/[token]` envoyés par SMS
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` — optionnels ; sans eux, un
  acompte requis est enregistré comme dû mais jamais collecté en ligne, et la
  page Facturation ne propose pas de vrai paiement (mode simulé)
- `STRIPE_PRICE_ESSENTIEL` / `STRIPE_PRICE_SERENITE` / `STRIPE_PRICE_PREMIUM` —
  optionnels ; identifiants des prix Stripe (mode abonnement) pour chaque plan
- `EMAIL_FROM` — optionnel ; sans lui, les e-mails (réinitialisation de mot de
  passe) sont seulement journalisés en console, jamais envoyés réellement
  (réutilise `BREVO_API_KEY`)
- `STOP_SMS_SECRET` — secret partagé exigé par le webhook entrant `/api/sms/inbound`

## Tests

```bash
npm test        # Vitest — moteur de créneaux, segments SMS, gabarits, règle d'acompte, bilan
npm run lint     # ESLint
npm run build    # build de production + vérification TypeScript
```

## Développement avec Claude Code

Le projet déclare le serveur MCP [Context7](https://context7.com) dans
`.mcp.json` : il donne à Claude Code un accès à la documentation à jour des
librairies utilisées (Next.js, Prisma, Stripe...), ce qui est particulièrement
utile ici puisque `AGENTS.md` prévient que cette version de Next.js diffère
des connaissances d'entraînement par défaut. Il est activé automatiquement à
l'ouverture du repo (une approbation ponctuelle sera demandée la première
fois).

## Structure

- `src/app/page.tsx` — page d'accueil
- `src/app/inscription`, `src/app/connexion` — auth gérant
- `src/app/mot-de-passe-oublie`, `src/app/reinitialiser-mot-de-passe/[token]` — réinitialisation de mot de passe
- `src/app/tableau-de-bord` — dashboard protégé (agenda, prestations, horaires, SMS, bilan, clients, facturation, salons)
- `src/app/r/[slug]` — page de réservation publique par salon
- `src/app/b/[token]` — page publique de confirmation/annulation (sans compte)
- `src/app/api/cron/rappels-j2` — route cron pour le rappel J-2
- `src/app/api/stripe/webhook` — webhook Stripe (confirmation d'acompte)
- `src/app/api/sms/inbound` — webhook SMS entrant (gestion du STOP)
- `src/app/api/export/clients` — export CSV du fichier client
- `src/lib` — logique métier partagée (moteur de créneaux, session, horaires, SMS, e-mail, acompte, bilan...)
- `prisma/schema.prisma` — modèle de données
