# PLOMBÉO — Phase 7 : Automatisation, relances et notifications — Spécification

> Produite selon la méthode §70 (étapes 1 à 10).

Phase : **7 — Moteur de règles, relances, notifications, e-mail, PDF serveur**
Dépendances : Phases 1 à 6
Difficulté : **élevée** — l'idempotence et le dosage des relances sont l'essentiel du travail

---

## 1. Objectif

Faire travailler Plombéo quand l'artisan ne le regarde pas : relancer un impayé, prévenir d'un rendez-vous, signaler ce qui traîne — et envoyer réellement les documents par e-mail.

**Critère de réussite global** : une facture échue déclenche **une seule** relance, à la bonne date, avec le PDF joint ; le paiement l'arrête immédiatement ; et l'artisan peut lire, à tout moment, ce qui a été envoyé et ce qui ne l'a pas été.

---

## 2. Cinq arbitrages

### 2.1 L'e-mail : réel ou refusé, jamais simulé

La Phase 6 a laissé l'adaptateur e-mail à cette phase, parce qu'il n'a de sens qu'avec le moteur qui décide *quand* envoyer.

**Retenu** : un adaptateur **SMTP réel** (`nodemailer`), configuré par variables d'environnement. Tout hébergeur en propose un, et cela n'enferme Plombéo chez aucun prestataire.

**Aucune implémentation « Null »**, exactement comme pour le stockage (§76). Sans configuration SMTP, l'envoi est **refusé avec un message explicite**. Un adaptateur qui avalerait un e-mail sans l'envoyer serait le pire des deux mondes : l'artisan croirait son client relancé.

**Aucun mode « console »** non plus. Écrire l'e-mail dans les journaux ressemble trop à un envoi réussi pour qu'on prenne le risque.

### 2.2 Le PDF : côté serveur, sans navigateur

Joindre un devis à un e-mail exige de le produire côté serveur. L'impression navigateur des Phases 4 et 5 ne peut pas servir : il n'y a pas de navigateur dans un cron.

**Retenu** : `pdfkit`, bibliothèque **JavaScript pure**. Écarté : Puppeteer / Chromium sans tête, qui suppose un binaire de 300 Mo et des dépendances système que beaucoup d'hébergements sans état n'offrent pas — on ne fait pas dépendre l'envoi d'une facture de la présence d'un navigateur sur le serveur.

Conséquence assumée : le PDF serveur est **plus sobre** que la page imprimable. Il porte les mentions et les montants, pas la mise en page complète. Les deux rendus coexistent ; c'est le second qui fait foi pour l'artisan qui imprime.

**Les totaux du PDF sont ceux figés en base**, jamais recalculés (§14).

### 2.3 L'idempotence : une clé naturelle, pas un drapeau

Le risque de cette phase est la **double relance**. Un client relancé deux fois pour la même facture, c'est la confiance de l'artisan perdue d'un coup.

**Retenu** : chaque exécution porte une **clé d'idempotence** déterministe — `règle + entité + occurrence` (par exemple `relance-impaye:cmxyz:J+7`) — sous contrainte d'unicité en base. Rejouer le cron retombe sur la même ligne au lieu d'en créer une seconde. C'est le mécanisme déjà retenu pour la synchronisation hors-ligne en Phase 3, pour la même raison.

Un simple booléen « déjà envoyé » ne suffirait pas : entre la lecture et l'écriture, deux exécutions concurrentes verraient toutes deux `false`.

### 2.4 Le dosage des relances : le risque n°1 du cahier des charges

Le §84 identifie explicitement les « automatisations mal calibrées (relances trop agressives) qui dégradent la relation client de l'artisan ». Ce n'est pas un détail de confort : une automatisation qui harcèle le client d'un artisan lui fait plus de mal que pas d'automatisation du tout.

**Garde-fous, non désactivables :**

| Garde-fou | Raison |
|---|---|
| **Plafond de 3 relances** par facture | Au-delà, ce n'est plus une relance, c'est du harcèlement — et c'est au téléphone que ça se règle |
| **7 jours minimum** entre deux relances | Empêche une cascade si plusieurs règles se déclenchent |
| Envoi entre **8 h et 20 h**, **hors week-end** | Un e-mail de relance un dimanche à 6 h abîme la relation |
| **Arrêt immédiat** dès qu'un paiement est enregistré | La facture n'est plus en retard, la relance n'a plus d'objet |
| **Désactivation par client** | Certains clients se gèrent au téléphone, pas par relance automatique |
| **Aucune règle active par défaut** | L'artisan choisit ce qu'il automatise. Rien ne part sans qu'il l'ait décidé |

