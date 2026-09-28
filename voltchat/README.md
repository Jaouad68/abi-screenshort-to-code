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
| `VOLTCHAT_CODE_MODERATION` | *(vide)* | Code secret à saisir à l'inscription pour obtenir le rôle modérateur. Vide : aucun modérateur possible. |

Tests : `npm test` (runner natif `node:test`).

## Fonctionnalités

- **Profil professionnel** à l'entrée : nom, métier, entreprise (sans mot de passe).
  La session expire après 30 jours d'inactivité ; « Quitter » la révoque côté serveur.
- **7 salons thématiques** : Général, Batteries & chimie, Recharge & bornes,
  Conduite autonome & logiciel, Flottes & usages pros, Réglementation & marché,
  Hydrogène & alternatives.
- **Temps réel** via Server-Sent Events : nouveaux messages, réactions,
  membres en ligne, indicateur « … est en train d'écrire ».
- Compteurs de **messages non lus** par salon et dans le titre de l'onglet.
- **Messages privés** : cliquez sur un membre en ligne pour lui écrire. Seuls les deux
  participants peuvent lire la conversation.
- **Modifier / supprimer ses messages** (✏️ / 🗑️ au survol, ou flèche ↑ dans le champ vide
  pour modifier son dernier message). Les messages modifiés portent la mention « (modifié) ».
- **Modération** : tout membre peut signaler 🚩 un message public (motif au choix). Les
  modérateurs voient les signalements en temps réel et peuvent les ignorer, supprimer le
  message ou exclure l'auteur (session fermée, messages publics supprimés). Les
  conversations privées ne sont pas modérées.
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
| GET     | `/api/moi`                                    | Profil courant (prolonge la session) |
| POST    | `/api/deconnexion`                            | Révoque la session              |
| GET     | `/api/salons`                                 | Liste des salons                |
| GET     | `/api/conversations`                          | Mes conversations privées       |
| POST    | `/api/conversations`                          | Ouvre un privé `{ avec: idMembre }` |
| GET     | `/api/salons/:fil/messages?avant=<id>`        | 50 messages (pagination)        |
| POST    | `/api/salons/:fil/messages`                   | Publie `{ texte }`              |
| PATCH   | `/api/salons/:fil/messages/:msg`              | Modifie `{ texte }` (auteur)    |
| DELETE  | `/api/salons/:fil/messages/:msg`              | Supprime (auteur ou modérateur) |
| POST    | `/api/salons/:fil/messages/:msg/reactions`    | Bascule `{ emoji }`             |
| POST    | `/api/salons/:fil/messages/:msg/signalements` | Signale `{ motif }`             |
| POST    | `/api/salons/:fil/ecrit`                      | Signal « en train d'écrire »    |
| GET     | `/api/signalements`                           | File de modération (modérateur) |
| DELETE  | `/api/signalements/:id`                       | Ignore un signalement (modérateur) |
| POST    | `/api/membres/:id/exclusion`                  | Exclut un membre (modérateur)   |
| GET     | `/api/flux`                                   | Flux SSE temps réel             |

`:fil` est l'identifiant d'un salon (`general`, `batteries`…) ou d'une conversation
privée (`dm-…`). Les événements d'un privé ne sont envoyés qu'à ses deux participants.

Authentification : en-tête `Authorization: Bearer <jeton>`. Le flux SSE utilise un
cookie `HttpOnly; SameSite=Strict` limité au chemin `/api/flux` (posé à l'inscription et
par `/api/moi`), car `EventSource` ne permet pas d'en-têtes : le jeton n'apparaît
jamais dans une URL ni dans les journaux.

### Sécurité

- Aucun `innerHTML` côté client : tout le contenu utilisateur passe par
  `textContent` ; seuls les liens `http(s)` sont transformés en `<a rel="noopener">`.
- Content-Security-Policy stricte, `X-Content-Type-Options: nosniff`.
- Validation et bornage de toutes les saisies, corps de requête limité à 16 Ko.
- Limitation de débit : 8 messages / 10 s par membre, 5 inscriptions / min par IP,
  5 signalements / min par membre ; les compteurs inactifs sont purgés chaque minute.
- Contrôle d'accès côté serveur : conversations privées réservées aux participants,
  modification réservée à l'auteur, routes de modération réservées aux modérateurs.
- Protection contre la traversée de répertoires sur les fichiers statiques.

## Pistes pour la production

- Remplacer le fichier JSON par PostgreSQL (Prisma est déjà utilisé dans ce dépôt).
- Authentification réelle (e-mail professionnel vérifié, SSO LinkedIn) : sans elle, un
  membre exclu peut se réinscrire sous un autre nom.
- Recherche, mentions @nom et notifications, pièces jointes, profils détaillés.
- Plusieurs instances : diffuser les événements via Redis Pub/Sub.
