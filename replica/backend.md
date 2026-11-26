# Back-end Sillon

Périmètre : paiement d'abonnement en **mode test Stripe** pour les 4 formules.
Pas de comptes utilisateurs ni de base de données à ce stade (hors du scope « page seule »).

## Ce qui est en place

| fichier | rôle |
| --- | --- |
| `sillon/lib/plans.js` | les 4 formules : nom, prix en centimes, `lookup_key` Stripe, jours d'essai |
| `sillon/scripts/stripe-setup.mjs` | crée les produits et prix dans Stripe, relançable sans doublon, refuse une clé live |
| `sillon/api/checkout.js` | `POST {plan}` → session Stripe Checkout d'abonnement, essai de 30 jours pour Solo et Étudiant |
| `sillon/api/session.js` | `GET ?session_id=` → formule, statut et fin d'essai pour la page de remerciement (sans e-mail ni nom) |
| `sillon/api/portal.js` | `POST {session_id}` → portail client Stripe (changer de formule, arrêter en un clic) |
| `sillon/api/webhook.js` | vérifie la signature Stripe et journalise les 4 événements d'abonnement (identifiants seulement) |
| `sillon/merci.html` | page de retour après paiement, avec le bouton « Gérer ou arrêter mon abonnement » |

Les fonctions `api/*.js` suivent le format des fonctions Node de Vercel. Elles refusent
une clé `sk_live_` tant que `ALLOW_LIVE_STRIPE=1` n'est pas posé.

## À faire par Jaouad (rien de tout ça n'a été lancé)

1. **Clé de test** : Dashboard Stripe, mode test, Développeurs → Clés API → clé secrète `sk_test_…`.
2. **Créer les prix** : dans `sillon/`, `npm install` puis
   `STRIPE_SECRET_KEY=sk_test_… npm run stripe:setup`.
3. **Portail client** : Dashboard Stripe (mode test) → Paramètres → Facturation → Portail client,
   enregistrer la configuration une fois (sinon `/api/portal` échoue).
4. **Hébergement** : projet Vercel avec `sillon` comme dossier racine, variables
   `STRIPE_SECRET_KEY` et, après l'étape 5, `STRIPE_WEBHOOK_SECRET`.
5. **Webhook** : Dashboard Stripe → Développeurs → Webhooks → endpoint
   `https://<site>/api/webhook`, événements `checkout.session.completed`,
   `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`.
6. **Tester** avec la carte 4242 4242 4242 4242, une date future, n'importe quel code.

## Vérifié ici (sans clé Stripe)

- erreurs : mauvaise méthode (405), formule inconnue (400), JSON invalide (400), identifiant de session invalide (400), signature de webhook absente
- clé manquante ou clé live : refusées, le visiteur voit « Paiement indisponible pour le moment », le détail reste dans les journaux
- page : le bouton envoie la bonne formule, affiche « Redirection vers le paiement… », revient à son état si l'appel échoue ; `merci.html` gère un lien invalide
- **non vérifié** : la création réelle d'une session Checkout, le portail et la réception d'un webhook. Il faut une clé de test.

## Limites connues

- **Essai gratuit** réservé en théorie au premier abonnement : non contrôlé sans comptes utilisateurs.
- **Statut Étudiant** : aucune vérification de justificatif, la formule est souscrite directement.
- **Statut d'abonnement** non stocké : le webhook journalise seulement. Il faudra une base (Supabase) quand des comptes existeront.
- **Accès au portail** par l'identifiant de session Checkout dans l'URL de `merci.html` : qui possède ce lien peut gérer l'abonnement. Acceptable en démo, à remplacer par une connexion.
- **TVA** : prix déclarés TTC (`tax_behavior: inclusive`), Stripe Tax non activé.

## Checklist sécurité

- [x] secrets uniquement en variables d'environnement, `.env*` ignorés par git, rien côté navigateur
- [x] entrées validées côté serveur (formule sur liste blanche, format de session, taille du corps)
- [ ] autorisation par utilisateur : pas de comptes à ce stade
- [ ] limites de débit sur `/api/checkout` : non faites (à poser via le pare-feu Vercel)
- [x] webhooks : signature vérifiée
- [x] aucune donnée personnelle dans les journaux ni les réponses de `/api/session`
- [x] `npm audit` : 0 vulnérabilité (2026-11-26, stripe 23.1.0)
- [ ] politique de confidentialité listant Stripe et l'hébergeur : à écrire
