# PLOMBÉO — Phase 2 : CRM — Spécification

> Produite selon la méthode §70 (étapes 1 à 10). L'implémentation suit cette spécification.

Phase : **2 — Clients + logements + équipements**
Dépendances : Phase 1 (organisations, DAL, RBAC, audit)
Difficulté : faible à moyenne
Risque principal identifié en Phase 0 : *« modèle de carnet technique trop rigide pour la diversité des équipements »*

---

## 1. Objectif

Donner à l'artisan le socle de son activité : **qui sont ses clients, où il intervient, et sur quel matériel**. Toutes les phases suivantes s'y accrochent — un rendez-vous se prend chez un client, un devis concerne un logement, une intervention porte sur un équipement.

**Critère de réussite global** : l'artisan peut saisir un client depuis son téléphone en moins d'une minute, retrouver n'importe quelle fiche par une recherche unique, et consulter le carnet technique d'un logement (chaudière, chauffe-eau, numéros de série) avant de s'y rendre.

### Hors périmètre explicite

- Historique des rendez-vous, devis, factures, interventions sur la fiche client : **ces entités n'existent pas encore** (Phases 3 à 5). La fiche prévoit leur emplacement mais n'affiche rien d'inventé.
- Photos et documents rattachés (Phases 3 et 6).
- Garanties et contrats d'entretien (Phase 13) — seule une **date de prochain entretien** indicative est saisissable sur un équipement, sans automatisation (le moteur de relances est en Phase 7).
- Recherche en langage naturel (Phase 11). La Phase 2 livre une recherche par mots-clés.
- Fusion de doublons : signalée comme utile, reportée faute de valeur suffisante en V1 mono-artisan.

---

## 2. Révision du modèle proposé en Phase 0

La Phase 0 listait `Client`, `Address`, `Property`, `Equipment`, `Consent`. **Je révise ce modèle sur un point** :

**`Address` est supprimée en tant qu'entité autonome.** Dans ce métier, une adresse n'existe jamais indépendamment : elle est soit l'adresse de facturation d'un client, soit celle d'un site d'intervention — c'est-à-dire un `Property`. Une table `Address` générique imposerait un discriminant de type et une jointure supplémentaire sur chaque écran, sans bénéfice. L'adresse de facturation est donc portée par `Client`, et l'adresse d'intervention **est** le logement.

Conséquence assumée : si un client a plusieurs sites à la même adresse (rare), l'adresse est saisie deux fois. Ce coût est très inférieur à celui de la normalisation.

---

## 3. User stories

| # | En tant que | Je veux | Afin de | Priorité |
|---|---|---|---|---|
| US-1 | plombier | créer une fiche client en quelques champs | ne pas perdre de temps sur chantier | Doit |
| US-2 | plombier | distinguer un particulier d'un professionnel | adapter mes documents et mes mentions | Doit |
| US-3 | plombier | enregistrer plusieurs logements pour un même client | gérer les propriétaires bailleurs et les syndics | Doit |
| US-4 | plombier | noter les informations d'accès d'un logement (digicode, étage, stationnement) | ne pas rester bloqué devant la porte | Doit |
| US-5 | plombier | tenir le carnet technique d'un logement (chaudière, chauffe-eau, n° de série) | savoir ce qui est installé avant de me déplacer | Doit |
| US-6 | plombier | retrouver un client par son nom, son téléphone ou sa ville | répondre vite au téléphone | Doit |
| US-7 | plombier | archiver un client sans le perdre | garder un fichier propre sans détruire l'historique | Doit |
| US-8 | plombier | enregistrer le consentement d'un client aux communications commerciales | respecter la réglementation avant toute relance | Doit |
| US-9 | plombier | exporter mon fichier client | récupérer mes données, et répondre à une demande d'accès | Doit |
| US-10 | plombier | prendre une note interne sur un client | me souvenir d'un contexte particulier | Devrait |

---

## 4. Critères d'acceptation

**US-1 / US-2 — Client**
- Deux types : `PARTICULIER` (civilité, prénom, nom) et `PROFESSIONNEL` (raison sociale, SIRET, TVA intracommunautaire, nom du contact).
- Un seul champ obligatoire : le **nom d'affichage** (nom du particulier ou raison sociale). Tout le reste est facultatif — un client saisi en urgence entre deux interventions doit pouvoir n'avoir qu'un nom et un téléphone.
- SIRET et code postal validés sur leur **forme** uniquement (14 et 5 chiffres) ; aucune règle fiscale déduite.
- E-mail validé s'il est renseigné.
- La création et la modification sont journalisées.

