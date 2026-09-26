# ⚡ VoltChat

Chat en temps réel entre professionnels du **véhicule électrique de demain** :
ingénieurs batteries, constructeurs, opérateurs de recharge, gestionnaires de
flotte, énergéticiens, chercheurs, collectivités…

Application autonome, **sans aucune dépendance** : Node.js ≥ 20 suffit.

## Démarrer

```bash
cd voltchat
npm start          # ou : node server.js
# → http://localhost:3100
```

Ouvrez l'adresse dans deux navigateurs (ou une fenêtre privée) pour discuter
entre deux profils.

| Variable    | Défaut               | Rôle                              |
|-------------|----------------------|-----------------------------------|
| `PORT`      | `3100`               | Port HTTP                         |
| `DATA_FILE` | `data/voltchat.json` | Fichier de sauvegarde des données |

Tests : `npm test` (runner natif `node:test`).

## Fonctionnalités

- **Profil professionnel** à l'entrée : nom, métier, entreprise (sans mot de passe,
  session par jeton conservé dans le navigateur).
- **7 salons thématiques** : Général, Batteries & chimie, Recharge & bornes,
  Conduite autonome & logiciel, Flottes & usages pros, Réglementation & marché,
  Hydrogène & alternatives.
- **Temps réel** via Server-Sent Events : nouveaux messages, réactions,
  membres en ligne, indicateur « … est en train d'écrire ».
- Compteurs de **messages non lus** par salon et dans le titre de l'onglet.
- **Réactions** (👍 ⚡ 💡 🔋 🤔 🎯), liens cliquables, messages multi-lignes,
  regroupement des messages successifs, séparateurs par jour.
- Historique paginé (« Charger les messages précédents »), reconnexion
  automatique avec rattrapage des messages manqués.
- Interface responsive (menus coulissants sur mobile), thème clair/sombre
  automatique.

## Architecture

```
voltchat/
├── server.js        Serveur HTTP : API JSON + flux SSE + fichiers statiques
├── lib/store.js     Modèle de données, validation, limiteur de débit (testé)
├── public/          Client web en HTML/CSS/JS natifs
└── test/            Tests unitaires
```

### API

| Méthode | Route                                         | Description                     |
|---------|-----------------------------------------------|---------------------------------|
| GET     | `/api/config`                                 | Métiers et réactions autorisés  |
| POST    | `/api/inscription`                            | Crée un profil → `{ jeton }`    |
| GET     | `/api/moi`                                    | Profil courant                  |
| GET     | `/api/salons`                                 | Liste des salons                |
| GET     | `/api/salons/:id/messages?avant=<id>`         | 50 messages (pagination)        |
| POST    | `/api/salons/:id/messages`                    | Publie `{ texte }`              |
| POST    | `/api/salons/:id/messages/:msg/reactions`     | Bascule `{ emoji }`             |
| POST    | `/api/salons/:id/ecrit`                       | Signal « en train d'écrire »    |
| GET     | `/api/flux?jeton=…`                           | Flux SSE temps réel             |

Authentification : en-tête `Authorization: Bearer <jeton>` (ou paramètre
`jeton` pour le flux SSE, `EventSource` ne permettant pas d'en-têtes).

### Sécurité

- Aucun `innerHTML` côté client : tout le contenu utilisateur passe par
  `textContent` ; seuls les liens `http(s)` sont transformés en `<a rel="noopener">`.
- Content-Security-Policy stricte, `X-Content-Type-Options: nosniff`.
- Validation et bornage de toutes les saisies, corps de requête limité à 16 Ko.
- Limitation de débit : 8 messages / 10 s par membre, 5 inscriptions / min par IP.
- Protection contre la traversée de répertoires sur les fichiers statiques.

## Pistes pour la production

- Remplacer le fichier JSON par PostgreSQL (Prisma est déjà utilisé dans ce dépôt).
- Authentification réelle (e-mail professionnel vérifié, SSO LinkedIn).
- Modération (signalement, bannissement), messages privés, pièces jointes.
- Plusieurs instances : diffuser les événements via Redis Pub/Sub.
