# PLOMBÉO — Phase 10 : Portail client — Spécification

> Produite selon la méthode §70 (étapes 1 à 10).

Phase : **10 — Espace client sécurisé**
Dépendances : Phases 4, 5, 6
Difficulté : moyenne techniquement — **élevée en exigence de sécurité**

---

## 1. Objectif

Permettre au client de l'artisan de consulter ses devis et ses factures, et d'accepter un devis, sans appeler ni attendre.

**Critère de réussite global** : un client ouvre son lien, voit ses documents **et rien d'autre**, accepte un devis — et l'artisan le sait immédiatement.

---

## 2. Le risque dominant : c'est la première porte non authentifiée

Jusqu'ici, **toute** donnée métier passait par une session Plombéo. Cette phase ouvre un accès à des gens qui n'ont pas de compte. La Phase 0 l'avait signalé : *« fuite de données cross-tenant si permissions mal isolées »*.

### 2.1 Un jeton par client, signé, révocable et daté

**Retenu** : un lien contenant un **jeton opaque** propre au client.

- **Aléatoire, 32 octets** : jamais dérivé de l'identifiant du client, sinon deviner un lien reviendrait à deviner un identifiant ;
- **stocké haché** (SHA-256), comme les jetons de session de la Phase 1 : une fuite de la base ne donne aucun lien utilisable ;
- **révocable** à tout moment par l'artisan, et **daté** — un lien expire ;
- **porteur d'une seule organisation et d'un seul client**, vérifiés à chaque requête.

**Aucun mot de passe côté client.** Demander à un particulier de créer un compte pour lire un devis, c'est garantir qu'il ne le lira pas. Le lien EST l'authentification, ce qui impose qu'il soit traité comme un secret : il ne s'affiche jamais dans une URL journalisée côté client, il est transmis par e-mail (Phase 7).

**[À VÉRIFIER — SOURCE OFFICIELLE]** Le niveau d'authentification approprié pour donner accès à des documents contractuels et à des données personnelles relève d'une appréciation que Plombéo ne tranche pas. Ce mécanisme est celui d'un lien privé ; il n'équivaut pas à une authentification forte.

### 2.2 Ce que le portail ne montre JAMAIS

La Phase 2 a inscrit dans le schéma que `Client.notes` est une note interne qui *« ne doit jamais figurer sur un document remis au client »*. Le portail est le premier endroit où cette règle peut être violée pour de bon.

**Liste blanche stricte.** Le portail ne rend que des champs explicitement autorisés, jamais un objet complet :

| Exposé | Jamais exposé |
|---|---|
| Numéro, date, objet, lignes, totaux | Notes internes du client ou du document |
| Statut du document | Marge, prix d'achat, coût horaire |
| Coordonnées de l'artisan | Autres clients, autres documents |
| Documents rattachés au client | Journal d'audit, exécutions d'automatisation |

Une liste blanche est le seul mécanisme sûr : une liste noire oublie le champ ajouté demain.

### 2.3 Le client peut accepter, jamais modifier

Le portail autorise **une seule écriture** : l'acceptation d'un devis. Rien d'autre — pas de modification de coordonnées, pas de suppression, pas de commentaire libre.

L'acceptation reste soumise à la machine à états de la Phase 4 : un devis non envoyé ou expiré ne s'accepte pas. Elle est journalisée avec la mention explicite qu'elle vient du portail, et non de l'artisan.

### 2.4 Anti-force brute

Un jeton de 32 octets ne se devine pas, mais la route est publique. Elle réutilise la protection de la Phase 1 : tentatives comptées, et **réponse identique** qu'un jeton soit inconnu, révoqué ou expiré — sinon la réponse renseignerait sur l'existence d'un lien.

---

## 3. User stories

