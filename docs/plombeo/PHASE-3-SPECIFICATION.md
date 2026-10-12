# PLOMBÉO — Phase 3 : Terrain — Spécification

> Produite selon la méthode §70 (étapes 1 à 10).

Phase : **3 — Agenda + demandes + interventions + amorce du hors-ligne**
Dépendances : Phases 1 et 2
Difficulté : **élevée** — c'est la synchronisation hors-ligne qui porte le risque
Risque principal identifié en Phase 0 : *« conflits de synchronisation mal gérés → perte de confiance »*

---

## 1. Objectif

Couvrir la journée de travail réelle : recevoir une demande, la planifier, se rendre sur place, exécuter, rendre compte. C'est la phase où Plombéo cesse d'être un fichier client pour devenir l'outil que l'artisan ouvre entre deux chantiers.

**Critère de réussite global** : l'artisan consulte son planning du jour, ouvre l'intervention en cours, saisit son temps, ses fournitures et son compte rendu **en cave sans réseau**, et retrouve tout intact et sans doublon une fois remonté.

---

## 2. Arbitrages de périmètre

Trois décisions de cadrage, toutes assumées et justifiées.

### 2.1 Portée du hors-ligne (décision n°6, ma recommandation appliquée)

**Retenu : capture terrain uniquement.**

Disponible sans réseau : consultation du planning du jour et des informations client/logement associées (déjà synchronisées), création et modification du contenu d'une intervention — tâches, temps passé, fournitures, notes, compte rendu.

**Non disponible sans réseau** : créer un client, créer un rendez-vous, composer un devis. Ces opérations touchent des données partagées ou tarifaires dont la résolution de conflit serait bien plus délicate pour un gain marginal — un devis se rédige au calme, pas accroupi sous un évier. La création complète hors-ligne reste à l'étude pour la Phase 12.

### 2.2 Cartographie (décision n°5) — ne bloque finalement pas cette phase

La Phase 0 (§B) a écarté l'optimisation de tournée : un artisan seul a rarement plus de 3 à 5 rendez-vous par jour, et un tri par horaire suffit. Or **sans optimisation ni calcul d'ETA, aucune API cartographique n'est nécessaire** : l'ouverture dans le GPS se fait par un simple lien `https://maps.google.com/?q=<adresse>` que tout téléphone route vers son application de navigation, sans clé ni contrat.

L'arbitrage précision/souveraineté est donc **reporté** au moment où un besoin réel de calcul d'itinéraire apparaîtra, plutôt que tranché prématurément. Aucun fournisseur n'est engagé.

### 2.3 Photos — reportées en Phase 6, sans faux-semblant

Le cahier des charges attend des photos avant/après sur les interventions (§19) et leur prise hors-ligne (§5). **Elles ne sont pas livrées ici**, pour une raison technique nette : elles exigent un stockage objet, et aucun adaptateur de stockage n'existe encore (il relève de la Phase 6, « Documents »).

Les alternatives ont été écartées : stocker les images en base ne tient pas à la volumétrie ; le système de fichiers local n'existe pas sur un hébergement sans état. Et un adaptateur « Null » qui accepterait la photo sans la conserver serait pire que l'absence de fonctionnalité — l'artisan croirait ses preuves enregistrées. Le §76 l'interdit explicitement.

L'interface annonce donc les photos comme à venir, sans bouton trompeur.

---

## 3. User stories

| # | En tant que | Je veux | Afin de | Priorité |
|---|---|---|---|---|
| US-1 | plombier | voir mon planning du jour dès l'ouverture | savoir quoi faire maintenant (§74) | Doit |
| US-2 | plombier | créer un rendez-vous en quelques gestes | ne pas quitter le téléphone du client | Doit |
| US-3 | plombier | déplacer ou annuler un rendez-vous | absorber les imprévus | Doit |
| US-4 | plombier | enregistrer une demande entrante avec son niveau d'urgence | ne rien oublier entre deux appels | Doit |
| US-5 | plombier | convertir une demande en rendez-vous | passer de l'appel à l'agenda sans ressaisie | Doit |
| US-6 | plombier | démarrer une intervention et la clôturer | suivre où j'en suis | Doit |
| US-7 | plombier | saisir mon temps, mes fournitures et mes tâches | facturer juste, plus tard | Doit |
| US-8 | plombier | rédiger un diagnostic et un compte rendu | garder une trace professionnelle | Doit |
| US-9 | plombier | **travailler sans réseau et retrouver ma saisie intacte** | les caves et les sous-sols n'ont pas de réseau | Doit |
| US-10 | plombier | voir clairement ce qui n'est pas encore synchronisé | ne pas douter de mes données | Doit |

