# PLOMBÉO — Phase 14 : SaaS et ouverture multi-utilisateurs — Spécification

> Produite selon la méthode §70 (étapes 1 à 10).

Phase : **14 — Invitations, rôles, MFA, abonnements**
Dépendances : toutes
Difficulté : **élevée** — c'est la phase qui change le modèle de menace

---

## 1. Objectif

Faire passer Plombéo d'un logiciel mono-artisan à un logiciel d'équipe, et poser la structure d'abonnement — sans prétendre encaisser quoi que ce soit.

**Critère de réussite global** : un artisan invite son apprenti, celui-ci ne voit que ce que son rôle autorise, et le propriétaire peut protéger son compte par un second facteur.

---

## 2. Cette phase change le modèle de menace

Jusqu'ici, l'application était **mono-utilisateur en pratique** : les huit rôles existaient en base depuis la Phase 1, vérifiés côté serveur, mais aucun écran n'ouvrait un second compte. C'est ce constat qui a justifié de reporter le MFA en Phase 15.

Ce report arrive à échéance ici. Ouvrir les comptes, c'est :

- **multiplier les portes** — chaque salarié est un mot de passe de plus ;
- **rendre les rôles réels** — jusqu'ici, aucune restriction n'était éprouvée en usage ;
- **créer un chemin d'élévation** — une invitation mal contrôlée donne un accès permanent.

**Le MFA est donc livré ici**, comme annoncé, et **obligatoirement disponible pour le rôle PROPRIETAIRE**.

### 2.1 L'invitation est un jeton, pas un compte pré-créé

**Retenu** : le propriétaire crée une invitation portant **un e-mail et un rôle**. Elle produit un jeton **aléatoire, haché en base, expirant, à usage unique**, exactement comme le lien du portail (Phase 10).

Aucun compte n'est créé avant acceptation : un compte créé d'avance est un compte sans mot de passe choisi, donc une porte ouverte en attente.

**Le rôle est figé à l'invitation**, jamais choisi par l'invité. C'est l'évidence même, et c'est précisément le genre d'évidence qu'on oublie de vérifier — un test s'en charge.

### 2.2 On n'invite jamais plus haut que soi

Un ADMINISTRATEUR ne peut pas inviter un PROPRIETAIRE. Sans cette règle, l'invitation devient un mécanisme d'élévation de privilèges : il suffirait d'inviter un complice — ou soi-même sur une autre adresse — pour obtenir les pleins pouvoirs.

### 2.3 Le dernier propriétaire ne peut pas être retiré

Une organisation sans propriétaire est une organisation que plus personne ne peut administrer. Le retrait est refusé avec une explication, pas silencieusement ignoré.

---

## 3. Le MFA : TOTP, sans prestataire

**Retenu** : TOTP (RFC 6238), vérifié localement. Aucun service tiers, aucun SMS — un SMS suppose un prestataire, un coût par message, et reste le second facteur le plus faible.

- secret généré aléatoirement, **stocké en base**, affiché une seule fois ;
- **fenêtre de tolérance d'un pas** (±30 s) pour absorber les dérives d'horloge ;
- **codes de récupération** à usage unique, hachés — sans eux, un téléphone perdu ferme définitivement le compte ;
- activation **volontaire**, jamais imposée : l'imposer à un artisan seul qui n'a pas de gestionnaire de mots de passe le pousserait à noter son secret sur un papier près de l'ordinateur.

**[À VÉRIFIER — SOURCE OFFICIELLE]** Le stockage du secret TOTP en clair en base est le compromis courant ; le chiffrer suppose une clé, donc un secret à protéger ailleurs. Le point est signalé plutôt que tranché à votre place.

---

## 4. Les abonnements : structure, sans encaissement

La décision du **prestataire de paiement** n'est pas prise, et comme pour l'IA elle ne peut pas l'être par le code : elle engage un contrat, des flux financiers et des obligations.

**Retenu** : `Plan` et `Subscription` existent pour porter l'état d'un abonnement, et **rien n'encaisse**. Aucun bouton « payer », aucun montant prélevé, aucun statut « payé » qu'aucun paiement n'aurait produit (§76).

