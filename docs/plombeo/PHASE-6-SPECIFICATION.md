# PLOMBÉO — Phase 6 : Documents, photos et signature — Spécification

> Produite selon la méthode §70 (étapes 1 à 10).

Phase : **6 — GED, photos d'intervention, signature**
Dépendances : Phases 1 à 5
Difficulté : moyenne, sauf sur la signature où le risque est **juridique** et non technique

---

## 1. Objectif

Donner à Plombéo une mémoire documentaire : ranger les pièces, photographier les chantiers, et faire signer un bon d'intervention sur place.

**Critère de réussite global** : l'artisan photographie une fuite avant travaux, la retrouve sur la fiche du logement, et fait signer le bon d'intervention par le client sur son téléphone — le tout sans qu'aucune fonctionnalité ne prétende faire plus qu'elle ne fait.

---

## 2. Trois arbitrages, dont un juridique

### 2.1 Stockage : le disque d'abord, l'objet ensuite — jamais le vide

Les photos et documents exigent un stockage de fichiers. Aucun fournisseur objet n'est configuré à ce stade.

**Retenu** : un adaptateur `StockageProvider` à deux implémentations :

- **disque local** — écrit réellement les fichiers. Fonctionne en développement et sur tout hébergement doté d'un disque persistant ;
- **objet compatible S3** — prêt, activé par configuration, pour l'hébergement sans état (décision d'architecture n°2).

**Aucune implémentation « Null »**. Un adaptateur qui accepterait un fichier sans le conserver serait pire que l'absence de fonctionnalité : l'artisan croirait ses preuves de chantier enregistrées. Si aucun stockage n'est configuré, l'envoi est **refusé avec un message clair** (§76).

**Aucun bucket public.** Les fichiers ne sont jamais servis directement : ils passent par une route qui vérifie la session, l'organisation et la permission avant de streamer l'octet (§46).

### 2.2 Signature : simple et assumée comme telle

La décision n°4 de la Phase 0 (niveau de signature) est **toujours ouverte**. Plutôt que de la trancher à votre place, la Phase 6 livre ce qui est réalisable sans engager de prestataire :

**Une signature manuscrite capturée sur l'appareil**, accompagnée de :

- l'horodatage serveur ;
- le nom du signataire, saisi ;
- l'**empreinte SHA-256 du contenu signé**, qui permet de prouver que le document n'a pas changé depuis ;
- une entrée d'audit inaltérable ;
- l'appareil (user-agent tronqué) — **aucune adresse IP** (minimisation).

**Ce que Plombéo dira à l'artisan, en toutes lettres dans l'interface** : il s'agit d'une signature *simple*. Sa valeur probatoire est celle d'un commencement de preuve, appréciée au cas par cas. Une signature **avancée ou qualifiée** — celle qu'exigerait un devis de travaux d'un montant important — nécessite un prestataire spécialisé.

**[À VÉRIFIER — SOURCE OFFICIELLE ET CONSEIL JURIDIQUE]** Le niveau de signature électronique requis selon la nature et le montant de l'engagement relève du règlement eIDAS et du droit français. Plombéo ne qualifie pas juridiquement la signature qu'il produit ; il en documente précisément le mécanisme pour que le conseil de l'artisan puisse l'apprécier.

Prétendre le contraire serait exactement le type de fausse garantie que le §76 interdit.

### 2.3 Envoi par e-mail : reste en Phase 7

Le découpage de la Phase 0 place « Automatisations + notifications » en Phase 7. L'adaptateur e-mail y appartient : il n'a de sens qu'avec le moteur qui décide *quand* envoyer. La Phase 6 ne prétend donc toujours envoyer aucun document.

Conséquence assumée : la génération **serveur** du PDF, nécessaire pour joindre un document à un e-mail, reste elle aussi en Phase 7. L'impression navigateur suffit tant que rien n'est envoyé automatiquement.

---

## 3. User stories

| # | En tant que | Je veux | Afin de | Priorité |
|---|---|---|---|---|
| US-1 | plombier | photographier l'existant avant de commencer | prouver l'état initial | Doit |
| US-2 | plombier | photographier après travaux | montrer le résultat | Doit |
| US-3 | plombier | retrouver les photos d'un logement | préparer une prochaine visite | Doit |
| US-4 | plombier | joindre un document à un client, un logement ou une intervention | tout garder au même endroit | Doit |
| US-5 | plombier | étiqueter et rechercher mes documents | les retrouver vite | Devrait |
| US-6 | plombier | faire signer le bon d'intervention sur place | clore proprement | Doit |
| US-7 | plombier | savoir ce que vaut cette signature | ne pas me croire couvert à tort | Doit |
| US-8 | plombier | supprimer un document versé par erreur | garder un dossier propre | Devrait |

---

## 4. Tables

