# Copilote démarches (nom de code)

Application mobile (iOS et Android) qui accompagne les particuliers, en priorité
les seniors et leurs aidants, dans leurs démarches administratives françaises.
L'application **explique, prépare, rappelle et suit**. Elle ne fait jamais la
démarche à la place de l'usager et ne lui demande jamais ses identifiants.

Stack prévue : Expo (React Native) + Supabase (région UE).

## Contenu du dossier

| Fichier | Rôle |
|---|---|
| [`SPECS-MVP.md`](SPECS-MVP.md) | Spécification fonctionnelle du MVP : périmètre, user stories, critères d'acceptation, règles métier, écrans, sécurité, cas limites |
| [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) | Schéma de base, RLS, limites de l'offre gratuite, rappels automatiques, bucket du coffre-fort |
| [`supabase/tests/0001_init_test.sql`](supabase/tests/0001_init_test.sql) | Tests SQL de la migration (isolation entre usagers, limites gratuites, rappels) |
| [`content/cni-passeport.v1.json`](content/cni-passeport.v1.json) | Contenu du parcours « Carte d'identité / passeport » (format du catalogue) |
| [`prompts/decodeur-courrier.md`](prompts/decodeur-courrier.md) | Prompt système et format de sortie du décodeur de courrier |

## Hypothèses retenues

- H1 : copilote, pas de mandat. L'usager fait lui-même la démarche sur le site officiel.
- H2 : société créée (SAS ou SASU), RC professionnelle souscrite.
- H3 : pas d'aide humaine au MVP.
- H4 : Expo + Supabase en région UE, abonnements gérés par RevenueCat.

## Tester la migration localement

```bash
# Postgres 15+ suffit : le test crée des bouchons pour auth.* et storage.*
createdb copilote_test
psql -q -v ON_ERROR_STOP=1 -d copilote_test -f supabase/tests/0001_init_test.sql
```

Avec la CLI Supabase : `supabase db reset` applique la migration sur la pile locale.