C'est la même règle qu'aux Phases 6, 7 et 11 : **réel ou refusé, jamais simulé**.

---

## 5. Tables

| Table | Rôle | Points d'attention |
|---|---|---|
| `Invitation` | Invitation en attente | Jeton **haché**, rôle **figé**, usage unique, expirant |
| `Plan` | Offre | Libellé, limites |
| `Subscription` | Abonnement d'une organisation | État ; **aucun encaissement** |

Ajouts sur `User` : `totpSecret`, `totpActifLe`, `codesRecuperation`.

---

## 6. Permissions

`membre:inviter` existe depuis la Phase 1 et devient enfin utile. Ajout de `membre:retirer`.

---

## 7. Tests

| Type | Test |
|---|---|
| Unitaire | TOTP : code valide, fenêtre de tolérance, code périmé refusé |
| Unitaire | Codes de récupération : usage unique |
| **Unitaire** | **Un rôle ne peut pas inviter plus haut que lui** |
| **Intégration** | **Le rôle vient de l'invitation, jamais de l'invité** |
| Intégration | Un jeton d'invitation ne sert qu'une fois |
| Intégration | Le dernier propriétaire ne peut pas être retiré |
| Intégration | Un membre invité ne voit que ce que son rôle autorise |

---

## 8. Le défi de second facteur

La connexion se fait désormais en **deux étapes** quand le facteur est actif. Le mot de passe seul n'ouvre **aucune session** : il pose un **défi**, jeton court (5 minutes) dans un cookie `httpOnly`, qui atteste du premier facteur et de rien d'autre.

Ouvrir la session dès le mot de passe, quitte à « demander le code ensuite », donnerait un cookie exploitable à qui ne connaît que le mot de passe — la protection serait décorative.

Le défi est signé avec **la même clé** que la session. Chaque jeton porte donc un marqueur de type, et chaque vérificateur exige le sien : sans cela, un défi correctement signé pourrait être présenté comme cookie de session.

**Deux chemins à l'acceptation d'une invitation**, parce que le risque diffère :

- **adresse sans compte** : création du compte, session ouverte, comme à l'inscription ;
- **adresse ayant déjà un compte** : le mot de passe de ce compte est **exigé**, et **aucune session n'est ouverte**. Sans cela, quiconque intercepterait le lien entrerait dans un compte existant sans jamais l'avoir connu — et contournerait le second facteur au passage. On rattache, puis on renvoie vers la connexion, qui reste la porte unique.

---

## 9. Ce que l'ouverture des comptes a révélé

C'était l'objet même de la phase : *« rendre les rôles réels — jusqu'ici, aucune restriction n'était éprouvée en usage »*. Le premier compte non-propriétaire créé l'a confirmé sur-le-champ.

**L'écran d'accueil était inaccessible à tout rôle sans `devis:lire` et `facture:lire`.** Un apprenti connecté obtenait une erreur serveur sur `/app`, sa propre page d'accueil. Le contrôle de permission avait parfaitement fonctionné ; c'est l'écran qui demandait plus que nécessaire. Chaque bloc n'est désormais **chargé que si le rôle y a droit**.

**La barre de navigation proposait les quinze écrans à tout le monde.** Un apprenti voyait « Devis » et « Factures », les ouvrait, et tombait sur la même erreur. Les liens sont maintenant filtrés par permission — filtrage de **présentation**, la sécurité restant au plus près de la donnée, dans chaque page.

**Une erreur de rôle produisait « A server error occurred ».** Une frontière d'erreur affiche désormais un message utile. Elle ne prétend pas savoir *lequel* des deux cas s'est produit : en production seul un identifiant opaque traverse la frontière, et affirmer « vous n'avez pas les droits » sur une panne réelle enverrait l'artisan chercher un problème de rôle inexistant.

**Les codes de récupération n'étaient jamais affichés.** Trouvé au navigateur, invisible pour les tests : l'action renvoyait bien les huit codes, mais la revalidation déclenchée par l'activation faisait repasser l'écran en « second facteur actif », démontant le composant qui les portait. L'artisan se retrouvait protégé par un facteur dont il n'avait aucun moyen de secours. L'état a été remonté au-dessus de cette bascule.

