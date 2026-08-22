# PLOMBÉO — Phase 1 : Fondations — Spécification

> Produite selon la méthode §70 du cahier des charges (étapes 1 à 10). L'implémentation (étape 11) suit cette spécification.

Phase : **1 — Fondations techniques + authentification + organisations + sécurité**
Dépendances : aucune
Difficulté : moyenne
Prérequis validés : décisions 1, 2, 3 et 8 de la Phase 0 (stack du dépôt, Vercel + PostgreSQL UE, PWA seule, cloisonnement logique par `organizationId`)

---

## 1. Objectif

Poser les fondations sur lesquelles reposeront **toutes** les phases suivantes, sans livrer encore de fonctionnalité métier (ni client, ni devis, ni facture) :

- un modèle multi-tenant correct dès le premier commit, impossible à contourner par inadvertance ;
- une authentification robuste et une session révocable ;
- un contrôle des permissions vérifié côté serveur ;
- un journal d'audit immuable prêt à recevoir les événements sensibles des phases suivantes ;
- un design system mobile-first minimal mais cohérent ;
- une application installable (PWA).

**Critère de réussite global** : un artisan peut créer son compte, se connecter depuis son téléphone, installer Plombéo sur son écran d'accueil, et il est démontré par un test automatisé qu'il ne peut accéder à aucune donnée d'une autre organisation.

### Hors périmètre explicite de la Phase 1

Clients, logements, agenda, devis, factures (Phases 2 à 5) ; MFA et SSO (Phase 15 / 14) ; invitation d'utilisateurs supplémentaires et gestion d'équipe (Phase 14) ; réinitialisation de mot de passe par e-mail — **reportée en Phase 6**, lorsque l'adapter e-mail sera introduit, pour ne pas livrer en Phase 1 une fonctionnalité à moitié branchée.

---

## 2. User stories

| # | En tant que | Je veux | Afin de | Priorité |
|---|---|---|---|---|
| US-1 | plombier | créer mon compte avec mon e-mail et un mot de passe | commencer à utiliser Plombéo | Doit |
| US-2 | plombier | que mon entreprise (organisation) soit créée automatiquement à l'inscription | ne pas avoir à comprendre une notion technique de « tenant » | Doit |
| US-3 | plombier | me connecter et rester connecté plusieurs jours | ne pas ressaisir mon mot de passe à chaque chantier | Doit |
| US-4 | plombier | me déconnecter | protéger mes données si je prête mon téléphone | Doit |
| US-5 | plombier | voir mes appareils connectés et tout déconnecter | reprendre la main si je perds mon téléphone | Doit |
| US-6 | plombier | renseigner les informations de mon entreprise (nom, SIRET, coordonnées) | qu'elles alimentent plus tard mes devis et factures | Doit |
| US-7 | plombier | installer Plombéo sur l'écran d'accueil de mon téléphone | y accéder comme une vraie application | Doit |
| US-8 | plombier | une interface lisible et utilisable au pouce, d'une main | l'utiliser sur chantier sans effort | Doit |
| US-9 | exploitant Plombéo | que toute action sensible soit journalisée de façon inaltérable | pouvoir auditer en cas d'incident | Doit |
| US-10 | plombier | être protégé contre les tentatives répétées de connexion | que mon compte ne soit pas forcé | Doit |

---

## 3. Critères d'acceptation

**US-1 / US-2 — Inscription**
- L'e-mail est validé côté serveur (format, unicité, normalisation en minuscules).
- Le mot de passe fait au minimum 12 caractères ; il est haché avec bcrypt (jamais stocké en clair, jamais journalisé).
- L'inscription crée **atomiquement** (une seule transaction) : `User`, `Organization`, `Membership` avec le rôle `PROPRIETAIRE`.
- Un e-mail déjà utilisé renvoie un message d'erreur générique, sans révéler explicitement l'existence du compte.
- L'inscription est journalisée dans `AuditLog`.

**US-3 / US-4 — Connexion / déconnexion**
- La connexion vérifie le hash bcrypt et crée une `Session` en base **et** un cookie signé (`jose`, HS256) `httpOnly`, `secure` en production, `sameSite=lax`.
- Un identifiant invalide et un mot de passe invalide produisent **le même** message d'erreur et un temps de réponse comparable.
- La déconnexion révoque la session en base (pas seulement le cookie) et supprime le cookie.
- Un cookie valide dont la session est révoquée ou expirée en base **n'authentifie pas** — la vérification en base fait foi.

