# PLOMBÉO — Phase 13 : Contrats d'entretien et garanties — Spécification

> Produite selon la méthode §70 (étapes 1 à 10).

Phase : **13 — Contrats d'entretien, garanties, SAV**
Dépendances : Phases 2, 5, 7
Difficulté : faible-moyenne — **le risque est de promettre une échéance qu'on ne tient pas**

---

## 1. Objectif

Donner à l'artisan un revenu récurrent qu'il n'oublie pas de facturer, et savoir en un coup d'œil si une intervention est couverte par une garantie.

**Critère de réussite global** : un contrat d'entretien produit sa prochaine échéance tout seul, et l'artisan sait, en ouvrant une demande, si l'équipement est encore sous garantie — **sans que Plombéo ne qualifie jamais cette garantie à sa place**.

---

## 2. Trois arbitrages

### 2.1 L'échéance est calculée, la visite ne l'est pas

Un contrat annuel « visite en mars » doit rappeler l'artisan chaque mars. C'est une date, donc calculable.

**Ce qui n'est pas calculable** : que la visite a eu lieu. Plombéo ne coche jamais une visite tout seul — c'est l'intervention réellement clôturée qui fait foi, et c'est elle qui fait avancer l'échéance.

Un logiciel qui avancerait l'échéance à la date prévue plutôt qu'à la visite réelle produirait un contrat « à jour » sans qu'aucun technicien ne soit passé. Sur un contrat d'entretien de chaudière, l'écart est sérieux.

### 2.2 Plombéo ne qualifie aucune garantie

C'est la frontière de cette phase, et elle prolonge celle des Phases 4 et 9 sur la TVA et la comptabilité.

Une garantie a une **nature** (légale, contractuelle, constructeur), une **durée** et des **conditions d'application** qui dépendent du contrat, du produit et du droit applicable. **[À VÉRIFIER — SOURCE OFFICIELLE ET CONSEIL JURIDIQUE]** — notamment l'articulation entre garantie légale de conformité, garantie des vices cachés, garantie de parfait achèvement et garantie décennale, ainsi que leurs points de départ respectifs.

**Retenu** : Plombéo enregistre ce que l'artisan saisit — un libellé, une date de début, une durée — et affiche **« encore couvert » ou « expiré » par simple comparaison de dates**. Il n'en déduit ni la nature, ni l'étendue, ni les obligations qui en découlent. L'écran le dit.

Aucune durée par défaut n'est proposée : suggérer « 10 ans » ou « 2 ans » serait déjà un conseil juridique.

### 2.3 Le contrat ne facture pas tout seul

Une échéance atteinte **crée une notification** (Phase 7), pas une facture.

Émettre une facture est l'acte irréversible qui engage l'entreprise — la Phase 5 en a fait une permission distincte pour cette raison. Une facture générée automatiquement sur un contrat résilié la veille, ou dont la visite n'a pas eu lieu, oblige à un avoir : la correction coûte plus que le geste économisé.

---

## 3. User stories

| # | En tant que | Je veux | Afin de | Priorité |
|---|---|---|---|---|
| US-1 | plombier | enregistrer un contrat d'entretien | avoir du revenu récurrent | Doit |
| US-2 | plombier | être prévenu quand une visite est due | ne pas l'oublier | Doit |
| US-3 | plombier | que l'échéance avance quand la visite a eu lieu | que le suivi reste juste | Doit |
| US-4 | plombier | savoir si un équipement est encore couvert | ne pas refacturer une reprise | Doit |
| US-5 | plombier | suspendre ou résilier un contrat | refléter la réalité | Devrait |
| US-6 | plombier | retrouver les contrats d'un client | préparer un rendez-vous | Devrait |

---

## 4. Tables

| Table | Rôle | Points d'attention |
|---|---|---|
| `MaintenanceContract` | Contrat d'entretien | Périodicité, prochaine échéance **dérivée de la dernière visite** |
| `Warranty` | Garantie enregistrée | Libellé et durée **saisis** ; aucune qualification |

---

## 5. Déclencheur

Ajout au moteur de la Phase 7 : **`CONTRAT_ECHEANCE`** — notifie quand la prochaine visite est due dans N jours.

Comme toutes les autres règles : **inactive par défaut**, idempotente par la clé `déclencheur:contrat:échéance`.

---

## 6. Permissions

Ajout de `contrat:lire` et `contrat:modifier`. Le technicien **lit** (il doit savoir sur place si l'équipement est couvert) mais ne modifie pas : un contrat est un engagement commercial.

---

## 7. Événements métier

`contract.created`, `contract.updated`, `contract.suspended`, `contract.terminated`, `contract.visit_recorded`, `warranty.created`.

---

## 8. Tests

| Type | Test |
|---|---|
| Unitaire | Prochaine échéance selon la périodicité, y compris fin de mois |
| Unitaire | Couverture d'une garantie : bornes incluses, jamais de durée déduite |
| Unitaire | Un contrat suspendu ou résilié ne produit aucune échéance |
| **Intégration** | **L'échéance n'avance qu'après une visite réellement enregistrée** |
| Intégration | Les contrats d'un autre artisan sont inaccessibles |
| Intégration | Le déclencheur ne notifie qu'une fois par échéance |

---

## 9. Un test manquant, trouvé par mutation

La première série de tests **ne couvrait pas la promesse centrale** de la phase : faire
avancer `derniereVisiteLe` depuis le moteur ne cassait aucun test. Une ligne ajoutée par
distraction aurait produit des contrats « à jour » sans qu'aucun technicien ne soit
passé. Test ajouté — le moteur notifie, et le contrat reste sans visite enregistrée.

Un scénario de vérification navigateur était lui aussi vide de sens : contrat démarré et
visite enregistrée le même jour donnent la même échéance. Repris avec une date de début
distincte, il montre le décalage réel (15 mars 2027 → 10 août 2027).

---

**Phase 13 livrée.** Tests validés par mutation, parcours navigateur, cloisonnement
vérifié.