---

## 10. Ce que les mutations ont montré

Huit mutations appliquées, six détectées immédiatement :

| Mutation | Détectée |
|---|---|
| Session ouverte sur le seul mot de passe | ✅ |
| Code de récupération non consommé | ✅ |
| Rôle lu du formulaire plutôt que de l'invitation | ✅ |
| Mot de passe du compte existant non vérifié | ✅ |
| Marqueur de type retiré des jetons | ✅ |
| Lien de navigation sans permission | ✅ |
| Jeton d'invitation réutilisable — **une seule des deux couches** | ❌ |
| Accueil rechargeant tout sans condition | ❌ (navigateur seulement) |

Les deux non détectées sont dites franchement :

- **l'usage unique du jeton est gardé deux fois** — à la résolution, puis dans la transaction. Retirer l'une laisse l'autre faire le travail, donc aucune mutation simple ne se voit. Retirer **les deux** casse bien les tests : la promesse est couverte, les gardes sont réellement redondantes, ce qui est voulu — la seconde arbitre les envois concurrents, que la première ne voit pas ;
- **le chargement conditionnel de l'accueil n'est couvert par aucun test** : aucun test ne rend cette page. C'est le navigateur qui l'a trouvé, et c'est le navigateur qui le retrouverait.

Rappel de la Phase 14 précédente : une mutation sur `mfa.ts` (retrait du contrôle de format à six chiffres) n'est **pas** détectée — ce contrôle est redondant avec l'exigence de longueur de `timingSafeEqual`. Il n'est pas compté comme couvert.

---

## 11. Écarts entre la spécification et la livraison

| Point | Livré | Écart assumé |
|---|---|---|
| Invitation par jeton haché, expirant, à usage unique | ✅ | — |
| Rôle figé à l'invitation | ✅ | — |
| On n'invite jamais plus haut que soi | ✅ | Vérifié à l'écran **et** au serveur |
| Dernier propriétaire non retirable | ✅ | — |
| TOTP sans prestataire, codes de récupération | ✅ | — |
| `Plan` / `Subscription` sans encaissement | ✅ | Aucun bouton « payer », aucun statut « payé » |
| **Envoi de l'e-mail d'invitation** | ❌ | Le lien est **affiché une fois**, à transmettre soi-même. L'adaptateur e-mail de la Phase 7 existe, mais envoyer une invitation à une adresse non vérifiée depuis le domaine de l'artisan engage sa réputation d'expéditeur : le choix lui revient |
| **QR code du secret TOTP** | ❌ | Saisie manuelle de la clé, prise en charge par toutes les applications d'authentification. Ajouter une bibliothèque de QR pour une chaîne de 32 caractères n'aurait pas valu la surface de code |
| **Changement de rôle d'un membre existant** | ❌ | Retirer puis réinviter fonctionne. Une promotion silencieuse mérite ses propres garde-fous (qui peut promouvoir, jusqu'où, avec quelle trace) — c'est une décision, pas un oubli |
| **Blocage au nombre d'utilisateurs du plan** | ❌ | Bloquer un artisan sur une limite d'un abonnement que rien n'encaisse serait une contrainte sans contrepartie (§76) |
| **Chiffrement du secret TOTP en base** | ❌ | Signalé au §3, non tranché : chiffrer suppose une clé, donc un secret à protéger ailleurs **[À VÉRIFIER — SOURCE OFFICIELLE]** |
| **Second facteur obligatoire** | ❌ | Volontairement facultatif : l'imposer à un artisan seul, sans gestionnaire de mots de passe, le pousserait à noter son secret sur un papier près de l'ordinateur |

Un 404 fugace a été observé au navigateur, émis par le service worker et non reproductible ; aucune des ressources de la coquille hors-ligne ne manque côté serveur (`/hors-ligne`, `/sw.js`, manifeste et icônes répondent tous 200). Il est signalé plutôt que passé sous silence.

---

**Phase 14 livrée.** Tests validés par mutation, parcours navigateur complet (invitation → acceptation → rôle appliqué → MFA → connexion en deux étapes → lien rejoué refusé), et trois défauts d'accès révélés par l'ouverture des comptes, corrigés.