| # | En tant que | Je veux | Afin de | Priorité |
|---|---|---|---|---|
| US-1 | client | consulter mon devis sans créer de compte | décider vite | Doit |
| US-2 | client | accepter le devis en ligne | ne pas avoir à rappeler | Doit |
| US-3 | client | retrouver mes factures | vérifier ce que je dois | Doit |
| US-4 | plombier | envoyer le lien à mon client | qu'il se serve seul | Doit |
| US-5 | plombier | révoquer un lien | reprendre la main | Doit |
| US-6 | plombier | savoir que le client a consulté ou accepté | relancer à bon escient | Devrait |

---

## 4. Tables

| Table | Rôle | Points d'attention |
|---|---|---|
| `ClientAccess` | Lien d'accès d'un client | Jeton **haché**, expiration, révocation, dernière consultation |

Une seule table : le portail ne crée aucune donnée métier, il expose l'existant sous un autre angle.

---

## 5. Routes

| Route | Protection |
|---|---|
| `GET /portail/[jeton]` | Jeton valide, non révoqué, non expiré |
| `GET /portail/[jeton]/devis/[id]` | Idem **+ le devis appartient à ce client** |
| `POST` accepter un devis | Idem + état autorisé |

La double vérification est essentielle : un jeton valide ne donne pas accès à un document dont l'identifiant serait deviné. Chaque lecture filtre sur `clientId` **et** `organizationId`.

Le portail vit **hors de `/app`** : aucun composant de l'espace connecté n'y est réutilisé, pour qu'aucune donnée de gestion ne s'y invite par accident.

---

## 6. Permissions

Ajout de `portail:gerer` (créer et révoquer un lien) — PROPRIETAIRE, ADMINISTRATEUR, ASSISTANT.

Le portail lui-même n'utilise **aucun rôle** : son porteur n'est pas un utilisateur de Plombéo.

---

## 7. Événements métier

`portal.access_created`, `portal.access_revoked`, `portal.viewed`, `quote.accepted_by_client`.

---

## 8. Automatisations

Aucune nouvelle règle. L'acceptation d'un devis depuis le portail crée une **notification** (Phase 7) : l'artisan doit l'apprendre sans avoir à regarder.

---

## 9. Tests

| Type | Test |
|---|---|
| Unitaire | Le jeton est aléatoire, jamais dérivé d'un identifiant |
| Unitaire | Validité : expiration et révocation |
| Unitaire | La projection portail ne contient aucun champ interne |
| **Intégration** | **Un jeton ne donne accès qu'aux documents de SON client** |
| **Intégration** | **Le devis d'un autre client, identifiant exact, répond comme inexistant** |
| Intégration | Un jeton révoqué ou expiré est refusé, avec la même réponse qu'un jeton inconnu |
| Intégration | L'acceptation respecte la machine à états et journalise l'origine |
| Navigateur | Ouvrir un lien, lire un devis, l'accepter ; vérifier qu'aucune note interne n'apparaît |

---

## 10. Écarts entre la spécification et la livraison

| Point | Décision retenue |
|---|---|
| Anti-force brute dédié | **Non livré.** Un jeton de 32 octets ne se force pas, et ajouter un compteur sur une route publique ouvre un vecteur de déni de service. À reprendre en Phase 15 avec le rate-limiting global. |
| Documents (GED) au portail | Reporté : la Phase 6 attache des photos de chantier qui contiennent parfois des éléments internes. Les exposer demande un marquage explicite « visible par le client », qui n'existe pas encore. |
| `portal.viewed` | Enregistré comme horodatage sur `ClientAccess` (`vuLe`) plutôt qu'en entrée d'audit : une consultation par jour pendant trois mois noierait le journal. |

## 11. Un test vacueux corrigé

Le test de cloisonnement initial opposait deux clients de **deux organisations
différentes**. Retirer `clientId` du filtre ne faisait alors échouer aucun test : le
filtre d'organisation protégeait seul. Refait avec **deux clients du même artisan**,
il tombe dès qu'on retire le filtre — et c'est justement le scénario réaliste.

---

**Phase 10 livrée.** Tests validés par mutation, parcours navigateur, absence de fuite
vérifiée par sérialisation complète des projections.
