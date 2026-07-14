# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

**RésaZen** — an online booking / anti-no-show application for hair salons,
barbers, and beauty institutes (French market; UI copy and code identifiers
are in French). Stack: Next.js (App Router) + TypeScript + Tailwind CSS v4 +
Prisma/PostgreSQL. See `README.md` for the full phase-by-phase feature log
(what's built, what's deliberately deferred).

## Commands

```bash
npm install
npx prisma migrate dev     # apply/create migrations against DATABASE_URL (dev)
npm run dev                # start dev server (http://localhost:3000)

npm test                   # vitest run — all *.test.ts under src/
npx vitest run src/lib/slots.test.ts   # run a single test file
npx vitest src/lib/slots.test.ts       # watch mode for one file

npm run lint                # ESLint (eslint-config-next, flat config)
npm run build                # prisma migrate deploy && next build (also the TS check)
```

There is no separate `typecheck` script — `npm run build` (via `next build`)
is what verifies types. Requires a real PostgreSQL database (`DATABASE_URL`);
a free hosted instance (Neon, Supabase, Vercel Postgres) works fine for local
dev if you don't want to install Postgres locally. `postinstall` runs
`prisma generate`, which emits the client into `src/generated/prisma` (not
the default `node_modules/.prisma` location) — regenerate it with
`npx prisma generate` after any schema change if types look stale.

Env vars are documented inline in `.env.example`. Everything beyond
`DATABASE_URL` and `SESSION_SECRET` is optional and has a "null"/simulated
fallback: no `BREVO_API_KEY` → SMS/emails are just logged, not sent; no
Stripe keys → deposits/subscriptions are recorded as due but never actually
collected online. Check the provider file under `src/lib/<feature>/provider.ts`
before assuming an integration is live in a given environment.

## Architecture

### Multi-tenant model and auth

Every domain row hangs off a `Salon` (`Service`, `Praticien`, `Client`,
`Appointment`, all with `salonId`). A `User` (the gérant/manager account) can
belong to multiple salons via `Membership` (many-to-many). The session cookie
(`src/lib/session.ts`, a signed JWT via `jose`) encodes `{ userId, salonId }`
— the *currently active* salon, not "the" salon. Switching salons
(`salon-switcher.tsx`) re-signs the cookie with a different `salonId`.

`src/lib/auth.ts` is the gate every server component/action goes through:
`requireSalon()` reads the session, loads that `Salon`, and redirects to
`/connexion` if either is missing — this is the multi-tenancy boundary, so
any new dashboard page/action must call it (or otherwise scope its Prisma
queries by `salonId`) rather than trusting a raw route param. There is no
middleware.ts; auth is enforced per-layout/per-action, not at the edge.

### Route structure (`src/app`, App Router)

- `/` — public marketing home.
- `/inscription`, `/connexion`, `/mot-de-passe-oublie`,
  `/reinitialiser-mot-de-passe/[token]` — gérant auth, outside the dashboard.
- `/tableau-de-bord/**` — the manager dashboard, gated by `requireSalon()` in
  `tableau-de-bord/layout.tsx` (agenda, prestations, praticiens, horaires,
  journal SMS, bilan, clients, facturation, salons).
- `/r/[slug]` — public booking flow for a salon's clients, no account needed.
- `/b/[token]` — public, tokenized page for a client to confirm/cancel a
  specific appointment (the token is `Appointment.bookingToken`, not a
  session).
- `/api/cron/rappels-j2` — J-2 reminder cron, gated by `CRON_SECRET`.
- `/api/stripe/webhook` — confirms deposit payments and subscription
  status transitions.
- `/api/sms/inbound` — inbound SMS webhook; handles STOP opt-out, gated by
  `STOP_SMS_SECRET`.
- `/api/export/clients` — GDPR client-list CSV export.

Mutations are Next.js Server Actions (`actions.ts` next to each route), not a
separate API layer, except where an external webhook/cron needs an HTTP
endpoint (those live under `src/app/api/**/route.ts`).

### Business logic (`src/lib`)

Domain rules are deliberately pulled out of routes/components into small,
independently unit-tested modules (see the `*.test.ts` siblings):

- `slots.ts` — the slot engine: given a day's opening windows (`horaires.ts`),
  a service's duration+buffer, and already-occupied intervals, computes
  bookable start times. Pure functions, no I/O — the place to look when
  booking availability looks wrong.
- `acompte.ts` — deposit-requirement rule: owed once a client's
  `noShowCount` crosses `seuilNoShow`, waived again after `seuilPardon`
  honored appointments; amount is % or fixed, per-salon (`reglagesAcompte`).
- `bilan.ts` — the monthly "honest" P&L: only counts money that's provable
  (kept deposits + reclaimed freed slots, detected by time-slot overlap);
  everything else is shown but counted as zero. Don't "fix" it to count
  optimistically — that's the point of the feature.
- `sms/` and `email/` — each has a `provider.ts` with a `Null*` implementation
  (default, just logs) and a real implementation (Brevo) picked at runtime
  based on env vars; `sms/service.ts` also writes `SmsLog` rows and enforces
  the per-plan monthly SMS quota; `sms/segments.ts` counts GSM7 segments for
  accent-free templates (`sms/templates.ts`).
- `paiement/provider.ts` — same Null/Stripe-provider pattern for deposits;
  `facturation/` (plans + Stripe subscription checkout/portal) is the
  separate flow for the salon's own subscription plan, not to be confused
  with a client's booking deposit.
- `statut.ts` — human-readable French labels for the `AppointmentStatut` /
  `AcompteStatut` enums; keep new enum values' labels here rather than
  inlining strings at call sites.

### Data model (`prisma/schema.prisma`)

Enums drive most state machines (`AppointmentStatut`, `AcompteStatut`,
`AbonnementStatut`, `SmsGabarit`/`SmsStatut`). `Salon.horaires` and
`Salon.reglagesAcompte` are untyped `Json` columns (shape documented in
comments right above them in the schema) — validate/shape them in
application code, not at the DB layer. Appointment→Client/Service/Praticien
deletes are `Restrict` (an appointment keeps history-owning rows alive);
Salon-owned rows cascade with the salon.

When you change the schema: edit `schema.prisma`, run
`npx prisma migrate dev --name <description>` to generate the migration
under `prisma/migrations/`, then `npx prisma generate` picks up automatically
via the Prisma VSCode/CLI flow (or rerun manually if types don't refresh).
`npm run build` runs `prisma migrate deploy` first, so an unmigrated schema
change will fail CI/build, not just `dev`.

### Tests

Vitest, config in `vitest.config.ts` (`@` aliased to `src/`). Tests are
colocated as `<module>.test.ts` next to the module they cover and exercise
pure logic (slots, SMS segments/templates, `acompte`, `bilan`) — there's no
DB-backed integration test suite, so don't reach for a real Prisma client
inside a `*.test.ts`.
