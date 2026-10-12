# PLOMBÉO — Phase 8 : Fournisseurs, achats et stock — Spécification

> Produite selon la méthode §70 (étapes 1 à 10).

Phase : **8 — Fournisseurs, achats, stock**
Dépendances : Phases 1 à 7
Difficulté : faible-moyenne techniquement — **le risque est ailleurs**

---

## 1. Objectif

Savoir ce que les fournitures coûtent réellement, et ne plus découvrir sur le chantier qu'un raccord manque.

**Critère de réussite global** : l'artisan saisit une facture fournisseur en moins d'une minute, retrouve le coût réel d'un chantier, et voit ce qui manque avant de partir — sans jamais avoir à tenir un inventaire qu'il ne tiendra pas.

---

## 2. Le vrai risque de cette phase : la sur-ingénierie

La Phase 0 l'a identifié explicitement : *« sur-ingénierie si trop détaillé pour un indépendant »*. C'est le risque dominant, avant tout risque technique.

Un module de gestion de stock complet — emplacements, lots, inventaires tournants, valorisation multi-méthodes — est **exactement ce qu'un plombier seul n'utilisera jamais**. Il saisira trois articles, oubliera de décrémenter, verra des chiffres faux, et cessera d'ouvrir l'écran. Un stock faux est pire qu'un stock absent : il fait prendre des décisions sur des données inventées.

**Trois principes en découlent :**

### 2.1 Le suivi de stock est *choisi article par article*

Aucun suivi n'est activé par défaut. L'artisan coche `suiviStock` sur les quelques références qui comptent vraiment — un joint à 30 centimes ne mérite pas d'être compté, un chauffe-eau si.

**Sans ce choix, aucune quantité n'est affichée** : mieux vaut ne rien montrer que montrer un chiffre auquel on ne peut pas se fier.

### 2.2 Le stock négatif est *autorisé et signalé*

Un logiciel qui refuse de sortir un article « parce qu'il n'y en a plus en stock » alors que l'artisan l'a physiquement dans les mains le pousse à mentir au logiciel — ou à l'abandonner.

**Retenu** : la sortie est toujours acceptée, et un stock négatif est **affiché comme une anomalie à corriger**, pas comme une erreur bloquante. C'est un signal, pas une barrière.

### 2.3 Aucune décrémentation silencieuse

Les fournitures posées pendant une intervention (Phase 3) ne sortent pas du stock automatiquement. L'artisan **valide** la sortie, ou ne la valide pas.

Une décrémentation automatique paraît séduisante, mais elle rend le stock faux dès la première fourniture saisie approximativement sur un chantier — et personne ne saura plus d'où vient l'écart.

---

## 3. Trois arbitrages comptables

### 3.1 Valorisation : coût du dernier achat, et rien d'autre

Valoriser un stock suppose une **méthode** (PMP, FIFO, coût standard). Le choix a des conséquences fiscales et comptables.

**Retenu pour la V1** : le **prix du dernier achat connu**, affiché comme tel — « dernier prix payé », jamais « valeur du stock ».

**[À VÉRIFIER — SOURCE OFFICIELLE ET EXPERT-COMPTABLE]** La méthode de valorisation des stocks admise et la manière dont elle doit figurer au bilan relèvent du droit comptable français et du régime de l'entreprise. Plombéo **ne produit aucune valorisation de bilan** et n'en tient pas lieu. Afficher un total intitulé « valeur du stock » laisserait croire à un chiffre opposable, ce que §15 et §54 interdisent.

### 3.2 TVA sur achats : enregistrée, jamais interprétée

Le montant de TVA d'une facture fournisseur est **saisi tel qu'il figure sur la facture**. Plombéo ne calcule pas la TVA déductible, ne détermine pas ce qui est récupérable, et ne produit aucune déclaration.

**[À VÉRIFIER — SOURCE OFFICIELLE]** Les conditions de déductibilité relèvent du régime fiscal de l'artisan et de son expert-comptable. C'est la même frontière qu'en Phase 4 sur la TVA collectée : Plombéo enregistre ce qu'on lui donne, il ne conseille pas.

