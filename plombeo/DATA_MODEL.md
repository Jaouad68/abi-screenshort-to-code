# Modèle de données — Plombéo

État à la fin de la **Phase 5**. Source de vérité : `prisma/schema.prisma`.

## Principe fondateur

```
Organization (le tenant)
    │
    ├── Membership ──── User          (l'appartenance porte le RÔLE)
    │
    └── [toutes les entités métier des phases suivantes]
```

**Règle non négociable** : toute table métier ajoutée porte `organizationId`, indexé,
avec une clé étrangère en cascade vers `Organization`. Sans cela, le cloisonnement
entre artisans n'est plus garanti.

## Entités

### Organization

Le tenant : une entreprise artisanale. Porte les informations d'entreprise (nom, forme
juridique, SIRET, coordonnées) et, en prévision de la Phase 5, deux colonnes de
mentions légales (`tvaIntracommunautaire`, `assuranceDecennale`) créées dès maintenant
pour éviter une migration ultérieure. Leur **contenu** relève d'une source officielle
française et n'est jamais déduit par l'application.

### User

Compte de connexion. `email` unique et normalisé en minuscules (l'unicité serait
illusoire sans normalisation). `passwordHash` bcrypt.

Un utilisateur peut appartenir à **plusieurs** organisations : le modèle le permet dès
la Phase 1, même si l'interface V1 n'expose pas de bascule.

### Membership

Lien `User` ↔ `Organization`, **porteur du rôle**. Unique sur `(userId, organizationId)`.

Placer le rôle ici plutôt que sur `User` est structurant : un même utilisateur peut être
propriétaire de sa propre entreprise et simple lecteur chez un confrère.

### Session

Session révocable. Le cookie porte un jeton signé, mais **cette table fait autorité** :
une session révoquée ou expirée ici n'authentifie plus.

- `tokenHash` : SHA-256 du jeton, jamais le jeton en clair
- `revokedAt` : révocation explicite, distincte de l'expiration
- `appareil` : user-agent tronqué, pour que l'artisan reconnaisse ses appareils
- **aucune adresse IP** (minimisation RGPD)

### AuditLog

Journal immuable. Pas de colonne `updatedAt` : ces lignes ne se modifient pas.
`organizationId` et `actorUserId` sont **nullables** — un échec de connexion sur un
e-mail inconnu n'est rattachable ni à un utilisateur ni à une organisation.

### Client, Property, Equipment, Consent (Phase 2)

`Client` (particulier ou professionnel) → `Property` (logement / site d'intervention,
porteur du carnet technique) → `Equipment` (matériel installé). `Consent` porte l'état
courant du consentement aux communications commerciales.

**`Address` a été supprimée du modèle esquissé en Phase 0.** Dans ce métier une adresse
n'existe jamais indépendamment : c'est soit l'adresse de facturation d'un client, soit
celle d'un site d'intervention — c'est-à-dire un `Property`. Une table générique aurait
imposé un discriminant de type et une jointure sur chaque écran, sans bénéfice.

**`organizationId` est répété sur `Property`, `Equipment` et `Consent`** alors qu'il
serait déductible depuis `Client`. Dénormalisation volontaire : elle permet de filtrer
par tenant sans jointure (y compris pour la recherche) et rend le cloisonnement
vérifiable table par table plutôt que dépendant d'une chaîne de jointures correcte. Le
risque d'incohérence est neutralisé en écriture, la couche d'accès vérifiant
l'appartenance du parent avant d'écrire.

Contrainte produit assumée sur `Equipment` : **aucun champ obligatoire hors la
catégorie**. Le matériel rencontré est trop divers pour qu'exiger une marque ou un
numéro de série produise autre chose que des fiches vides ou du faux.

### Lead, Appointment, Intervention (Phase 3)

`Lead` (demande entrante) → `Appointment` (rendez-vous) → `Intervention` (exécution),
cette dernière portant `InterventionTask`, `TimeEntry` et `InterventionSupply`.

