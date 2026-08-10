# PLOMBÉO — Phase 4 : Catalogue et devis — Spécification

> Produite selon la méthode §70 (étapes 1 à 10).

Phase : **4 — Catalogue + devis (puis devis à variantes)**
Dépendances : Phases 1 à 3
Difficulté : moyenne à élevée
Risque principal identifié en Phase 0 : *« modèle de calcul HT/TVA/remise mal posé dès le départ »*

---

## 1. Objectif

Permettre à l'artisan de chiffrer et d'envoyer une proposition professionnelle. C'est la phase où Plombéo commence à produire un **document qui engage** — d'où une exigence d'exactitude arithmétique et de prudence réglementaire supérieure à tout ce qui précède.

**Critère de réussite global** : depuis une intervention terminée, l'artisan génère un devis reprenant son temps et ses fournitures, ajuste les prix depuis son catalogue, et obtient un document imprimable dont les totaux sont exacts au centime.

---

## 2. Prudence réglementaire — ce que Plombéo ne fera pas

Le cahier des charges est catégorique (§15, §54) : **ne jamais inventer une règle fiscale**. Trois conséquences concrètes pour cette phase.

### 2.1 Les taux de TVA sont saisis, jamais déduits

La France applique plusieurs taux de TVA, et les travaux du bâtiment peuvent relever de taux réduits selon des conditions précises (nature des travaux, ancienneté du logement, attestation du client…). **Plombéo ne décidera jamais seul du taux applicable à une ligne.**

L'artisan choisit le taux par ligne, parmi une liste **qu'il configure lui-même**. L'application ne pré-remplit qu'un taux par défaut, également configuré par lui. Aucune règle du type « si rénovation alors taux réduit » ne sera codée.

**[À VÉRIFIER — SOURCE OFFICIELLE : impots.gouv.fr]** Les taux en vigueur, leurs conditions d'application aux travaux de plomberie, et les éventuelles attestations à fournir par le client relèvent de sources officielles et du conseil de l'expert-comptable de l'artisan.

### 2.2 Les mentions obligatoires ne sont pas devinées

Le document imprimé reprend les informations d'entreprise saisies par l'artisan (§Phase 1) et un bloc de conditions **qu'il rédige lui-même**. Plombéo ne compose aucune mention légale à sa place.

**[À VÉRIFIER — SOURCE OFFICIELLE]** Mentions obligatoires sur un devis de travaux, durée de validité minimale, formalisme du « bon pour accord », règles d'affichage des prix. Un texte par défaut serait plus dangereux qu'un champ vide : l'artisan croirait être couvert.

### 2.3 La règle d'arrondi de la TVA est explicitée, pas supposée

Retenu : la TVA est calculée **par taux**, sur la somme des bases hors taxes de ce taux, et arrondie une seule fois au centime le plus proche.

C'est la pratique courante et celle qui évite les écarts de centimes entre le total affiché et la somme des lignes. **[À VÉRIFIER — SOURCE OFFICIELLE]** que cette méthode d'agrégation et d'arrondi correspond bien à ce qu'exige la réglementation française. La méthode est isolée dans une fonction unique (`calculerTotaux`) pour être modifiable sans toucher au reste.

---

## 3. Arbitrages de périmètre

### 3.1 Devis à variantes — livré, parce que le modèle l'exige

La Phase 0 (§B) proposait de traiter les variantes *après* le devis simple, sans bloquer dessus. Décision retenue : **le modèle de données porte les variantes dès maintenant, l'interface les expose de façon progressive.**

Un devis contient une ou plusieurs propositions (`QuoteOption`). Un devis simple est un devis à une seule proposition — l'artisan n'en voit alors aucune complexité. Ajouter « Essentiel / Confort / Premium » est un bouton. Retrofitter ce modèle après coup aurait coûté une migration des lignes déjà émises.

### 3.2 PDF : impression navigateur, pas de rendu serveur

Le document est une page dédiée avec une feuille de style d'impression, que l'artisan imprime ou enregistre en PDF depuis son navigateur. C'est ce que fait déjà `electricien-devis` dans ce dépôt.

Le rendu **serveur** deviendra nécessaire quand il faudra joindre le PDF à un e-mail automatique — c'est-à-dire en Phase 6, avec l'adaptateur e-mail. L'anticiper ici ajouterait une dépendance sans usage.

### 3.3 Envoi et signature : hors périmètre

