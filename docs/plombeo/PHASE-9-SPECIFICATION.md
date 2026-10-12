# PLOMBÉO — Phase 9 : Pilotage et pré-comptabilité — Spécification

> Produite selon la méthode §70 (étapes 1 à 10).

Phase : **9 — Indicateurs, rentabilité, export comptable**
Dépendances : Phases 5 et 8
Difficulté : moyenne — **le risque est la crédibilité des chiffres**

---

## 1. Objectif

Répondre à trois questions qu'un artisan se pose sans jamais avoir le temps d'y répondre : est-ce que je gagne ma vie, quels chantiers me rapportent, et qu'est-ce que j'apporte au comptable.

**Critère de réussite global** : chaque chiffre affiché est soit **constaté**, soit **estimé** — et l'artisan voit lequel des deux, sans avoir à le deviner.

---

## 2. Le risque : confondre réel et estimation

La Phase 0 l'a identifié : *« indicateurs mal définis (confusion réel/estimation) »*. Un tableau de bord qui mélange les deux est pire qu'un tableau de bord absent : il fait prendre des décisions d'entreprise sur des chiffres dont personne ne connaît le statut.

**Trois catégories, jamais mélangées à l'écran :**

| Catégorie | Ce que c'est | Exemple |
|---|---|---|
| **Constaté** | Ce qui est enregistré dans Plombéo | Factures émises, paiements reçus, achats validés |
| **Estimé** | Un calcul de gestion reposant sur une hypothèse saisie | Rentabilité d'un chantier avec un coût horaire déclaré |
| **Non calculable** | Une donnée manque | Marge d'un chantier sans prix d'achat |

**Le troisième cas est le plus important.** Plombéo doit dire « je ne sais pas » plutôt que produire un chiffre par défaut. Un module de pilotage qui affiche zéro là où il ignore est un module qui ment.

---

## 3. Trois arbitrages

### 3.1 « Chiffre d'affaires » n'est pas un mot que Plombéo emploie seul

Le chiffre d'affaires comptable dépend du régime de l'entreprise — comptabilité d'engagement ou de trésorerie — et se constate à la clôture, pas dans un logiciel de gestion.

**Retenu** : Plombéo affiche deux montants distincts et nommés sans ambiguïté :

- **Facturé** : total des factures émises sur la période ;
- **Encaissé** : total des paiements reçus sur la période.

**Jamais un montant unique intitulé « chiffre d'affaires ».** **[À VÉRIFIER — SOURCE OFFICIELLE ET EXPERT-COMPTABLE]** La détermination du chiffre d'affaires et de son rattachement à un exercice relève du régime de l'artisan. Plombéo fournit des totaux de gestion, il ne produit aucun résultat comptable.

### 3.2 Le coût horaire est *déclaré*, jamais déduit

C'est le point qui décide de la sincérité de toute la rentabilité.

Le coût horaire réel d'un artisan intègre ses charges, ses congés, son temps non facturable, ses amortissements. **Aucune de ces données n'est dans Plombéo**, et les déduire du temps saisi produirait un coût faux — donc une rentabilité fausse, affichée avec l'assurance d'un calcul.

**Retenu** : l'artisan **saisit** son coût horaire dans les paramètres de l'entreprise. Tant qu'il ne l'a pas fait :

- la rentabilité d'un chantier n'est **pas affichée** ;
- l'écran explique pourquoi et ce qu'il manque.

Une valeur par défaut serait la pire des solutions : elle produirait des chiffres crédibles et faux.

### 3.3 Aucune prévision

Le cahier des charges évoque la prévision de chiffre d'affaires (§29). La Phase 0 avait tranché : *« sans historique de données, un modèle prédictif est peu fiable »*.

**Retenu pour la V1** : **aucune projection, aucune tendance, aucun modèle.** Uniquement des totaux sur des périodes passées, et des comparaisons entre périodes closes. Une courbe de prévision tracée sur trois mois de données serait une invention graphique.

---

## 4. L'export comptable : neutre et sans prétention

L'artisan doit pouvoir donner quelque chose d'exploitable à son comptable.

**Retenu** : deux exports CSV — **journal des ventes** (factures et avoirs émis) et **journal des achats** (achats validés) — en séparateur point-virgule et BOM UTF-8, comme l'export clients de la Phase 2, pour s'ouvrir correctement dans un tableur français.