**L'urgence est un champ de `Lead`, pas une entité séparée.** Une urgence est une
demande avec une priorité différente ; en faire une table distincte aurait dupliqué le
même cycle de vie. Elle sert à qualifier et prioriser — **aucune majoration tarifaire
n'en est déduite**, les règles de prix appartenant à l'artisan (§11).

**`clientMutationId`, unique et nullable**, sur `Intervention`, `InterventionTask`,
`TimeEntry` et `InterventionSupply` : identifiant généré sur l'appareil au moment de la
saisie, qui rend la synchronisation hors-ligne idempotente. La contrainte d'unicité est
une seconde barrière derrière l'`upsert` applicatif.

Les états sont des énumérations explicites, jamais des booléens (§56), et les
transitions vivent dans `src/lib/etats.ts`.

### Service, Product, Quote, QuoteOption, QuoteLine (Phase 4)

`Quote` (dossier) → `QuoteOption` (proposition) → `QuoteLine` (ligne). **Un devis
simple est un devis à une seule proposition** : porter les variantes dans le modèle
dès maintenant évite une migration des lignes déjà émises le jour où l'artisan veut
proposer « Essentiel / Confort / Premium » (§13).

**Les lignes sont figées à la copie** : libellé et prix sont recopiés depuis le
catalogue, jamais référencés. Modifier un article plus tard ne doit pas changer un
devis déjà établi. `origineType`/`origineId` gardent une trace informative, sans clé
étrangère — supprimer un article du catalogue ne doit pas toucher aux devis émis.

**Le numéro n'est attribué qu'au passage en `PRET`**, via `CompteurDevis` et un
incrément atomique en base. Numéroter les brouillons produirait des trous
inexpliqués ; un compteur lu puis réécrit produirait des doublons en concurrence.

Unités : montants en **centimes**, quantités en **milli-unités**, taux de TVA en
**centièmes de pourcent** (2000 = 20 %, 550 = 5,5 %).

### Invoice, InvoiceLine, CreditNote, Payment (Phase 5)

`Invoice` porte ses **totaux figés** (`totalHtCents`, `totalTvaCents`, `totalTtcCents`,
`detailTva`) et une **empreinte** SHA-256, tous écrits à l'émission. C'est la
différence essentielle avec `Quote` : un devis se recalcule, une facture non.

Il n'existe **aucun état « annulée »** après émission, et aucun retour vers
`BROUILLON` : une facture se rectifie par `CreditNote`, jamais par réécriture (§14).

`PARTIELLEMENT_PAYEE` et `PAYEE` sont **dérivés** des `Payment` enregistrés. Les
laisser saisir à la main viderait de sens le suivi des impayés.

`CompteurFacture` porte une séquence par organisation, année **et série** : factures
et avoirs sont numérotés indépendamment.

### Document, Signature (Phase 6)

`Document` couvre **aussi les photos**, distinguées par un champ `moment`
(`AVANT`, `APRES`, `AUTRE`). Une table `Photo` distincte aurait dupliqué le stockage,
les permissions et la recherche pour une seule colonne de différence.

Le rattachement est **polymorphe et facultatif** : `clientId`, `propertyId`,
`interventionId`, `quoteId`, `invoiceId` sont tous nullables. Une photo prise pendant
une intervention est rattachée simultanément à l'intervention, au logement et au
client — c'est dans le carnet du logement qu'on la cherchera dans deux ans.

`cheminStockage` est une **clé produite par le serveur** (`organizationId/aléatoire.ext`),
jamais dérivée du nom fourni. `nomFichier` conserve le nom d'origine pour l'affichage
seulement, et ne sert jamais de chemin.

`Signature` porte `empreinteContenu` (SHA-256) **et** `resumeContenu` en clair : garder
le texte signé lisible sans dépendre de l'application est ce qui rend l'empreinte
vérifiable plus tard. `appareil` est un user-agent tronqué ; **aucune adresse IP** n'est
conservée. Le champ `trace` contient le tracé en `data:image/png;base64`.

### AutomationRule, AutomationExecution, Notification, EmailMessage, ModeleMessage (Phase 7)