**US-3 / US-4 — Logement**
- Un client peut avoir 0 à N logements. Un logement appartient à exactement un client.
- Champs : libellé, type (maison, appartement, local commercial, immeuble, autre), adresse complète, complément, étage, digicode, interphone, instructions d'accès, année de construction, notes.
- Le libellé est facultatif : sans lui, l'affichage retombe sur l'adresse.

**US-5 — Carnet technique**
- Un logement contient 0 à N équipements.
- Catégories : chaudière, chauffe-eau, pompe à chaleur, climatisation, adoucisseur, VMC, sanitaire, robinetterie, canalisation, autre.
- Champs : marque, modèle, numéro de série, localisation dans le logement, date de pose, date de fin de garantie, date de prochain entretien, notes.
- **Aucun champ n'est obligatoire hors la catégorie** : la diversité du matériel rencontré rend toute contrainte forte contre-productive (risque identifié en Phase 0). Un équipement peut n'être qu'une catégorie et une note.

**US-6 — Recherche**
- Une barre unique cherche simultanément dans : nom d'affichage, raison sociale, e-mail, téléphone, ville du client, et adresse/ville/libellé des logements.
- Recherche insensible à la casse et aux espaces superflus.
- Les résultats respectent strictement le cloisonnement : jamais un client d'une autre organisation.

**US-7 — Archivage**
- Archiver un client le retire des listes par défaut sans le supprimer (`archivedAt`).
- Un client archivé reste consultable et **restaurable**.
- La suppression définitive est réservée au rôle `PROPRIETAIRE`, exige une confirmation explicite, et est journalisée. Elle supprime en cascade logements et équipements.
- ⚠️ Réserve documentée : une fois les devis et factures introduits (Phases 4-5), la suppression définitive d'un client devra être **bloquée** s'il porte des documents comptables soumis à obligation de conservation **[À VÉRIFIER — SOURCE OFFICIELLE : durée légale de conservation des pièces comptables]**. Cette règle sera posée en Phase 5, pas ici.

**US-8 — Consentements**
- Deux consentements indépendants : communications commerciales par e-mail, par SMS.
- Chaque changement enregistre la date et l'état. L'état courant est lisible sur la fiche.
- Aucun consentement n'est coché par défaut.
- Le consentement n'est **pas** requis pour les messages liés à une prestation en cours (confirmation de rendez-vous, envoi d'un devis) : la distinction sera appliquée par le moteur d'envoi en Phase 7. La Phase 2 se limite à enregistrer fidèlement le consentement commercial.

**US-9 — Export**
- Export CSV des clients de l'organisation courante, encodé UTF-8 avec BOM (sans quoi Excel en français casse les accents).
- Réservé à une permission dédiée, et journalisé (un export massif est une action sensible, §59).

**US-10 — Notes**
- Champ texte libre sur le client et sur le logement, présenté comme **interne** (non destiné à figurer sur un document client).

---

## 5. Tables / modifications base de données

| Table | Rôle | Points d'attention |
|---|---|---|
| `Client` | Particulier ou professionnel | `organizationId` indexé ; `archivedAt` pour l'archivage ; adresse de facturation inline |
| `Property` | Logement / site d'intervention + carnet technique | Rattaché à `Client` **et** porte `organizationId` (voir ci-dessous) |
| `Equipment` | Matériel installé dans un logement | Rattaché à `Property` **et** porte `organizationId` |
| `Consent` | Consentement aux communications commerciales | Unique par `(clientId, type)` ; historisé par `AuditLog` |

**Décision : `organizationId` est répété sur `Property`, `Equipment` et `Consent`**, alors qu'il serait déductible par jointure depuis `Client`. C'est une dénormalisation volontaire :

1. elle permet de filtrer par tenant **sans jointure** sur chaque requête, y compris la recherche ;
2. elle rend le cloisonnement vérifiable table par table, au lieu de dépendre d'une chaîne de jointures correcte ;
3. elle applique la règle posée en Phase 1 (« toute table métier porte `organizationId` ») sans exception, ce qui évite d'avoir à se demander, table par table, si la règle s'applique.

Le risque associé — une incohérence entre l'`organizationId` d'un logement et celui de son client — est neutralisé en écriture : la couche d'accès dérive toujours l'organisation de la session et vérifie l'appartenance du parent avant d'écrire.

Nouvelles énumérations : `ClientType`, `PropertyType`, `EquipmentCategory`, `ConsentType`.

---

## 6. API / Server Actions