### 3.3 La facture fournisseur n'est pas une pièce de Plombéo

Une facture d'achat est un document **reçu**, pas émis. Elle n'entre donc pas dans la numérotation de Plombéo et n'a aucune empreinte d'intégrité : Plombéo n'en est pas l'auteur et ne peut rien certifier à son sujet.

Elle est enregistrée avec sa référence fournisseur, et le PDF peut y être joint via la GED de la Phase 6.

---

## 4. Ce que la marge veut dire ici

C'est l'apport principal de la phase : jusqu'ici, Plombéo connaissait les prix de vente mais aucun prix de revient.

`Product` reçoit un `prixAchatCents`, mis à jour au fil des achats. La marge d'une ligne devient calculable :

```
marge = prix de vente HT − prix d'achat
```

**Trois précautions :**

- la marge n'est affichée que si un prix d'achat est **connu** — jamais un zéro par défaut, qui afficherait 100 % de marge sur un article non renseigné ;
- elle porte sur les **fournitures**, pas sur la main-d'œuvre : le coût horaire réel d'un artisan (charges, congés, temps non facturable) est un calcul de gestion qui relève de la Phase 9 ;
- elle est un **indicateur**, pas un résultat comptable.

---

## 5. User stories

| # | En tant que | Je veux | Afin de | Priorité |
|---|---|---|---|---|
| US-1 | plombier | enregistrer mes fournisseurs | retrouver un contact et un compte | Doit |
| US-2 | plombier | saisir une facture fournisseur rapidement | savoir ce que j'ai dépensé | Doit |
| US-3 | plombier | connaître le prix d'achat d'une référence | savoir si je la vends assez cher | Doit |
| US-4 | plombier | voir la marge d'un devis | ne pas travailler à perte | Doit |
| US-5 | plombier | suivre le stock des quelques articles qui comptent | ne pas partir sans la pièce | Devrait |
| US-6 | plombier | être alerté quand une référence passe sous un seuil | racheter à temps | Devrait |
| US-7 | plombier | corriger un stock après un comptage | remettre les compteurs d'équerre | Devrait |
| US-8 | plombier | retrouver mes dépenses par période | préparer mon rendez-vous comptable | Devrait |

---

## 6. Tables

| Table | Rôle | Points d'attention |
|---|---|---|
| `Supplier` | Fournisseur | Coordonnées, numéro de compte client |
| `Purchase` | Facture ou ticket d'achat | Référence **du fournisseur**, jamais numérotée par Plombéo |
| `PurchaseLine` | Ligne d'achat | Peut pointer un `Product`, ou rester libre |
| `StockMovement` | Mouvement de stock | **Journal append-only** : le stock est la somme des mouvements |

Ajouts sur `Product` : `prixAchatCents`, `suiviStock`, `seuilAlerteMilli`, `supplierId`.

**Pourquoi un journal de mouvements plutôt qu'une colonne `quantiteEnStock`** : une colonne mise à jour en place ne dit ni *pourquoi* le stock a changé, ni *quand*, ni *qui*. Un écart devient alors impossible à expliquer. Le journal coûte une somme à calculer et rend chaque unité traçable — c'est le même raisonnement qu'en Phase 5 sur les paiements, où le solde est dérivé et jamais saisi.

---

## 7. Server Actions et routes

| Action | Permission |
|---|---|
| `creerFournisseur`, `modifierFournisseur`, `archiverFournisseur` | `achat:modifier` |
| `creerAchat`, `ajouterLigneAchat`, `supprimerLigneAchat`, `validerAchat` | `achat:modifier` |
| `enregistrerMouvementStock` | `stock:modifier` |
| `corrigerStock` (comptage) | `stock:modifier` |
| `sortirFournituresIntervention` | `stock:modifier` |

---

## 8. Permissions

Ajout de `achat:lire`, `achat:modifier`, `stock:lire`, `stock:modifier`.