**US-5 — Sessions**
- L'utilisateur voit la liste de ses sessions actives (date de création, dernière activité, appareil approximatif).
- « Déconnecter tous mes appareils » révoque toutes les sessions et est journalisé.

**US-6 — Organisation**
- L'artisan peut modifier : nom commercial, forme juridique (champ libre), SIRET, adresse, téléphone, e-mail de contact.
- Le SIRET est validé sur sa **forme** uniquement (14 chiffres) — **aucune validation de la clé de contrôle ni de règle fiscale n'est inventée** ; la vérification réelle relève d'une source officielle (cf. Phase 0 §K).
- Les champs de mentions légales (TVA intracommunautaire, assurance décennale) existent en base dès maintenant mais ne sont **pas** exploités avant la Phase 5.

**US-7 — PWA**
- `manifest` valide servi par l'application, icônes 192 et 512 px, `display: standalone`.
- Un service worker enregistré met en cache le shell applicatif ; une page hors-ligne s'affiche proprement en cas de coupure réseau.
- L'application est détectée comme installable par Chrome (Android) et ajoutable à l'écran d'accueil sur iOS.

**US-8 — Accessibilité / mobile**
- Toutes les cibles tactiles font au moins 44 × 44 px.
- Contraste du texte principal conforme au ratio minimum recommandé (4,5:1).
- Chaque champ de formulaire possède un `<label>` associé ; les erreurs sont annoncées textuellement, pas seulement par la couleur.
- Navigation au clavier possible, focus visible.

**US-9 — Audit**
- `AuditLog` reçoit : inscription, connexion réussie, échec de connexion, déconnexion, révocation de sessions, modification de l'organisation.
- Aucune Server Action applicative n'expose de suppression ou de modification d'`AuditLog`.

**US-10 — Anti-brute force**
- Au-delà d'un seuil de tentatives échouées par e-mail et par IP sur une fenêtre glissante, les tentatives sont rejetées temporairement.
- Le blocage est journalisé.

---

## 4. Tables / modifications base de données

Nouvelles tables (base vierge, migration initiale) :

| Table | Rôle | Points d'attention |
|---|---|---|
| `Organization` | Le tenant. Une organisation = un artisan (ou une entreprise). | Porte les informations d'entreprise et les futures mentions légales. |
| `User` | Compte de connexion. | `email` unique et normalisé, `passwordHash` bcrypt. |
| `Membership` | Lien User ↔ Organization **portant le rôle**. | Unique sur `(userId, organizationId)`. Permet dès maintenant qu'un utilisateur appartienne à plusieurs organisations. |
| `Session` | Session révocable. | `tokenHash` (jamais le token en clair), `expiresAt`, `revokedAt`, `lastSeenAt`, `userAgent` tronqué. |
| `AuditLog` | Journal immuable. | `organizationId`, `actorUserId`, `action`, `entityType`, `entityId`, `metadata` JSON, `createdAt`. Aucune colonne `updatedAt` : ces lignes ne se modifient pas. |
| `LoginAttempt` | Tentatives de connexion pour l'anti-brute force. | Purgeable, indexée sur `(identifier, createdAt)`. |

Énumération `Role` : `PROPRIETAIRE`, `ADMINISTRATEUR`, `ASSISTANT`, `TECHNICIEN`, `APPRENTI`, `SOUS_TRAITANT`, `COMPTABLE`, `LECTURE_SEULE`.
Seuls `PROPRIETAIRE` et `ADMINISTRATEUR` sont exploités par l'UI en V1 (cf. Phase 0 §B) ; les autres existent en base pour ne pas créer de dette de migration.

**Convention imposée à toutes les phases suivantes** : toute table métier porte `organizationId` avec index, et une clé étrangère en `onDelete: Cascade` vers `Organization`.

---

## 5. API / Server Actions

Next.js 16 : les Server Actions sont le mécanisme principal ; les Route Handlers sont réservés aux webhooks et aux endpoints appelés par des tiers.

| Action | Type | Entrée (validée Zod) | Effet | Permission |
|---|---|---|---|---|
| `inscrire` | Server Action | email, motDePasse, nomEntreprise | Crée User + Organization + Membership en transaction, ouvre une session | Publique |
| `connecter` | Server Action | email, motDePasse | Vérifie, crée Session + cookie | Publique (rate limitée) |
| `deconnecter` | Server Action | — | Révoque la session courante | Authentifié |
| `revoquerToutesLesSessions` | Server Action | — | Révoque toutes les sessions de l'utilisateur | Authentifié |
| `mettreAJourOrganisation` | Server Action | nom, siret, adresse, ville, codePostal, téléphone, email | Met à jour l'organisation **courante** | `organisation:modifier` |

