# PLOMBÉO — Phase 15 : Durcissement — Spécification

> Produite selon la méthode §70 (étapes 1 à 10).
> **Phase traitée avant les phases 12 à 14**, pour la raison exposée au §2.

Phase : **15 — Sécurité, conformité, mise en production**
Dépendances : toutes
Difficulté : moyenne techniquement — **c'est la phase qui décide si l'application est déployable**

---

## 1. Objectif

Solder la dette de sécurité accumulée depuis la Phase 1, et dire honnêtement ce qui reste à la charge de l'exploitant.

**Critère de réussite global** : `SECURITY.md` ne renvoie plus de manque « à traiter en Phase 15 » — soit c'est fait, soit c'est explicitement hors du périmètre de Plombéo, avec la raison.

---

## 2. Pourquoi avant les phases 12 à 14

Les phases 12 (hors-ligne avancé), 13 (contrats) et 14 (SaaS) **ajoutent des fonctionnalités**. La Phase 15 **protège ce qui existe déjà** : neuf phases de données réelles — clients, factures, photos de chantier, prix d'achat.

Une application qu'on n'ose pas déployer ne sert personne, quel que soit le nombre de ses modules. Reporter le durcissement en dernier fait porter le risque à tout ce qui a été construit avant.

---

## 3. La dette recensée, et ce qui en est fait

`SECURITY.md` listait dix manques. Chacun reçoit ici une décision, **livrée ou explicitement refusée** :

| Manque | Décision |
|---|---|
| Politique CSP | **Livrée** |
| Rate limiting global | **Livré**, en base, sans dépendance nouvelle |
| Purge planifiée des sessions et tentatives | **Livrée**, branchée sur le cron de la Phase 7 |
| Rotation du secret de session | **Livrée** : deux secrets acceptés en lecture, un seul en écriture |
| En-têtes de sécurité | **Complétés** (HSTS, COOP, permissions) |
| MFA / TOTP | **Hors périmètre V1**, voir §5 |
| Réinitialisation du mot de passe | **Hors périmètre V1**, voir §5 |
| Chiffrement au repos de colonnes sensibles | **Sans objet** : aucune colonne bancaire n'existe |
| Analyse antivirale des fichiers | **Hors périmètre**, voir §5 |
| Tests de restauration de sauvegarde | **Hors périmètre**, voir §5 |

---

## 4. Ce qui est livré

### 4.1 Politique de sécurité du contenu (CSP)

**Retenu** : une CSP stricte, sans `unsafe-eval`, avec `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'` et `form-action 'self'`.

**`style-src` conserve `'unsafe-inline'`** : Next.js injecte des styles en ligne, et prétendre le contraire produirait une politique qui casse l'application au premier déploiement. C'est une limite assumée et écrite, pas un oubli.

`frame-ancestors 'none'` remplace utilement `X-Frame-Options`, conservé pour les navigateurs anciens.

### 4.2 Rate limiting global

**Retenu** : un compteur **en base**, dans la table déjà utilisée pour l'anti-force brute, avec une fenêtre glissante.

Pas de Redis : la Phase 0 avait tranché que le volume mono-tenant ne le justifie pas, et introduire une brique d'infrastructure pour un compteur serait payer une opération quotidienne pour un besoin qui n'existe pas encore.

**Limite portée sur les écritures**, jamais sur les lectures : borner la consultation dégraderait l'usage normal d'un artisan sur chantier, sans gêner sérieusement un attaquant.

### 4.3 Purge planifiée

Sessions expirées et tentatives de connexion anciennes sont supprimées à chaque balayage du cron (Phase 7). La fonction existait depuis la Phase 1 ; seul le branchement manquait.

**Les documents ne sont pas purgés** : leur durée de conservation relève d'obligations **[À VÉRIFIER — SOURCE OFFICIELLE]** que Plombéo ne tranche pas.

### 4.4 Rotation du secret de session

**Retenu** : `SESSION_SECRET` signe, `SESSION_SECRET_PRECEDENT` est **accepté en vérification**. Une rotation devient possible sans déconnecter tout le monde : on publie le nouveau, on garde l'ancien le temps que les sessions expirent, puis on le retire.

Sans ce mécanisme, une rotation est si coûteuse qu'elle n'a jamais lieu — et un secret qu'on ne peut pas changer est un secret qu'on ne changera pas après une fuite.

---

## 5. Ce qui reste hors du périmètre, et pourquoi

Dire « fait » sur ces points serait une fausse garantie (§76).

**MFA / TOTP** — utile, mais l'application est **mono-utilisateur en pratique** : aucun écran n'ouvre encore un second compte (Phase 14). Un second facteur sur un compte unique protège surtout contre le vol de mot de passe, alors que la vraie exposition viendra de l'ouverture multi-utilisateurs. **À livrer avec la Phase 14**, pas avant.

**Réinitialisation du mot de passe** — l'adaptateur e-mail existe. Ce qui manque n'est pas technique : un parcours de réinitialisation est un **contournement de l'authentification** et se conçoit avec le même soin que l'authentification elle-même (jeton à usage unique, à durée très courte, invalidant les sessions). Bâclé, il devient la porte la plus facile. **Assumé absent plutôt que mal fait.**

**Analyse antivirale** — suppose un prestataire, donc un contrat et un flux de données sortant. Les fichiers ne sont jamais servis exécutables (`attachment` + `nosniff`, Phase 6), ce qui limite le risque **pour Plombéo**, pas pour le poste de l'artisan qui les ouvre. **La limite est écrite.**

**Tests de restauration de sauvegarde** — Plombéo ne gère pas sa propre infrastructure : les sauvegardes sont celles de l'hébergeur PostgreSQL (décision n°2). Un test de restauration ne se simule pas dans le code ; c'est une **procédure d'exploitation**. Le document en fixe le contenu attendu ; l'exécution appartient à l'exploitant.

---

## 6. Tables

**Aucune.** La table `LoginAttempt` de la Phase 1 est réutilisée pour le compteur global.

---

## 7. Tests

| Type | Test |
|---|---|
| Unitaire | La CSP interdit `unsafe-eval`, `object-src`, et fixe `frame-ancestors` |
| Unitaire | Fenêtre glissante : le compteur libère après expiration |
| Unitaire | Un jeton signé par le secret précédent est accepté ; un jeton d'un secret inconnu est refusé |
| Intégration | La purge supprime les sessions expirées, **jamais les sessions valides** |
| Intégration | Au-delà du seuil, l'écriture est refusée puis redevient possible |
| Navigateur | Les en-têtes de sécurité sont présents sur une réponse réelle |

---

**Spécification Phase 15 prête — passage à l'implémentation.**
