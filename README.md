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

Pas encore implémenté (voir la suite de la feuille de route) : SMS, acompte
Stripe, bilan mensuel, export RGPD, multi-salons.

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

## Tests

```bash
npm test        # Vitest — moteur de créneaux
npm run lint     # ESLint
npm run build    # build de production + vérification TypeScript
```

## Structure

- `src/app/page.tsx` — page d'accueil
- `src/app/inscription`, `src/app/connexion` — auth gérant
- `src/app/tableau-de-bord` — dashboard protégé (agenda, prestations, horaires)
- `src/app/r/[slug]` — page de réservation publique par salon
- `src/lib` — logique métier partagée (moteur de créneaux, session, horaires...)
- `prisma/schema.prisma` — modèle de données