Toutes retournent un état typé `{ ok: true } | { ok: false, erreur: string }` consommé via `useActionState` — jamais d'exception brute remontée à l'utilisateur.

**Règle absolue** : aucune Server Action ne reçoit d'`organizationId` depuis le client. L'organisation courante est **toujours** dérivée de la session côté serveur.

---

## 6. Écrans

| Route | Écran | Accès |
|---|---|---|
| `/` | Accueil public : présentation courte, boutons Inscription / Connexion | Public |
| `/inscription` | Formulaire de création de compte | Public |
| `/connexion` | Formulaire de connexion | Public |
| `/app` | Tableau de bord — en Phase 1 : état du compte et raccourcis désactivés annoncés comme « à venir » (aucune donnée fictive, cf. §77) | Authentifié |
| `/app/entreprise` | Informations de l'entreprise | `organisation:modifier` |
| `/app/securite` | Sessions actives, déconnexion globale | Authentifié |
| `/hors-ligne` | Page affichée par le service worker en cas de coupure | Public |

Le tableau de bord de la Phase 1 **n'affiche aucune donnée simulée** : les blocs qui seront alimentés en Phases 2 à 5 sont présentés comme non encore disponibles, plutôt que remplis de chiffres inventés.

---

## 7. Permissions

Modèle : le rôle porté par le `Membership` est traduit en un ensemble de permissions par une table de correspondance en code (pas de table `Permission` en base en V1 — sur-ingénierie inutile tant que les rôles ne sont pas personnalisables).

| Permission | PROPRIETAIRE | ADMINISTRATEUR | Autres rôles V1 |
|---|---|---|---|
| `organisation:lire` | ✅ | ✅ | ✅ |
| `organisation:modifier` | ✅ | ✅ | ❌ |
| `organisation:supprimer` | ✅ | ❌ | ❌ |
| `membre:inviter` | ✅ | ✅ | ❌ |
| `audit:lire` | ✅ | ✅ | ❌ |

Vérification **systématiquement côté serveur** dans le DAL, jamais uniquement par masquage d'un bouton dans l'UI.

---

## 8. Événements métier

Émis dès la Phase 1, consommés par le moteur de règles en Phase 7 :

- `organization.created`
- `user.registered`
- `user.logged_in`
- `user.login_failed`
- `user.logged_out`
- `user.sessions_revoked`
- `organization.updated`

En Phase 1 ces événements alimentent uniquement `AuditLog` ; le bus d'événements complet est construit en Phase 7.

---

## 9. Automatisations

Aucune en Phase 1 (le moteur de règles arrive en Phase 7). Seule tâche récurrente prévue : purge des `LoginAttempt` et des `Session` expirées — implémentée comme une fonction appelable, **branchée sur un cron en Phase 7**, pas encore planifiée ici.

---

## 10. Tests

| Type | Test | Pourquoi |
|---|---|---|
| Unitaire | Hachage et vérification du mot de passe | Sécurité de base |
| Unitaire | Signature et vérification du jeton de session, rejet d'un jeton expiré ou altéré | Sécurité de base |
| Unitaire | Table de correspondance rôle → permissions | Évite une régression silencieuse de droits |
| Unitaire | Validation Zod des entrées (e-mail, longueur du mot de passe, forme du SIRET) | Validation serveur |
| Unitaire | Compteur anti-brute force (seuil, fenêtre glissante) | US-10 |
| **Intégration** | **Isolation multi-tenant : une requête faite dans le contexte de l'organisation A ne retourne jamais une donnée de l'organisation B** | **Décision N°8 — test obligatoire, bloquant** |
| Intégration | Une session révoquée en base n'authentifie plus, même avec un cookie encore valide cryptographiquement | Révocation réelle |
| Intégration | Une Server Action protégée refuse un appel sans permission | RBAC serveur |

Les tests d'intégration nécessitant une base de données réelle sont écrits de façon à être **explicitement ignorés** (`skip`) si `DATABASE_URL` n'est pas disponible, plutôt que de faire échouer la suite en environnement sans base — mais ils ne sont jamais transformés en faux tests qui passent sans rien vérifier.

---

**Spécification Phase 1 prête — passage à l'implémentation (étape 11 de la méthode §70).**