**Ce n'est pas un FEC.** Le Fichier des Écritures Comptables répond à un format normé et suppose un plan comptable, des numéros de compte et un journal équilibré, choses que Plombéo n'a pas. **[À VÉRIFIER — SOURCE OFFICIELLE]** Les obligations de tenue et de remise d'un FEC relèvent du régime de l'entreprise et de son expert-comptable. L'export de Plombéo est un **relevé de gestion**, et l'écran le dit.

---

## 5. User stories

| # | En tant que | Je veux | Afin de | Priorité |
|---|---|---|---|---|
| US-1 | plombier | voir ce que j'ai facturé et encaissé ce mois | savoir où j'en suis | Doit |
| US-2 | plombier | comparer avec le mois précédent | voir si ça progresse | Devrait |
| US-3 | plombier | savoir ce qu'un chantier m'a rapporté | mieux chiffrer les suivants | Doit |
| US-4 | plombier | comprendre pourquoi un chiffre manque | ne pas croire à une panne | Doit |
| US-5 | plombier | saisir mon coût horaire | que la rentabilité veuille dire quelque chose | Doit |
| US-6 | plombier | exporter mes ventes et mes achats | préparer mon rendez-vous comptable | Doit |
| US-7 | plombier | voir mes impayés et mon encours | relancer à temps | Doit |

---

## 6. Tables

**Aucune nouvelle table.** Tout se dérive des Phases 5 et 8.

Ajout sur `Organization` : `coutHoraireCents` (zéro = **non renseigné**, jamais « gratuit »).

C'est un choix : un module de pilotage qui stocke ses propres agrégats introduit un risque de divergence avec les données sources. Recalculer coûte quelques requêtes et garantit que le tableau de bord dit exactement ce que disent les factures.

---

## 7. Server Actions et routes

| Action / route | Permission |
|---|---|
| `definirCoutHoraire` | `organisation:modifier` |
| `GET /api/export/ventes` | `facture:lire` + `client:exporter` |
| `GET /api/export/achats` | `achat:lire` |

---

## 8. Permissions

Ajout de `pilotage:lire`.

| Rôle | pilotage:lire |
|---|---|
| PROPRIETAIRE, ADMINISTRATEUR, COMPTABLE | ✅ |
| ASSISTANT, LECTURE_SEULE | ✅ |
| TECHNICIEN, APPRENTI, SOUS_TRAITANT | ❌ |

La rentabilité de l'entreprise n'est pas une donnée de chantier.

---

## 9. Événements métier

`export.accounting_generated`, `organization.updated` (coût horaire).

---

## 10. Automatisations

Aucune. Un indicateur ne déclenche rien : il informe.

---

## 11. Tests

| Type | Test |
|---|---|
| Unitaire | Facturé et encaissé sont deux totaux **distincts** |
| Unitaire | Rentabilité `null` tant que le coût horaire est inconnu |
| Unitaire | Rentabilité `null` si une fourniture n'a pas de prix d'achat |
| Unitaire | Bornes de période : un mois n'empiète pas sur le suivant |
| Unitaire | Comparaison entre deux périodes, y compris depuis zéro |
| **Intégration** | **Les indicateurs d'un autre artisan n'entrent dans aucun total** |
| Intégration | L'export ne contient que les pièces de l'organisation |
| Navigateur | Saisir un coût horaire fait apparaître la rentabilité ; sans lui, l'écran l'explique |

---

## 12. Écarts entre la spécification et la livraison

| Point | Décision retenue |
|---|---|
| Ventilation HT/TVA des avoirs à l'export | **Colonnes laissées vides.** `CreditNote` porte un montant TTC sans ventilation ; la déduire d'un taux supposé serait exactement l'invention que cette phase refuse. |
| Rapprochement des fournitures de chantier | Par **libellé** avec le catalogue. La saisie terrain (Phase 3) n'impose pas de choisir une référence, et l'alourdir pour servir le pilotage serait un mauvais échange. Une fourniture non rapprochée rend le chantier « non calculable », ce qui est visible. |
| Période des exports | Année civile en cours. Un sélecteur de période relève du confort, pas de la garantie. |

---

**Phase 9 livrée.** Tests validés sur les cas de refus, parcours navigateur, exports vérifiés.
