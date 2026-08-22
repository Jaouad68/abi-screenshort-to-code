# PLOMBÉO — Phase 5 : Factures et paiements — Spécification

> Produite selon la méthode §70 (étapes 1 à 10).

Phase : **5 — Factures, avoirs, paiements**
Dépendances : Phases 1 à 4
Difficulté : **élevée** — intégrité financière et contraintes réglementaires
Risque principal identifié en Phase 0 : *« facture émise éditable par erreur »*

---

## 1. Objectif

Transformer un devis accepté ou une intervention clôturée en **facture**, suivre les encaissements, et corriger proprement quand il le faut.

**Critère de réussite global** : une facture émise ne peut plus être modifiée — ni par l'interface, ni par une action forgée — et toute correction laisse une trace sous forme d'avoir.

---

## 2. Le point non négociable : l'immuabilité de la facture émise

Le cahier des charges est explicite (§14) : *« Les factures émises ne doivent pas pouvoir être silencieusement réécrites comme de simples brouillons. Prévoir une stratégie d'intégrité et de traçabilité. »*

Stratégie retenue, à trois niveaux — chacun rattrapant ce que le précédent laisserait passer :

1. **Interdiction applicative.** Toute écriture sur une facture ou ses lignes est refusée dès lors que son état n'est pas `BROUILLON`. Le contrôle est fait **côté serveur, à chaque écriture**, jamais par simple masquage de boutons.
2. **Figeage du contenu à l'émission.** Au passage en `EMISE`, les totaux calculés sont **écrits en base** (`totalHtCents`, `totalTvaCents`, `totalTtcCents`) plutôt que recalculés à l'affichage. Une facture doit afficher demain exactement ce qu'elle affichait le jour de son émission, même si le moteur de calcul évolue.
3. **Empreinte d'intégrité.** Un condensé SHA-256 du contenu (numéro, date, client, lignes, totaux) est calculé à l'émission et stocké. Il permet de **détecter** une altération faite hors application — accès direct à la base, restauration partielle, migration ratée. C'est un mécanisme de détection, pas de protection : il ne prétend pas empêcher une écriture, il empêche qu'elle passe inaperçue.

**Correction = avoir.** Une facture erronée n'est pas modifiée : un avoir (`CreditNote`) l'annule totalement ou partiellement, et une nouvelle facture est émise si nécessaire. C'est ce que décrit le §56 (« CANCELLED/RECTIFIED selon modèle légal retenu »).

**[À VÉRIFIER — SOURCE OFFICIELLE]** Les obligations françaises exactes en matière de facturation — mentions obligatoires, numérotation continue sans rupture, délais et modalités de rectification par avoir, durée de conservation — relèvent de sources officielles (impots.gouv.fr, service-public.fr) et du conseil de l'expert-comptable de l'artisan. Plombéo fournit une structure conforme à la pratique courante ; il ne certifie aucune conformité.

---

## 3. Arbitrages de périmètre

### 3.1 Paiements : réels d'abord, en ligne ensuite

**Livré** : l'enregistrement des encaissements réellement perçus — virement, chèque, espèces, carte en présentiel — avec paiements partiels et calcul du solde. C'est l'essentiel du besoin d'un artisan, et c'est entièrement réel.

**Non livré** : l'encaissement **en ligne** par lien de paiement. Il exige un compte prestataire configuré (Stripe, décision n°1 de la Phase 0). Un adaptateur `PaymentProvider` est posé, avec une implémentation par défaut qui **refuse explicitement** plutôt que de simuler : Plombéo ne prétendra jamais avoir encaissé un paiement qui n'a pas eu lieu (§76). L'activation réelle relève d'une phase de mise en production, une fois les clés fournies.

### 3.2 Facturation électronique : structure préparée, pas d'implémentation aveugle

La Phase 0 (§K) a posé le principe : aucune date, aucun format, aucune obligation ne sera codée en dur. La Phase 5 se limite donc à :

- garder `Invoice` comme **source de vérité**, indépendante de tout format de sortie ;
- ne coder aucune règle qui empêcherait plus tard de produire un format réglementaire ;
- ne **pas** choisir de plateforme de dématérialisation ni implémenter de format tant que le profil de l'artisan et le calendrier applicable ne sont pas vérifiés auprès de sources officielles.

Implémenter aujourd'hui un format supposé serait précisément l'erreur que le cahier des charges interdit.

### 3.3 Envoi et signature : toujours Phase 6

Comme pour les devis, marquer une facture « envoyée » est une **action manuelle**. Plombéo n'envoie rien tant que l'adaptateur e-mail n'existe pas.

### 3.4 Suppression d'un client porteur de pièces comptables : bloquée

Réserve inscrite en Phase 2, honorée ici : la suppression définitive d'un client est désormais **refusée** s'il porte au moins une facture émise. Les documents comptables sont soumis à des obligations de conservation **[À VÉRIFIER — SOURCE OFFICIELLE]**, et une suppression en cascade les emporterait.

---

## 4. Machine à états de la facture (§56)

```
BROUILLON ──> EMISE ──> ENVOYEE ──> PARTIELLEMENT_PAYEE ──> PAYEE
                 │          │                │
                 └──────────┴────────────────┴──────> (avoir)
```