Le dernier point est le plus important : **à l'installation, Plombéo n'envoie rien**.

### 2.5 Le ton des relances : l'artisan écrit, Plombéo n'invente pas

Les modèles d'e-mail sont **modifiables** et livrés avec un texte par défaut factuel : numéro, montant, date d'échéance.

**Aucune mention d'intérêts de retard, d'indemnité forfaitaire ou de mise en demeure n'est proposée.** Ce sont des notions au régime précis **[À VÉRIFIER — SOURCE OFFICIELLE]**, et un texte par défaut donnerait à l'artisan un faux sentiment de couverture juridique — exactement ce que §15 et §54 interdisent. Une relance Plombéo constate un retard ; elle ne met pas en demeure.

**[À VÉRIFIER — SOURCE OFFICIELLE]** La distinction entre e-mail **transactionnel** (relance d'une facture due, liée à l'exécution du contrat) et e-mail **commercial** (soumis au consentement recueilli en Phase 2) relève du droit applicable. Plombéo traite les relances de facture comme transactionnelles et **ne les soumet pas** au consentement commercial, tout en respectant la désactivation par client. Cette lecture doit être confirmée.

---

## 3. User stories

| # | En tant que | Je veux | Afin de | Priorité |
|---|---|---|---|---|
| US-1 | plombier | que mes impayés soient relancés tout seuls | ne pas y penser et être payé | Doit |
| US-2 | plombier | que la relance s'arrête dès que le client paie | ne pas relancer quelqu'un qui a payé | Doit |
| US-3 | plombier | choisir ce qui est automatisé, rien par défaut | garder la main sur ma relation client | Doit |
| US-4 | plombier | envoyer un devis ou une facture par e-mail, avec le PDF | ne plus imprimer ni scanner | Doit |
| US-5 | plombier | voir ce qui a été envoyé, à qui, et quand | pouvoir répondre à un client qui conteste | Doit |
| US-6 | plombier | savoir quand un envoi a échoué | reprendre la main plutôt que de croire l'affaire faite | Doit |
| US-7 | plombier | retrouver mes alertes au même endroit | ne rien laisser passer | Doit |
| US-8 | plombier | exclure un client des relances automatiques | gérer certains clients au téléphone | Devrait |
| US-9 | plombier | modifier le texte des relances | qu'elles me ressemblent | Devrait |

---

## 4. Tables

| Table | Rôle | Points d'attention |
|---|---|---|
| `AutomationRule` | Règle configurée par l'artisan | **Inactive par défaut** ; déclencheur + délai + action |
| `AutomationExecution` | Une occurrence d'exécution | **Clé d'idempotence unique** ; état, tentatives, erreur |
| `Notification` | Alerte dans l'application | Canal toujours disponible, contrairement à l'e-mail |
| `EmailMessage` | File d'attente d'envoi | Destinataire, sujet, corps, pièce jointe, état, erreur |
| `ModeleMessage` | Modèle de texte | Modifiable ; défaut factuel, sans mention juridique |

Ajout sur `Client` : `relancesDesactivees` (booléen).

**Pourquoi une table `EmailMessage` plutôt qu'un envoi direct** : un envoi direct depuis une Server Action lie la réussite de l'action à la disponibilité du serveur SMTP. Émettre une facture échouerait parce qu'un serveur d'e-mail est lent. La file découple les deux et rend chaque envoi **traçable et rejouable**.

---

## 5. Déclencheurs et actions

**Déclencheurs** (V1, volontairement peu nombreux) :

| Déclencheur | Quand |
|---|---|
| `FACTURE_ECHUE` | Facture émise, échéance dépassée, solde restant dû |
| `DEVIS_SANS_REPONSE` | Devis envoyé, sans réponse depuis N jours |
| `RENDEZ_VOUS_DEMAIN` | Rendez-vous planifié le lendemain |
| `INTERVENTION_A_CLOTURER` | Intervention terminée non clôturée depuis N jours |

