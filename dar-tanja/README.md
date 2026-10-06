# Dar Tanja

Web app (installable sur iPhone) pour trouver un appartement neuf à Tanger quand
on est MRE : **titre foncier vérifié** et **aide de l'État calculée** sur chaque
bien, recherche instantanée, en français et en arabe.

Stack : Next.js 16 (App Router) + Tailwind CSS 4 + Supabase (base, temps réel)
+ Leaflet / OpenStreetMap.

## État d'avancement

**MVP, phase 1 : terminée.**

- Recherche instantanée : tout le catalogue est filtré en mémoire, sans appel
  réseau à chaque filtre (`src/lib/filtres.ts`)
- Filtres « Titre foncier vérifié » et « Aide de l'État » actifs par défaut,
  section à part pour les biens au-dessus du plafond, avec le surcoût réel
- Moteur d'éligibilité à l'aide (`src/lib/aide.ts`) : barème lu en base,
  jamais codé en dur
- Règle foncière (`src/lib/foncier.ts`) : un titre n'est « vérifié » que si un
  justificatif a été contrôlé il y a moins de 90 jours
- Estimation des frais d'acquisition (`src/lib/frais.ts`), à confirmer par le notaire
- Fiche programme : sécurité juridique, prix net, frais, lots, promoteur, checklist
- Carte (marqueurs colorés par statut foncier), favoris, comparateur (3 lots)
- Profil : questionnaire d'éligibilité, langue (FR / AR avec mise en page RTL),
  devise (EUR, USD, CAD, taux du jour)
- Guide de l'achat à distance, checklist partageable sur WhatsApp
- Temps réel : Supabase Realtime recharge le catalogue à chaque modification
- Mode démo automatique sans Supabase, avec des **données fictives** signalées

**Phase 2 : à venir.** Back-office (saisie des programmes, envoi et validation
des justificatifs, modification du barème), import depuis un tableur, alertes
push et e-mail (nouveau programme, baisse de prix, changement de statut foncier).

## Lancer en local

```bash
npm install
npm run dev     # http://localhost:3000, en mode démo
npm test        # tests des règles métier
```

## Mise en production

1. **Supabase** : créer un projet, puis exécuter `supabase/schema.sql` dans
   l'éditeur SQL. Les programmes ne sont visibles qu'avec `publie = true`.
2. **Vercel** : importer le dépôt avec **Root Directory = `dar-tanja`**, puis
   renseigner `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (voir `.env.example`).
3. Sur iPhone : ouvrir le site dans Safari, puis Partager > Sur l'écran d'accueil.

## Points à vérifier

- Le barème de l'aide fourni est celui du **lancement du programme (2024)** :
  vérifiez les conditions à jour sur le portail officiel et mettez à jour la
  table `regles_aide` (l'app affiche un avertissement si le barème a plus de 6 mois).
- Les taux de frais d'acquisition sont indicatifs.