Marquer un devis « envoyé » est une **action manuelle** de l'artisan en Phase 4 : l'application ne prétend pas avoir envoyé quoi que ce soit (§76). L'envoi réel arrive en Phase 6, la signature électronique aussi, l'acompte encaissé en Phase 5.

---

## 4. User stories

| # | En tant que | Je veux | Afin de | Priorité |
|---|---|---|---|---|
| US-1 | plombier | tenir un catalogue de mes prestations et fournitures | ne pas retaper mes prix à chaque devis | Doit |
| US-2 | plombier | définir mon taux horaire | chiffrer ma main-d'œuvre vite | Doit |
| US-3 | plombier | créer un devis pour un client | proposer un prix | Doit |
| US-4 | plombier | ajouter des lignes depuis mon catalogue ou en saisie libre | aller vite sans être enfermé | Doit |
| US-5 | plombier | **générer un devis depuis une intervention** | reprendre mon temps et mes fournitures sans ressaisie | Doit |
| US-6 | plombier | appliquer une remise et demander un acompte | m'aligner sur ma pratique commerciale | Doit |
| US-7 | plombier | choisir le taux de TVA de chaque ligne | rester maître de ma fiscalité | Doit |
| US-8 | plombier | proposer plusieurs variantes | laisser le client choisir son niveau | Devrait |
| US-9 | plombier | imprimer un devis propre | le remettre au client | Doit |
| US-10 | plombier | suivre où en sont mes devis | relancer au bon moment | Doit |

---

## 5. Machine à états du devis (§56)

```
BROUILLON ──> PRET ──> ENVOYE ──> ACCEPTE
    │          │         │    └──> REFUSE
    │          │         │    └──> EXPIRE
    └──────────┴─────────┴───────> ANNULE
```

- `BROUILLON` : modifiable librement.
- `PRET` : relu par l'artisan, numéroté, **figé**. Les lignes ne changent plus.
- `ENVOYE` : remis au client (marquage manuel en Phase 4).
- `ACCEPTE` / `REFUSE` / `EXPIRE` : issue.
- `ANNULE` : abandon à tout moment avant l'issue.

**Le numéro est attribué au passage en `PRET`**, pas à la création : numéroter des brouillons abandonnés produirait des trous inexpliqués dans la séquence.

Un devis `ACCEPTE` deviendra facturable en Phase 5. Comme pour l'intervention clôturée, il ne se remodifie pas — une correction passera par un nouveau devis.

---

## 6. Tables

| Table | Rôle | Points d'attention |
|---|---|---|
| `Service` | Prestation du catalogue | Prix unitaire, unité, taux de TVA par défaut, durée indicative |
| `Product` | Fourniture du catalogue | Prix de vente ; le prix d'achat et les marges arrivent en Phase 8 |
| `Quote` | Le dossier de devis | Numéro, client, dates, statut, conditions, notes |
| `QuoteOption` | Une proposition (variante) | Libellé, ordre, remise, pourcentage d'acompte |
| `QuoteLine` | Une ligne d'une proposition | Libellé, quantité, prix unitaire, taux de TVA |
| `CompteurDevis` | Séquence par organisation et par année | Unique sur `(organizationId, annee)` |

**Conventions arithmétiques**, héritées du dépôt et non négociables :

- montants en **centimes** (entiers) ;
- quantités en **milli-unités** (× 1000), pour permettre 1,5 m sans virgule flottante ;
- taux de TVA en **centièmes de pourcent** (2000 = 20 %, 550 = 5,5 %) — un entier, car 5,5 % n'est pas représentable exactement en flottant.

**Les lignes sont figées à la copie.** Une ligne de devis conserve son libellé et son prix au moment de l'ajout : modifier plus tard un article du catalogue ne doit **jamais** changer un devis déjà établi.

---

## 7. Moteur de calcul

Fonctions **pures**, dans `src/lib/calcul.ts`, sans accès base ni réseau — la partie la plus testée de la phase.

```
ligne.totalHt   = arrondi(prixUnitaireCents × quantiteMilli / 1000)
option.baseHt   = Σ lignes.totalHt
option.remise   = arrondi(baseHt × remisePourMille / 1000)
option.totalHt  = baseHt − remise
  (la remise est répartie au prorata sur chaque taux de TVA)
option.tva[t]   = arrondi(baseHtApresRemise[t] × t / 10000)
option.totalTtc = totalHt + Σ tva
option.acompte  = arrondi(totalTtc × acomptePourMille / 1000)
```