| Action | Entrée | Permission |
|---|---|---|
| `creerClient` | type, identité, coordonnées, adresse | `client:modifier` |
| `mettreAJourClient` | id + champs | `client:modifier` |
| `archiverClient` / `restaurerClient` | id | `client:archiver` |
| `supprimerClient` | id + confirmation | `client:supprimer` |
| `definirConsentement` | clientId, type, accorde | `client:modifier` |
| `creerLogement` / `mettreAJourLogement` | clientId + champs | `client:modifier` |
| `archiverLogement` | id | `client:archiver` |
| `creerEquipement` / `mettreAJourEquipement` / `supprimerEquipement` | propertyId + champs | `client:modifier` |
| `GET /api/export/clients` | — | `client:exporter` |

**Règle héritée de la Phase 1, appliquée sans exception** : aucune action ne reçoit d'`organizationId`. Tout identifiant reçu du client (`clientId`, `propertyId`…) est **revalidé contre l'organisation de la session** avant usage — un identifiant valide chez un autre artisan doit se comporter exactement comme un identifiant inexistant.

---

## 7. Écrans

| Route | Écran |
|---|---|
| `/app/clients` | Liste + recherche + bascule « inclure les archivés » |
| `/app/clients/nouveau` | Création |
| `/app/clients/[id]` | Fiche : coordonnées, consentements, logements, notes, actions |
| `/app/clients/[id]/modifier` | Modification |
| `/app/clients/[id]/logements/nouveau` | Ajout d'un logement |
| `/app/logements/[id]` | Carnet technique : accès, équipements (ajout/édition sur place) |
| `/app/logements/[id]/modifier` | Modification du logement |

Le tableau de bord remplace le bloc « Clients et logements — Phase 2 » par un accès réel et un compteur.

---

## 8. Permissions

Ajout de `client:lire`, `client:modifier`, `client:archiver`, `client:supprimer`, `client:exporter`.

| Rôle | lire | modifier | archiver | supprimer | exporter |
|---|---|---|---|---|---|
| PROPRIETAIRE | ✅ | ✅ | ✅ | ✅ | ✅ |
| ADMINISTRATEUR | ✅ | ✅ | ✅ | ❌ | ✅ |
| ASSISTANT | ✅ | ✅ | ❌ | ❌ | ❌ |
| TECHNICIEN | ✅ | ✅ | ❌ | ❌ | ❌ |
| APPRENTI | ✅ | ❌ | ❌ | ❌ | ❌ |
| SOUS_TRAITANT | ✅ | ❌ | ❌ | ❌ | ❌ |
| COMPTABLE | ✅ | ❌ | ❌ | ❌ | ✅ |
| LECTURE_SEULE | ✅ | ❌ | ❌ | ❌ | ❌ |

Le technicien peut modifier : il met à jour le carnet technique depuis le chantier, c'est le cœur de l'usage terrain.

---

## 9. Événements métier

`client.created`, `client.updated`, `client.archived`, `client.restored`, `client.deleted`, `client.exported`, `property.created`, `property.updated`, `property.archived`, `equipment.created`, `equipment.updated`, `equipment.deleted`, `consent.updated`.

Consommés par `AuditLog` en Phase 2 ; le moteur de règles les exploitera en Phase 7.

---

## 10. Automatisations

Aucune. La date de prochain entretien est saisie et affichée, mais ne déclenche **aucun rappel** : le moteur d'automatisation arrive en Phase 7. L'interface ne doit pas laisser croire qu'un rappel partira.

---

## 11. Tests

| Type | Test |
|---|---|
| Unitaire | Validation client (particulier vs professionnel, SIRET, code postal, e-mail) |
| Unitaire | Nom d'affichage calculé selon le type |
| Unitaire | Construction de la clause de recherche (insensibilité casse/espaces) |
| Unitaire | Permissions CRM par rôle |
| Unitaire | Formatage CSV (séparateurs, guillemets, BOM, injection de formule) |
| **Intégration** | **Isolation : un `clientId` valide d'une autre organisation se comporte comme inexistant, en lecture comme en écriture** |
| Intégration | Un logement ne peut être créé sous un client d'une autre organisation |
| Intégration | Archivage : le client disparaît des listes par défaut, reste consultable et restaurable |
| Intégration | Recherche : ne retourne jamais de résultat d'une autre organisation |

Les tests d'isolation seront de nouveau **validés par mutation**, comme en Phase 1 : retirer le contrôle doit faire échouer le test.

---

**Spécification Phase 2 prête — passage à l'implémentation.**