| Rôle | achat:lire | achat:modifier | stock:lire | stock:modifier |
|---|---|---|---|---|
| PROPRIETAIRE | ✅ | ✅ | ✅ | ✅ |
| ADMINISTRATEUR | ✅ | ✅ | ✅ | ✅ |
| ASSISTANT | ✅ | ✅ | ✅ | ✅ |
| TECHNICIEN | ❌ | ❌ | ✅ | ✅ |
| APPRENTI | ❌ | ❌ | ✅ | ❌ |
| SOUS_TRAITANT | ❌ | ❌ | ❌ | ❌ |
| COMPTABLE | ✅ | ❌ | ✅ | ❌ |
| LECTURE_SEULE | ✅ | ❌ | ✅ | ❌ |

**Le technicien voit et bouge le stock** — c'est lui qui prend les pièces dans le camion — **mais ne voit pas les achats** : les prix d'achat et les conditions fournisseur sont des données de direction.

---

## 9. Événements métier

`supplier.created`, `supplier.updated`, `purchase.created`, `purchase.validated`, `stock.movement_recorded`, `stock.corrected`.

---

## 10. Automatisations

Un déclencheur s'ajoute au moteur de la Phase 7 : **`STOCK_SOUS_SEUIL`**, qui notifie l'artisan quand une référence suivie passe sous son seuil.

Comme toutes les autres, la règle est **inactive par défaut**. L'idempotence suit le mécanisme existant : une alerte par référence et par franchissement, pas une par balayage — sans quoi un article durablement en rupture produirait une alerte toutes les heures, et l'artisan cesserait de les lire.

---

## 11. Tests

| Type | Test |
|---|---|
| Unitaire | Solde de stock = somme des mouvements, y compris négatif |
| Unitaire | Marge calculée seulement si le prix d'achat est connu |
| Unitaire | Totaux d'un achat en arithmétique entière |
| Unitaire | Détection du franchissement de seuil (et non de l'état sous seuil) |
| **Intégration** | **Fournisseurs, achats et mouvements d'un autre artisan inaccessibles** |
| Intégration | Une correction de stock produit un mouvement d'écart tracé, jamais une réécriture |
| Intégration | Une alerte de seuil ne se répète pas à chaque balayage |
| Navigateur | Saisir un achat, voir le prix d'achat remonter sur l'article, sortir du stock, corriger après comptage |

---

## 12. Écarts entre la spécification et la livraison

| Point | Décision retenue |
|---|---|
| `sortirFournituresIntervention` | **Non livré.** Le lien depuis une intervention supposerait de rattacher chaque fourniture saisie sur le chantier à une référence du catalogue, ce que la saisie terrain (Phase 3) ne demande pas — et ne doit pas demander, au risque de l'alourdir. Le mouvement se saisit depuis la fiche de la référence. |
| Déclencheur `STOCK_SOUS_SEUIL` | Livré **en direct** plutôt que par balayage : le franchissement est détecté au moment du mouvement, là où l'on connaît l'état avant et après. Un balayage périodique ne verrait que l'état courant et ne pourrait pas distinguer un franchissement d'une rupture durable. |
| Table `Expense` | Fusionnée dans `Purchase` : une dépense sans fournisseur est un achat sans fournisseur, pas une autre entité. |

## 13. Deux défauts trouvés à la vérification navigateur

- **Le champ « montant de TVA » vide était interprété comme zéro**, alors que l'écran promet qu'un champ vide reprend le total des lignes. Un achat validé sans toucher à ce champ perdait sa TVA. `versCentimes("")` rend `0` : le test doit porter sur la chaîne brute, pas sur sa conversion.
- **La ligne d'achat n'offrait aucun moyen de la rattacher à une référence du catalogue.** Toute la chaîne prix d'achat → marge → stock, qui est la raison d'être de la phase, était donc inatteignable depuis l'interface. Les tests d'intégration passaient : ils créaient le lien directement en base.

---

**Phase 8 livrée.** Tests validés par mutation, parcours navigateur (viewport iPhone),
contraste audité.