Points de vigilance traités et testés :

- **arrondi unique par taux**, jamais ligne à ligne, pour éviter les écarts de centimes ;
- **répartition de la remise au prorata** : l'appliquer sur un seul taux fausserait la TVA ;
- somme des parts arrondies **réajustée** sur la dernière part pour que le total reste exact ;
- aucune opération en virgule flottante sur les montants.

---

## 8. Server Actions

| Action | Permission |
|---|---|
| `creerPrestation`, `modifierPrestation`, `archiverPrestation` | `catalogue:modifier` |
| `creerFourniture`, `modifierFourniture`, `archiverFourniture` | `catalogue:modifier` |
| `creerDevis`, `creerDevisDepuisIntervention` | `devis:modifier` |
| `ajouterLigne`, `modifierLigne`, `supprimerLigne`, `deplacerLigne` | `devis:modifier` |
| `ajouterVariante`, `renommerVariante`, `supprimerVariante` | `devis:modifier` |
| `changerEtatDevis` (transitions validées serveur) | `devis:modifier` |

Toutes revalident l'appartenance de chaque identifiant à l'organisation de la session.

---

## 9. Écrans

| Route | Écran |
|---|---|
| `/app/catalogue` | Prestations et fournitures, taux horaire |
| `/app/devis` | Liste, filtrable par statut |
| `/app/devis/nouveau` | Création |
| `/app/devis/[id]` | Édition : variantes, lignes, totaux en direct |
| `/app/devis/[id]/imprimer` | Document imprimable, sans navigation |

---

## 10. Permissions

Ajout de `catalogue:lire`, `catalogue:modifier`, `devis:lire`, `devis:modifier`, `devis:supprimer`.

| Rôle | catalogue:lire | catalogue:modifier | devis:lire | devis:modifier | devis:supprimer |
|---|---|---|---|---|---|
| PROPRIETAIRE | ✅ | ✅ | ✅ | ✅ | ✅ |
| ADMINISTRATEUR | ✅ | ✅ | ✅ | ✅ | ❌ |
| ASSISTANT | ✅ | ❌ | ✅ | ✅ | ❌ |
| TECHNICIEN | ✅ | ❌ | ✅ | ❌ | ❌ |
| APPRENTI | ✅ | ❌ | ❌ | ❌ | ❌ |
| SOUS_TRAITANT | ❌ | ❌ | ❌ | ❌ | ❌ |
| COMPTABLE | ✅ | ❌ | ✅ | ❌ | ❌ |
| LECTURE_SEULE | ✅ | ❌ | ✅ | ❌ | ❌ |

Le technicien consulte un devis (il doit savoir ce qui a été vendu) mais ne le modifie pas : le prix est une décision du chef d'entreprise.

---

## 11. Événements métier

`service.created/updated/archived`, `product.created/updated/archived`, `quote.created`, `quote.updated`, `quote.ready`, `quote.sent`, `quote.accepted`, `quote.declined`, `quote.expired`, `quote.cancelled`.

---

## 12. Automatisations

Aucune. Les **relances** de devis sans réponse relèvent du moteur d'automatisation (Phase 7) ; l'expiration à la date de validité sera calculée à ce moment-là. En Phase 4, un devis dépassé est signalé à l'écran mais son état ne change pas tout seul.

---

## 13. Tests

| Type | Test |
|---|---|
| Unitaire | Total d'une ligne, quantités fractionnaires, arrondi au centime |
| Unitaire | TVA par taux, multi-taux dans un même devis |
| Unitaire | Remise répartie au prorata, somme des parts exacte |
| Unitaire | Acompte, cas limites (0 %, 100 %) |
| Unitaire | **Absence de dérive** : la somme des composantes égale toujours le total |
| Unitaire | Machine à états du devis, transitions interdites comprises |
| Unitaire | Numérotation : format, remise à zéro annuelle |
| Intégration | Numérotation concurrente : deux devis simultanés n'obtiennent pas le même numéro |
| Intégration | Isolation : devis et catalogue d'un autre artisan inaccessibles |
| Intégration | Un devis `PRET` ne peut plus voir ses lignes modifiées |
| Navigateur | Devis depuis une intervention, variantes, impression |

---

**Spécification Phase 4 prête — passage à l'implémentation.**