`AutomationRule` est **inactive à la création** (`active` par défaut à `false`) :
c'est le modèle de données lui-même qui porte la garantie « Plombéo n'envoie rien
tant que l'artisan ne l'a pas décidé » (§84). L'unicité
`(organizationId, declencheur, delaiJours)` permet plusieurs échéances sur un même
déclencheur — un échéancier de relance à 7, 21 et 45 jours — sans doublon.

`AutomationExecution.cleIdempotence` est **unique globalement**, et non par
organisation : l'identifiant d'entité qu'elle contient l'est déjà. C'est cette
contrainte, et non du code applicatif, qui empêche la double relance.

Les exécutions **écartées** sont conservées avec leur `motif`, pour que l'artisan
puisse lire pourquoi rien n'est parti.

`EmailMessage` est une **file d'attente**, pas un journal d'envoi : un envoi direct
depuis une Server Action lierait la réussite de l'action à la disponibilité du serveur
SMTP. La pièce jointe est une **référence** (`facture:<id>`), pas un fichier stocké —
sur une pièce émise les totaux sont figés, donc le PDF régénéré dans six mois sera
identique, et le conserver n'ajouterait qu'une copie à maintenir.

`Client.relancesDesactivees` exclut un client des relances automatiques.

### Supplier, Purchase, PurchaseLine, StockMovement (Phase 8)

`StockMovement` est un **journal en ajout seul** : le stock d'une référence est la
SOMME de ses mouvements, jamais une colonne `quantiteEnStock` mise à jour en place.
Une colonne ne dirait ni pourquoi le stock a changé, ni quand, ni qui — et un écart
deviendrait impossible à expliquer. Même raisonnement qu'en Phase 5, où le solde d'une
facture est dérivé de ses paiements.

Une correction après comptage écrit un **mouvement d'écart**, elle ne réécrit jamais
l'historique (§57).

`Purchase` est un document **reçu**. Il porte la `referenceFournisseur`, jamais un
numéro attribué par Plombéo, et n'a pas d'empreinte d'intégrité : Plombéo n'en est pas
l'auteur et ne peut rien certifier à son sujet. Ses totaux sont figés à la validation,
comme ceux d'une facture émise. `totalTvaCents` est **saisi**, jamais calculé.

Ajouts sur `Product` : `prixAchatCents` (zéro = **inconnu**, pas gratuit),
`suiviStock` (faux par défaut), `seuilAlerteMilli` (zéro = pas d'alerte), `supplierId`.

### LoginAttempt

Tentatives de connexion, pour l'anti-force brute. Ne contient que l'e-mail tenté et le
résultat — **jamais le mot de passe**. Table purgeable.

## Énumération `Role`

`PROPRIETAIRE`, `ADMINISTRATEUR`, `ASSISTANT`, `TECHNICIEN`, `APPRENTI`,
`SOUS_TRAITANT`, `COMPTABLE`, `LECTURE_SEULE`.

Les huit rôles du cahier des charges (§49) existent en base dès la Phase 1 ; seuls les
deux premiers sont exploités par l'interface V1. Les créer maintenant évite une
migration de rupture à l'ouverture multi-utilisateurs (Phase 14).

Les **permissions** sont définies en code (`src/lib/permissions.ts`), pas en base : tant
que les rôles ne sont pas personnalisables par l'artisan, une table `Permission` serait
de la sur-ingénierie.

## Conventions pour les phases suivantes

| Convention | Raison |
|---|---|
| Montants en **centimes** (entiers) | Aucune erreur d'arrondi sur les calculs financiers |
| Quantités en **milli-unités** (× 1000) | Permet 1,5 ml ou 0,25 h en restant en arithmétique entière |
| **États explicites** plutôt que des booléens | Un devis a 8 états, pas trois cases à cocher (§56) |
| **Soft delete** sur les entités à valeur documentaire | Obligations de conservation (§78) |
| `organizationId` sur toute table métier | Cloisonnement |

## À venir

| Phase | Entités |
|---|---|
| 11 | `AiAction` |
| 13 | `MaintenanceContract`, `Warranty` |
| 14 | `Subscription`, `Plan`, `Invitation`, `SupportTicket` |

Le détail de chacune est arrêté au lancement de la phase concernée, pas d'avance.