---

## 4. Machines à états (§56)

Aucun état n'est représenté par un booléen.

**`Lead` (demande entrante)**
```
NOUVEAU ──> QUALIFIE ──> CONVERTI      (un rendez-vous a été créé)
   │            │            ▲
   │            │            │
   └────────────┼────────────┘         (planifier convertit directement)
                │
   └────────────┴──────────> ABANDONNE
```

`NOUVEAU → CONVERTI` est volontairement autorisé : planifier un rendez-vous
depuis une demande, c'est l'avoir qualifiée. Exiger un passage explicite par
`QUALIFIE` ajouterait un clic sans valeur — et, dans une première version, faisait
échouer la conversion en silence.

**`Appointment` (rendez-vous)**
```
PLANIFIE ──> CONFIRME ──> EN_COURS ──> TERMINE
    │            │            │
    └────────────┴────────────┴──────> ANNULE
```

**`Intervention`**
```
PLANIFIEE ──> EN_COURS ──> TERMINEE ──> CLOTUREE
     │             │
     └─────────────┴──────> ANNULEE
```
`CLOTUREE` signifie « compte rendu validé par l'artisan ». C'est cet état qui rendra une intervention facturable en Phase 5 — d'où l'importance de le distinguer de `TERMINEE`.

Les transitions sont centralisées dans une fonction pure et testée (`transitionAutorisee`), et non éparpillées dans les écrans : une transition interdite doit être impossible, pas seulement absente de l'interface.

---

## 5. Tables

| Table | Rôle | Points d'attention |
|---|---|---|
| `Lead` | Demande entrante, urgence comprise | L'urgence est un **champ**, pas une entité séparée : une urgence est une demande avec une priorité différente |
| `Appointment` | Rendez-vous | Début/fin, temps de trajet, type, priorité ; rattaché à un client et éventuellement à un logement |
| `Intervention` | Exécution | Rattachée à un rendez-vous (facultatif), un client, un logement, un équipement |
| `InterventionTask` | Tâche/checklist | Ordonnée, cochable |
| `TimeEntry` | Temps passé | Minutes entières ; saisie manuelle |
| `InterventionSupply` | Fourniture utilisée | Libellé libre en Phase 3 ; gagnera un lien vers le catalogue en Phase 4 |

**Idempotence hors-ligne** : `Intervention`, `InterventionTask`, `TimeEntry` et `InterventionSupply` portent un `clientMutationId` **unique et nullable**, généré *au moment de la saisie* sur l'appareil. Un rejeu de la file de synchronisation retombe alors sur la même ligne au lieu d'en créer une seconde. C'est l'exigence explicite du §5 (« protection contre les doublons »).

Toutes ces tables portent `organizationId`, conformément à la règle posée en Phase 1.

---

## 6. Architecture hors-ligne

```
Saisie (appareil)
  → UUID généré LOCALEMENT, immédiatement
  → écriture dans IndexedDB + file de mutations
  → tentative d'envoi
       ├─ succès  → SYNCHRONISE
       ├─ hors-ligne → EN_ATTENTE (réessai au retour du réseau)
       └─ erreur → compteur de tentatives, puis ECHEC signalé à l'artisan
```

**États exposés à l'interface** : `LOCAL`, `EN_COURS`, `SYNCHRONISE`, `ECHEC`. Jamais d'état binaire caché — l'artisan doit pouvoir répondre à « est-ce que c'est parti ? » (US-10).

**Idempotence** : le serveur fait un `upsert` sur `clientMutationId`. Envoyer deux fois la même mutation produit exactement le même résultat qu'une fois.

**Reprise sur erreur** : chaque élément de la file conserve son nombre de tentatives et la dernière erreur. Au-delà du seuil, il passe en `ECHEC` et **remonte visiblement** plutôt que de retenter indéfiniment en silence.

