# Plombéo

> « Votre métier. Simplement mieux géré. »

Application de gestion pour plombier indépendant en France : clients, interventions,
devis, factures. Conçue mobile-first pour un usage sur chantier, et multi-tenant dès
le premier commit pour pouvoir devenir un SaaS multi-artisans sans réécriture.

- **Architecture (Phase 0)** : [`docs/plombeo/PHASE-0-ARCHITECTURE.md`](../docs/plombeo/PHASE-0-ARCHITECTURE.md)
- **Spécification Phase 1** : [`docs/plombeo/PHASE-1-SPECIFICATION.md`](../docs/plombeo/PHASE-1-SPECIFICATION.md)

## État d'avancement

**Phase 1 — Fondations : terminée.**

- Multi-tenant : `Organization` / `User` / `Membership` porteur du rôle, cloisonnement
  logique par `organizationId`, vérifié par un test d'isolation dédié
- Authentification : inscription, connexion, déconnexion ; mot de passe haché (bcrypt,
  coût 12), session signée (`jose`) **et** révocable en base
- Sessions : liste des appareils connectés, « déconnecter tous mes appareils »
- RBAC : 8 rôles en base, permissions vérifiées côté serveur dans le DAL
- Protection anti-force brute sur la connexion (fenêtre glissante en base)
- Journal d'audit immuable (`AuditLog`), sans mise à jour ni suppression exposées
- Informations d'entreprise (nom, forme juridique, SIRET, coordonnées)
- Design system mobile-first, contraste vérifié, cibles tactiles ≥ 44 px
- PWA installable : manifeste, service worker, page hors-ligne

Les phases suivantes (clients, agenda, devis, factures…) ne sont pas commencées. Le
tableau de bord les annonce explicitement plutôt que d'afficher des données fictives.

## Démarrer

Nécessite Node.js 20.9+ et une base PostgreSQL.

```bash
npm install
cp .env.example .env    # puis renseigner DATABASE_URL et SESSION_SECRET
npx prisma migrate dev  # crée les tables
npm run dev
```

Ouvrir http://localhost:3000.

### Variables d'environnement

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Chaîne de connexion PostgreSQL |
| `SESSION_SECRET` | Secret de signature des cookies de session (≥ 32 caractères aléatoires) |
| `NEXT_PUBLIC_BASE_URL` | Base des liens absolus |

Aucun secret réel ne doit être committé : `.env` est ignoré par git.

## Vérifications

```bash
npm test        # Vitest : 35 tests, dont l'isolation multi-tenant
npm run lint    # ESLint
npm run typecheck
npm run build   # build de production
```

### Sur la valeur des tests d'isolation

Les tests de `src/lib/isolation.test.ts` ont été validés **par mutation** : en retirant
temporairement chaque contrôle du DAL, on a vérifié que le test correspondant échoue
bien. Une première version passait sans le contrôle — elle ne prouvait donc rien. Toute
évolution de ces tests devrait refaire cette vérification.

### Sur le contraste

Les couleurs ont été mesurées, pas supposées : l'orange de marque initial (`#d95f18`)
donnait 3,75:1 avec du texte blanc, sous le seuil de 4,5:1. Il a été assombri en
`#b04a0d`. Un audit de contraste automatisé (Playwright) parcourt les pages publiques
et compare chaque texte à son fond effectif.

## Structure

| Chemin | Rôle |
|---|---|
| `src/lib/dal.ts` | **Couche d'accès aux données** — point d'entrée unique de la session et du cloisonnement |
| `src/lib/auth.ts` | Hachage, ouverture et révocation de session |
| `src/lib/session.ts` | Signature et empreinte des jetons |
| `src/lib/permissions.ts` | Correspondance rôle → permissions |
| `src/lib/securite.ts` | Anti-force brute, purge des données expirées |
| `src/lib/audit.ts` | Écriture du journal d'audit (seul point d'écriture) |
| `src/lib/validation.ts` | Schémas Zod partagés |
| `src/proxy.ts` | En-têtes de sécurité et redirection optimiste (Next.js 16 : remplace `middleware.ts`) |
| `src/components/ui.tsx` | Design system |
| `src/app/app/` | Espace connecté |
| `prisma/schema.prisma` | Modèle de données |

## Règles à respecter dans les phases suivantes

1. **Toute table métier porte `organizationId`**, indexé, en cascade vers `Organization`.
2. **Aucune requête Prisma hors du DAL** dans une page ou une Server Action : le
   contexte tenant vient toujours de la session, jamais du client.
3. **Aucun contrôle d'autorisation dans un `layout.tsx`** : avec le rendu partiel, un
   layout n'est pas réexécuté à chaque navigation.
4. **Aucune donnée fictive** dans l'application : un module non livré est annoncé
   comme tel.
5. **Aucune règle réglementaire inventée** : mentions légales, taux et obligations
   viennent d'une source officielle ou restent configurables.

## Particularités de Next.js 16 dans ce projet

Cette version comporte des ruptures par rapport aux conventions antérieures :

- `middleware.ts` est déprécié au profit de **`proxy.ts`**, avec une fonction exportée
  nommée `proxy` (runtime Node.js uniquement, non configurable) ;
- `cookies()`, `headers()`, `params` et `searchParams` sont **asynchrones** ;
- Turbopack est actif par défaut ; `next lint` a été retiré au profit de l'ESLint CLI ;
- en Tailwind 4, la syntaxe `bg-[--ma-variable]` ne fonctionne plus — il faut les
  utilitaires générés par `@theme` (`bg-action`, `text-attenue`, `rounded-carte`…).