- `BROUILLON` : seul état modifiable.
- `EMISE` : numérotée, totaux figés, empreinte calculée. **Plus aucune modification.**
- `ENVOYEE` : remise au client (marquage manuel).
- `PARTIELLEMENT_PAYEE` / `PAYEE` : **états dérivés des paiements**, pas saisis à la main.
- `EN_RETARD` : dérivé de l'échéance, calculé à l'affichage. Le passage automatique relèvera du moteur d'automatisation (Phase 7).

**Il n'y a pas d'état `ANNULEE` après émission** : une facture émise ne s'annule pas, elle se rectifie par un avoir. C'est le point qui distingue une facture d'un devis.

---

## 5. Tables

| Table | Rôle | Points d'attention |
|---|---|---|
| `Invoice` | Facture | Totaux **figés** à l'émission, empreinte d'intégrité, échéance |
| `InvoiceLine` | Ligne figée | Copiée depuis le devis ou saisie ; jamais une référence |
| `CreditNote` | Avoir | Rattaché à une facture, numéroté dans sa propre séquence |
| `Payment` | Encaissement | Moyen, montant, date, référence ; plusieurs par facture |
| `CompteurFacture` | Séquence par organisation, année et type | Factures et avoirs ont des séquences distinctes |

Type de facture : `STANDARD`, `ACOMPTE`, `SOLDE` — un acompte facturé doit être déductible de la facture de solde.

Moyens de paiement : `VIREMENT`, `CHEQUE`, `ESPECES`, `CARTE`, `AUTRE`.

---

## 6. Server Actions

| Action | Permission |
|---|---|
| `creerFactureDepuisDevis` (option choisie), `creerFactureDirecte` | `facture:modifier` |
| `creerFactureAcompte` | `facture:modifier` |
| `ajouterLigneFacture`, `supprimerLigneFacture` (brouillon uniquement) | `facture:modifier` |
| `emettreFacture` — numérote, fige les totaux, calcule l'empreinte | `facture:emettre` |
| `marquerEnvoyee` | `facture:modifier` |
| `enregistrerPaiement`, `supprimerPaiement` | `facture:encaisser` |
| `creerAvoir` | `facture:emettre` |

`facture:emettre` est **distincte** de `facture:modifier` : émettre est l'acte irréversible.

---

## 7. Écrans

| Route | Écran |
|---|---|
| `/app/factures` | Liste, filtrable ; impayés et retards mis en avant |
| `/app/factures/[id]` | Facture : lignes, paiements, solde, avoirs |
| `/app/factures/[id]/imprimer` | Document imprimable |

---

## 8. Permissions

Ajout de `facture:lire`, `facture:modifier`, `facture:emettre`, `facture:encaisser`.

| Rôle | lire | modifier | émettre | encaisser |
|---|---|---|---|---|
| PROPRIETAIRE | ✅ | ✅ | ✅ | ✅ |
| ADMINISTRATEUR | ✅ | ✅ | ✅ | ✅ |
| ASSISTANT | ✅ | ✅ | ❌ | ✅ |
| TECHNICIEN | ❌ | ❌ | ❌ | ❌ |
| APPRENTI | ❌ | ❌ | ❌ | ❌ |
| SOUS_TRAITANT | ❌ | ❌ | ❌ | ❌ |
| COMPTABLE | ✅ | ❌ | ❌ | ❌ |
| LECTURE_SEULE | ✅ | ❌ | ❌ | ❌ |

L'assistant prépare et encaisse, mais **n'émet pas** : l'émission engage l'entreprise.

---

## 9. Événements métier

`invoice.created`, `invoice.issued`, `invoice.sent`, `payment.recorded`, `payment.removed`, `invoice.paid`, `credit_note.issued`, `invoice.integrity_failed`.

Le dernier est important : une empreinte qui ne correspond plus est un **incident**, pas une donnée d'affichage.

---

## 10. Automatisations

Aucune. Les relances d'impayés relèvent de la Phase 7. En Phase 5, un retard est **signalé** à l'écran, sans changement d'état automatique ni envoi.

---

## 11. Tests

| Type | Test |
|---|---|
| Unitaire | Solde restant, paiements partiels, sur-paiement |
| Unitaire | État dérivé des paiements (partiellement payée, payée) |
| Unitaire | Empreinte d'intégrité : déterministe, et sensible à toute modification |
| Unitaire | Machine à états, transitions interdites comprises |
| Unitaire | Numérotation facture et avoir, séquences distinctes |
| **Intégration** | **Une facture émise refuse toute modification, même par action forgée** |
| Intégration | Les totaux figés ne bougent pas si les lignes sont altérées |
| Intégration | Un avoir réduit le montant dû sans toucher à la facture |
| Intégration | La suppression d'un client porteur de facture émise est refusée |
| Intégration | Isolation entre artisans |
| Navigateur | Devis accepté → facture → émission → encaissement partiel → solde |

Immuabilité et intégrité seront **validées par mutation**, comme aux phases précédentes.

---

**Spécification Phase 5 prête — passage à l'implémentation.**