**Conflits** : en Phase 3 la portée hors-ligne (un artisan seul, sur ses propres interventions) rend les conflits réels très improbables. La stratégie retenue est l'ajout additif pour les collections (deux temps saisis sur deux appareils donnent deux lignes, aucune n'est écrasée) et la dernière écriture serveur pour les champs simples. **La résolution fine des conflits avec arbitrage humain reste l'objet de la Phase 12** — la prétendre réglée ici serait malhonnête.

---

## 7. Server Actions

| Action | Permission |
|---|---|
| `creerDemande`, `qualifierDemande`, `abandonnerDemande`, `convertirDemandeEnRendezVous` | `intervention:modifier` |
| `creerRendezVous`, `deplacerRendezVous`, `changerEtatRendezVous`, `annulerRendezVous` | `intervention:modifier` |
| `demarrerIntervention`, `terminerIntervention`, `cloturerIntervention` | `intervention:modifier` |
| `enregistrerContenuIntervention` (tâches, temps, fournitures, notes) — **idempotente** | `intervention:modifier` |
| `POST /api/sync` — réception de la file de mutations, **idempotente** | `intervention:modifier` |

Toutes revalident l'appartenance de chaque identifiant reçu à l'organisation de la session, comme en Phase 2.

---

## 8. Écrans

| Route | Écran |
|---|---|
| `/app` | Tableau de bord recentré sur « que dois-je faire maintenant » : prochain rendez-vous, demandes urgentes, interventions en cours |
| `/app/agenda` | Planning, vue jour par défaut (l'usage mobile dominant), navigation par date |
| `/app/agenda/nouveau` | Création d'un rendez-vous |
| `/app/demandes` | Demandes entrantes, urgences en tête |
| `/app/demandes/nouvelle` | Prise de demande |
| `/app/interventions/[id]` | **Écran de chantier** : état, tâches, temps, fournitures, diagnostic, compte rendu — utilisable hors-ligne |

L'écran de chantier est le plus important de la phase : il doit rester utilisable d'une main, hors réseau, avec des indicateurs de synchronisation lisibles.

---

## 9. Permissions

Ajout de `intervention:lire`, `intervention:modifier`, `intervention:supprimer`.

| Rôle | lire | modifier | supprimer |
|---|---|---|---|
| PROPRIETAIRE | ✅ | ✅ | ✅ |
| ADMINISTRATEUR | ✅ | ✅ | ❌ |
| ASSISTANT | ✅ | ✅ | ❌ |
| TECHNICIEN | ✅ | ✅ | ❌ |
| APPRENTI | ✅ | ❌ | ❌ |
| SOUS_TRAITANT | ✅ | ❌ | ❌ |
| COMPTABLE | ✅ | ❌ | ❌ |
| LECTURE_SEULE | ✅ | ❌ | ❌ |

---

## 10. Événements métier

`lead.created`, `lead.qualified`, `lead.converted`, `lead.abandoned`, `appointment.created`, `appointment.moved`, `appointment.cancelled`, `appointment.status_changed`, `intervention.started`, `intervention.completed`, `intervention.closed`, `intervention.synced`.

Alimentent `AuditLog` ; exploités par le moteur de règles en Phase 7.

---

## 11. Automatisations

Aucune. Les majorations tarifaires liées à l'urgence (soir, week-end, jour férié — §11) sont **enregistrées comme qualification** de la demande, mais **aucune règle tarifaire n'est appliquée** : le catalogue et les prix arrivent en Phase 4, et le cahier des charges interdit d'appliquer automatiquement une règle réglementaire supposée. L'interface ne suggère aucun montant.

---

## 12. Tests

| Type | Test |
|---|---|
| Unitaire | Transitions d'état autorisées et **interdites**, pour les trois machines |
| Unitaire | Calcul du temps total d'une intervention |
| Unitaire | Fusion de la file de synchronisation (déduplication par `clientMutationId`) |
| Unitaire | Politique de réessai (seuil, passage en `ECHEC`) |
| **Intégration** | **Idempotence : rejouer deux fois la même mutation ne crée pas de doublon** |
| Intégration | Isolation : rendez-vous et interventions d'un autre artisan inaccessibles |
| Intégration | Une transition interdite est refusée côté serveur, même forcée |
| **Navigateur** | **Coupure réseau réelle : saisie hors-ligne, retour du réseau, données intactes et sans doublon** |

Les tests d'isolation et d'idempotence seront **validés par mutation**, comme aux phases précédentes.

---

**Spécification Phase 3 prête — passage à l'implémentation.**
