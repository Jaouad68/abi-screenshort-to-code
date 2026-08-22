# PLOMBÉO — Phase 11 : Assistant IA — Spécification

> Produite selon la méthode §70 (étapes 1 à 10).

Phase : **11 — Assistant, dictée, analyse d'image**
Dépendances : Phases 3, 4, 5
Difficulté : **élevée** — le risque est professionnel et juridique, pas technique

---

## 1. Objectif

Faire gagner du temps d'écriture à l'artisan : dicter un compte rendu plutôt que le taper, obtenir un brouillon de devis à partir d'une description, retrouver une information sans naviguer.

**Critère de réussite global** : l'IA fait gagner du temps sur la **rédaction et la recherche**, et **jamais** sur le jugement professionnel — que l'artisan reste seul à porter.

---

## 2. Le §22 est la contrainte structurante

> *« L'IA ne doit jamais se présenter comme remplaçant le diagnostic professionnel du plombier. »*

Ce n'est pas une mention légale à afficher en bas d'écran, c'est une contrainte de **conception**. Un assistant qui écrit « il s'agit probablement d'un joint de culasse défectueux » a déjà franchi la ligne, quel que soit l'avertissement qui l'entoure.

**Ce que l'IA de Plombéo fait :**

| Autorisé | Interdit |
|---|---|
| Mettre en forme un texte dicté par l'artisan | Proposer un diagnostic |
| Reformuler un compte rendu en français correct | Estimer une cause de panne |
| Structurer une description en lignes de devis **sans prix** | Proposer un prix ou un tarif |
| Retrouver un document par une question | Décider d'une action à impact financier |
| Décrire objectivement ce qu'on voit sur une photo | Conclure sur l'état d'un équipement |

Le champ `diagnostic` de la table `Intervention` porte depuis la Phase 3 le commentaire : *« Diagnostic PROFESSIONNEL, saisi par l'artisan. Jamais généré ni déduit par l'application. »* **L'IA n'y écrit jamais.** C'est vérifié par un test.

### 2.1 Aucun prix suggéré

Une IA qui propose un prix propose une décision commerciale. Elle n'a ni le coût de revient de l'artisan, ni son positionnement, ni son marché local.

**Retenu** : les lignes de devis issues d'une dictée arrivent **à zéro euro**, et l'écran le dit. C'est la même frontière qu'en Phase 4 sur la TVA : Plombéo structure, l'artisan décide.

### 2.2 Toute action IA est une proposition, jamais un enregistrement

La Phase 0 le formulait ainsi : *« toute action `ACTION_VALIDATION_REQUISE` bloque sans clic explicite »*.

**Retenu** : l'IA ne produit **jamais** d'écriture directe en base. Elle renvoie un texte ou une structure que l'artisan voit, corrige, puis valide. Aucune exception — pas même pour un compte rendu, qui pourrait finir sur un document remis au client.

---

## 3. Le fournisseur n'est pas choisi

La décision N°9 de la Phase 0 — **fournisseur IA et DPA** — est ouverte, et elle ne peut pas être tranchée par le code : elle engage un contrat de sous-traitance sur des données personnelles.

**Retenu** : un adaptateur `FournisseurIA`, avec la même règle qu'aux Phases 6 et 7 — **réel ou refusé, jamais simulé**. Sans configuration, l'assistant est **indisponible et le dit**. Aucune réponse fabriquée, aucun mode démonstration.

**[À VÉRIFIER — SOURCE OFFICIELLE ET CONSEIL JURIDIQUE]** Le recours à un fournisseur d'IA sur des données de clients suppose au minimum : un accord de sous-traitance, la localisation des traitements, une durée de conservation, et l'information des personnes concernées. Plombéo prépare l'adaptateur ; il ne présume d'aucune conformité.

### 3.1 Ce qui est envoyé au fournisseur est minimisé et annoncé

- **jamais** l'identité du client, son adresse, son téléphone ou son e-mail ;
- **jamais** de données financières — prix, marges, coordonnées bancaires ;
- uniquement le texte technique que l'artisan soumet.

Une fonction de **caviardage** retire les motifs évidents (téléphone, e-mail, code postal) **avant** l'envoi. Elle ne garantit pas l'anonymat — un texte libre peut toujours contenir un nom — et l'interface le dit plutôt que de le laisser croire.

### 3.2 Chaque appel est tracé

Table `AiAction` : ce qui a été demandé, ce qui a été proposé, si l'artisan a accepté ou rejeté. Sans cette trace, il serait impossible de répondre à la question « d'où vient cette phrase ? » sur un document remis à un client.

---

## 4. User stories

| # | En tant que | Je veux | Afin de | Priorité |
|---|---|---|---|---|
| US-1 | plombier | dicter mon compte rendu | ne pas taper avec les mains sales | Doit |
| US-2 | plombier | que mon texte soit mis au propre | qu'il soit lisible par le client | Doit |
| US-3 | plombier | obtenir un brouillon de lignes de devis | gagner la saisie, pas la décision | Devrait |
| US-4 | plombier | corriger avant que ça s'enregistre | rester maître de ce qui sort de chez moi | Doit |
| US-5 | plombier | savoir ce qui est envoyé au prestataire | ne pas exposer mes clients sans le savoir | Doit |
| US-6 | plombier | savoir quand l'assistant n'est pas disponible | ne pas attendre une réponse qui ne viendra pas | Doit |

---

## 5. Tables

| Table | Rôle | Points d'attention |
|---|---|---|
| `AiAction` | Trace d'un appel | Demande, proposition, décision de l'artisan |

---

## 6. Permissions

Ajout de `ia:utiliser` — PROPRIETAIRE, ADMINISTRATEUR, ASSISTANT, TECHNICIEN.

Le technicien l'utilise : c'est lui qui rédige les comptes rendus sur le chantier.

---

## 7. Événements métier

`ai.requested`, `ai.proposed`, `ai.accepted`, `ai.rejected`, `ai.unavailable`.

---

## 8. Tests

| Type | Test |
|---|---|
| Unitaire | Le caviardage retire téléphone, e-mail et code postal |
| Unitaire | Sans configuration, l'appel est refusé avec un message explicite |
| Unitaire | Les lignes proposées ont **toujours** un prix nul |
| **Unitaire** | **Aucune consigne du système ne demande de diagnostic** |
| Intégration | Une proposition n'écrit rien en base tant qu'elle n'est pas validée |
| Intégration | Les traces d'un autre artisan sont inaccessibles |
| Navigateur | L'indisponibilité est annoncée ; la portée de l'assistant est affichée |

---

## 9. Écarts entre la spécification et la livraison

| Point | Décision retenue |
|---|---|
| Dictée vocale | **Non livrée.** La reconnaissance vocale du navigateur (`SpeechRecognition`) n'est pas disponible partout et envoie l'audio à un service tiers non maîtrisé — ce que la minimisation de cette phase interdit. Le champ texte reste dictable par le clavier du téléphone, qui fait le même travail sans intermédiaire supplémentaire. |
| Analyse d'image | **Non livrée.** Décrire une photo de chantier sans conclure sur l'état de l'équipement est une frontière trop fine pour être garantie par une consigne. À reprendre quand un fournisseur sera retenu et que la formulation pourra être éprouvée. |
| `STRUCTURER_DEVIS` | Consigne et normalisation livrées et testées ; l'écran reste à faire. Le mécanisme qui force le prix à zéro est en place. |

---

**Phase 11 livrée.** Garanties §22 rendues vérifiables par des tests validés par
mutation ; indisponibilité vérifiée sur navigateur.