| Table | Rôle | Points d'attention |
|---|---|---|
| `Document` | Pièce versée : photo, PDF, scan | Rattachement **polymorphe** facultatif (client, logement, intervention, devis, facture) |
| `Signature` | Signature apposée | Empreinte du contenu signé, horodatage, appareil |

**`Document` couvre aussi les photos**, avec un champ `moment` (`AVANT`, `APRES`, `AUTRE`). Créer une table `Photo` distincte aurait dupliqué le stockage, les permissions et la recherche pour une seule colonne de différence.

Champs notables : `categorie`, `nomFichier`, `mimeType`, `tailleOctets`, `cheminStockage`, `tags` (liste), `moment`, `versePar`, `archivedAt`.

---

## 5. Contrôle des uploads (§46)

- **Type MIME vérifié côté serveur**, à partir des octets réels et non de l'extension ni de l'en-tête déclaré ;
- liste blanche stricte : images (JPEG, PNG, WebP, HEIC) et PDF ;
- **taille plafonnée** (10 Mo par fichier) ;
- nom de fichier **régénéré** côté serveur — un nom fourni par le client ne sert jamais de chemin ;
- chemin de stockage jamais construit à partir d'une donnée client (aucune traversée de répertoire possible) ;
- servi avec `Content-Disposition: attachment` et `X-Content-Type-Options: nosniff` pour qu'un fichier ne s'exécute jamais dans le navigateur.

---

## 6. Server Actions et routes

| Action | Permission |
|---|---|
| `televerserDocument` | `document:modifier` |
| `supprimerDocument` | `document:supprimer` |
| `modifierTagsDocument` | `document:modifier` |
| `signerDocument` / `signerIntervention` | `document:signer` |
| `GET /api/documents/[id]` — flux contrôlé, jamais public | `document:lire` |

---

## 7. Permissions

Ajout de `document:lire`, `document:modifier`, `document:supprimer`, `document:signer`.

| Rôle | lire | modifier | supprimer | signer |
|---|---|---|---|---|
| PROPRIETAIRE | ✅ | ✅ | ✅ | ✅ |
| ADMINISTRATEUR | ✅ | ✅ | ✅ | ✅ |
| ASSISTANT | ✅ | ✅ | ❌ | ❌ |
| TECHNICIEN | ✅ | ✅ | ❌ | ✅ |
| APPRENTI | ✅ | ❌ | ❌ | ❌ |
| SOUS_TRAITANT | ✅ | ❌ | ❌ | ❌ |
| COMPTABLE | ✅ | ❌ | ❌ | ❌ |
| LECTURE_SEULE | ✅ | ❌ | ❌ | ❌ |

Le technicien signe : c'est lui qui est sur place avec le client.

---

## 8. Événements métier

`document.uploaded`, `document.deleted`, `document.signed`, `signature.created`.

---

## 9. Automatisations

Aucune. La politique de **conservation** des documents (§36) suppose des règles de rétention datées, qui relèvent d'obligations légales **[À VÉRIFIER — SOURCE OFFICIELLE]** et du moteur de règles (Phase 7). En Phase 6, rien n'est purgé automatiquement.

---

## 10. Tests

| Type | Test |
|---|---|
| Unitaire | Détection du type réel à partir des octets, refus des types non autorisés |
| Unitaire | Plafond de taille |
| Unitaire | Génération du chemin de stockage : jamais dérivé d'une donnée client |
| Unitaire | Empreinte de signature : déterministe et sensible au contenu |
| **Intégration** | **Un document d'un autre artisan est inaccessible, y compris par son URL directe** |
| Intégration | Un fichier non autorisé est refusé et rien n'est écrit sur le disque |
| Intégration | La signature fige l'empreinte du contenu signé |
| Navigateur | Photo avant/après sur une intervention, signature du bon, document sur une fiche client |

---

## 11. Écarts entre la spécification et la livraison

| Point | Décision retenue |
|---|---|
| `modifierTagsDocument` | **Non livré.** Les étiquettes se saisissent au versement ; les modifier après coup suppose une édition en place qui n'apporte rien tant que la recherche fonctionne. À reprendre si l'usage le demande. |
| `signerDocument` | **Non livré.** Seule l'intervention est signable en Phase 6. Signer un devis relève de son acceptation, traitée en Phase 4, et exigerait de figer le document signé — donc la génération serveur du PDF, reportée en Phase 7. |
| Événement `document.signed` | Remplacé par le seul `signature.created` : deux événements pour un même fait auraient dédoublé le journal. |
| Résumé signé | **Reconstruit côté serveur** depuis la base, alors que la spécification ne le précisait pas. Une empreinte calculée sur un texte fourni par le navigateur n'attesterait que de ce que le client a bien voulu envoyer. |
| Rubriques vides du bon signé | **Omises** plutôt qu'affichées vides : le client signe un texte, pas un formulaire à trous. |

---

**Phase 6 livrée.** Tests validés par mutation, parcours vérifié sur navigateur
(viewport iPhone), contraste audité.
