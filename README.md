# RésaZen

Application de réservation en ligne anti-« no-show » pour salons de coiffure,
barbiers et instituts de beauté. Stack : Next.js (App Router) + Tailwind CSS +
Prisma/SQLite.

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

Pas encore implémenté (voir la suite de la feuille de route) : multi-salons,
facturation abonnement, durcissement RGPD/sécurité (Phase 5).

## Démarrer

```bash
npm install
npx prisma migrate dev   # crée dev.db (SQLite) à partir du schéma
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

Variables d'environnement (voir `.env.example`) :

- `DATABASE_URL` — chaîne de connexion SQLite locale (`file:./dev.db`)
- `SESSION_SECRET` — secret de signature des cookies de session
- `BREVO_API_KEY` / `SMS_SENDER_NAME` — optionnels ; sans eux, les SMS sont
  seulement journalisés (Journal SMS), jamais envoyés réellement
- `CRON_SECRET` — secret partagé exigé par la route `/api/cron/rappels-j2`
- `NEXT_PUBLIC_BASE_URL` — base des liens `/b/[token]` envoyés par SMS
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` — optionnels ; sans eux, un
  acompte requis est enregistré comme dû mais jamais collecté en ligne

## Tests

```bash
npm test        # Vitest — moteur de créneaux, segments SMS, gabarits, règle d'acompte, bilan
npm run lint     # ESLint
npm run build    # build de production + vérification TypeScript
```

## Structure

- `src/app/page.tsx` — page d'accueil
- `src/app/inscription`, `src/app/connexion` — auth gérant
- `src/app/tableau-de-bord` — dashboard protégé (agenda, prestations, horaires, SMS, bilan)
- `src/app/r/[slug]` — page de réservation publique par salon
- `src/app/b/[token]` — page publique de confirmation/annulation (sans compte)
- `src/app/api/cron/rappels-j2` — route cron pour le rappel J-2
- `src/app/api/stripe/webhook` — webhook Stripe (confirmation d'acompte)
- `src/app/api/export/clients` — export CSV du fichier client
- `src/lib` — logique métier partagée (moteur de créneaux, session, horaires, SMS, acompte, bilan...)
- `prisma/schema.prisma` — modèle de données