**Actions** : `NOTIFIER` (dans l'application) et `ENVOYER_EMAIL`.

Les déclencheurs sont **évalués par balayage périodique**, pas par événement. Un événement manqué (serveur redémarré, cron sauté) serait perdu à jamais ; un balayage rattrape naturellement le retard, et l'idempotence empêche le doublon.

---

## 6. Server Actions et routes

| Action / route | Permission |
|---|---|
| `activerRegle`, `desactiverRegle`, `modifierRegle` | `automatisation:configurer` |
| `modifierModeleMessage` | `automatisation:configurer` |
| `envoyerDocumentParEmail` | `devis:envoyer` / `facture:envoyer` |
| `marquerNotificationLue`, `toutMarquerLu` | `notification:lire` |
| `basculerRelancesClient` | `client:modifier` |
| `GET /api/documents/pdf/[type]/[id]` — PDF serveur | `devis:lire` / `facture:lire` |
| `POST /api/cron/automatisations` — balayage | **Secret partagé**, jamais une session |

Le point d'entrée cron n'est **pas** protégé par une session : aucun humain ne l'appelle. Il exige un secret partagé comparé en **temps constant**, et refuse tout le reste.

---

## 7. Permissions

Ajout de `automatisation:lire`, `automatisation:configurer`, `notification:lire`.

| Rôle | automatisation:lire | automatisation:configurer | notification:lire |
|---|---|---|---|
| PROPRIETAIRE | ✅ | ✅ | ✅ |
| ADMINISTRATEUR | ✅ | ✅ | ✅ |
| ASSISTANT | ✅ | ❌ | ✅ |
| TECHNICIEN | ❌ | ❌ | ✅ |
| APPRENTI | ❌ | ❌ | ✅ |
| SOUS_TRAITANT | ❌ | ❌ | ✅ |
| COMPTABLE | ✅ | ❌ | ✅ |
| LECTURE_SEULE | ✅ | ❌ | ✅ |

Configurer une automatisation, c'est décider ce qui part au nom de l'entreprise : réservé aux deux rôles dirigeants.

---

## 8. Événements métier

`automation.rule_enabled`, `automation.rule_disabled`, `automation.executed`, `automation.failed`, `email.queued`, `email.sent`, `email.failed`, `notification.created`.

---

## 9. Automatisations livrées

Les quatre déclencheurs ci-dessus, **tous inactifs à l'installation**.

Non livré : la purge planifiée des sessions et tentatives expirées réutilisera le même point d'entrée cron, mais relève du durcissement (Phase 15).

---

## 10. Tests

| Type | Test |
|---|---|
| Unitaire | Clé d'idempotence déterministe et discriminante |
| Unitaire | Fenêtre d'envoi : nuit et week-end refusés |
| Unitaire | Plafond de relances et délai minimum |
| Unitaire | Sélection des factures éligibles (échue, solde dû, client non exclu) |
| **Intégration** | **Deux balayages consécutifs ne produisent qu'une seule relance** |
| **Intégration** | **Un paiement enregistré arrête la relance** |
| **Intégration** | **Les règles et notifications d'un autre artisan sont inaccessibles** |
| Intégration | Sans SMTP configuré, l'envoi est refusé et l'échec est visible |
| Intégration | Le cron refuse un secret absent ou erroné |
| Navigateur | Activer une règle, déclencher un balayage, lire la notification et la trace d'envoi |

---

## 11. Écarts entre la spécification et la livraison

| Point | Décision retenue |
|---|---|
| `modifierRegle` séparé | Fusionné dans `enregistrerRegle` (upsert) : créer et modifier une règle sont le même geste pour l'artisan. |
| Événement `automation.executed` | Écrit dans `AutomationExecution`, qui est déjà un journal complet et interrogeable. Le dupliquer dans l'audit n'aurait rien ajouté. |
| Délai sur `RENDEZ_VOUS_DEMAIN` | **Forcé à 0.** Ce déclencheur vise toujours le lendemain ; afficher un délai sans effet est pire qu'un réglage absent. Défaut repéré à la vérification navigateur, pas par les tests. |
| `balayer()` | A reçu un paramètre `organizationId` optionnel. Le cron n'en use pas, mais sans lui le bilan agrège toutes les organisations et ne dit rien d'aucune — ce qui rendait les tests non déterministes. |
| Purge des sessions expirées | Reportée en Phase 15 : la fonction et le point d'entrée cron existent, le branchement relève du durcissement. |

## 12. Vérification de l'envoi réel

Le §76 interdit de prétendre qu'un e-mail est parti. La livraison a donc été vérifiée
**contre un vrai serveur SMTP** monté pour l'occasion, et non par une simulation :

- une facture échue de 30 jours, une règle active, un appel réel au cron ;
- le serveur a reçu un message de 3 944 octets, avec le bon destinataire, le texte
  attendu (« Sauf erreur de notre part… 180,00 € ») et une **pièce jointe PDF de
  2 019 octets** dont le contenu a été extrait et relu ;
- deux appels supplémentaires immédiats : **aucun second message**.

---

**Phase 7 livrée.** Tests validés par mutation, envoi réel vérifié sur le réseau,
parcours navigateur (viewport iPhone), contraste audité.
