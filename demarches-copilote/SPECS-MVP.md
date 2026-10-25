# Spécification MVP : Copilote démarches

Version 0.1, octobre 2026. Les valeurs réglementaires citées (tarifs, durées,
délais) sont des **valeurs initiales à vérifier sur la fiche source** avant
publication : elles vivent dans le catalogue de contenu, jamais en dur dans le code.

---

## 1. Contexte

**Problème.** Les démarches administratives sont éclatées entre organismes
(ANTS, caisses de retraite, impôts), rédigées en jargon et pleines de délais.
Les seniors et les familles peu à l'aise avec le numérique ont peur de se tromper,
oublient les échéances et ne comprennent pas les courriers qu'ils reçoivent.

**Utilisateurs cibles.**
- *Usager senior* (65 ans et plus), sur smartphone, vue et dextérité parfois réduites.
- *Aidant* (enfant de 35 à 55 ans) qui installe l'appli pour son parent et paie souvent l'abonnement. Le mode aidant arrive en V1, mais l'aidant est l'acheteur dès le MVP.

**Résultat attendu.** L'usager sait **quoi faire, avec quelles pièces, avant quelle date**,
fait sa démarche lui-même sur le site officiel, et n'oublie aucune échéance.

---

## 2. Périmètre

| Inclus dans le MVP | Exclu (jamais) | Plus tard |
|---|---|---|
| Parcours CNI / passeport | Saisie ou stockage des identifiants de l'usager (FranceConnect, impots.gouv…) | Mode aidant / famille (V1) |
| Parcours retraite (demande unique et pension de réversion) | Dépôt de la démarche à la place de l'usager | Parcours CAF, déménagement, permis, France Travail (V1) |
| Parcours « préparer ma déclaration de revenus » | Conseil fiscal ou juridique personnalisé | Simulateurs OpenFisca (V1) |
| Décodeur de courrier | Données de santé (pas d'hébergement HDS) | Modèles de courriers, aide humaine payante (V1) |
| Coffre-fort chiffré côté client | Collecte du NIR en champ structuré | Lettre recommandée électronique, FranceConnect (V2) |
| Rappels et échéancier | Carte grise pour autrui (habilitation SIV) | MDPH / APA avec hébergeur HDS (V2) |
| Suivi de dossier (saisie manuelle) | | |
| Assistant IA sourcé (questions sur les 3 parcours) | | |
| Offre gratuite et abonnement Sérénité | | |
| Accessibilité : taille de texte, lecture vocale, contraste | | |

---

## 3. User stories et critères d'acceptation

Priorité MoSCoW : **M** = indispensable, **S** = important, **C** = si le temps le permet.

### US01 (M) : Comprendre que l'appli n'est pas officielle
En tant qu'usager, je veux savoir dès l'ouverture que l'application est privée,
afin de ne pas la confondre avec un service de l'État.
- Étant donné un premier lancement, quand l'onboarding s'affiche, alors le dernier écran (3 sur 3) affiche « Service privé, non affilié à l'administration » et le bouton « J'ai compris » enregistre `profiles.disclaimer_accepted_at`. Le choix de la taille du texte vient en premier, pour que la suite soit lisible.
- Étant donné un usager connecté, quand il ouvre n'importe quel parcours, alors un bandeau persistant rappelle la non-affiliation et le lien vers le site officiel (RG01).
- Étant donné `disclaimer_accepted_at` vide, quand l'usager tente d'ouvrir un parcours, alors il est renvoyé à l'onboarding.

### US02 (M) : Créer un compte sans mot de passe
En tant qu'usager, je veux me connecter avec un code reçu par e-mail ou avec Apple / Google,
afin de ne pas avoir de mot de passe à retenir.
- Étant donné une adresse e-mail valide, quand je demande un code, alors je reçois un code à 6 chiffres valable 10 minutes.
- Étant donné un code expiré ou faux 5 fois de suite, quand je le saisis, alors un message clair propose d'en recevoir un nouveau.
- Étant donné une connexion réussie, alors une ligne `profiles` existe pour mon compte.

### US03 (M) : Régler la lisibilité
En tant que senior, je veux agrandir le texte et activer la lecture vocale,
afin de lire sans effort.
- Étant donné l'onboarding, quand je choisis une taille parmi 4 (100 %, 125 %, 150 %, 200 %), alors tout le texte de l'appli suit cette taille sans tronquer de bouton.
- Étant donné la lecture vocale activée, quand j'appuie sur l'icône haut-parleur d'un écran, alors son contenu principal est lu en français.
- Étant donné la taille 200 %, alors aucune cible tactile ne fait moins de 48 × 48 points.

### US04 (M) : Trouver ma démarche
En tant qu'usager, je veux choisir ma démarche parmi de grandes tuiles ou à la voix,
afin de commencer sans chercher.
- Étant donné l'accueil, alors au plus 4 tuiles sont visibles : Carte d'identité / passeport, Retraite, Impôts, Lire un courrier.
- Étant donné le micro activé, quand je dis « je dois refaire ma carte d'identité », alors le parcours CNI / passeport est proposé en premier.
- Étant donné une démarche en cours, alors elle apparaît en haut de l'accueil avec sa prochaine étape.

### US05 (M) : Obtenir un diagnostic personnalisé
En tant qu'usager, je veux répondre à quelques questions simples,
afin de connaître exactement ma démarche, son coût et ses étapes.
- Étant donné un parcours, alors chaque question occupe un écran et propose au plus 4 réponses.
- Étant donné mes réponses, quand le diagnostic se termine, alors j'obtiens : coût officiel (RG03), pièces à fournir, étapes, lien officiel et la mention « gratuit sur le site officiel » si le coût est nul (RG01).
- Étant donné une réponse modifiée, quand je reviens en arrière, alors le résultat est recalculé.
- Étant donné un cas non couvert (ex. Français né à l'étranger sans acte en France), alors l'appli le dit et renvoie vers la fiche officielle plutôt que d'inventer.

### US06 (M) : Préparer mes pièces
En tant qu'usager, je veux une liste de pièces que je coche en scannant mes documents,
afin d'arriver complet à mon rendez-vous.
- Étant donné la checklist, quand je scanne une pièce, alors elle est recadrée, chiffrée sur l'appareil, envoyée au coffre et associée à l'exigence.
- Étant donné un justificatif de domicile daté de plus de 12 mois, alors la pièce est marquée « trop ancienne » avec l'explication (RG04).
- Étant donné une pièce déjà présente et valide dans le coffre, alors elle est proposée en un tap.

### US07 (M) : Être guidé sur le site officiel
En tant qu'usager, je veux une aide champ par champ pendant que je remplis le site officiel,
afin de ne pas me tromper.
- Étant donné l'étape « pré-demande », quand j'appuie sur « Ouvrir le site officiel », alors le site s'ouvre dans le navigateur système (pas une WebView qui pourrait capter la saisie).
- Étant donné le mode côte à côte, alors chaque champ a une explication et un bouton « Copier » pour les valeurs connues non sensibles (ex. adresse).
- Étant donné la fin de la pré-demande, quand je saisis ou scanne mon numéro de pré-demande, alors il est enregistré dans `user_procedures.external_ref`.

### US08 (M) : Suivre ma démarche
En tant qu'usager, je veux voir où en est mon dossier sur une frise,
afin d'être rassuré pendant l'attente.
- Étant donné une démarche, alors la frise affiche les étapes passées (avec date) et la prochaine.
- Étant donné une démarche déposée, quand j'indique la date de dépôt, alors une date de réponse attendue est calculée (RG07, RG10) et un rappel de relance est créé.
- Étant donné une démarche terminée, quand je la clôture, alors elle passe à `terminee` et ne compte plus dans la limite gratuite (RG12).

### US09 (M) : Recevoir des rappels
En tant qu'usager, je veux être prévenu avant l'expiration de mes papiers et avant les dates limites,
afin de ne jamais être pris de court.
- Étant donné un document avec une date d'expiration, alors un rappel est créé automatiquement (RG05).
- Étant donné un rappel arrivé à échéance, alors une notification push part à 9 h (heure de Paris), une seule fois.
- Étant donné un rappel, quand je le marque « fait », alors il n'est plus envoyé.

### US10 (M) : Comprendre un courrier
En tant que senior, je veux photographier un courrier administratif et savoir ce qu'il veut dire,
afin de savoir quoi faire et avant quand.
- Étant donné une photo de courrier, quand j'appuie sur « Expliquer », alors le texte est lu sur l'appareil, les données sensibles sont masquées (RG08), et j'obtiens en moins de 20 secondes : l'organisme, le résumé en 3 phrases maximum, les actions à faire, la date limite.
- Étant donné une date limite trouvée, alors son niveau de certitude est affiché (« écrite dans le courrier », « calculée », « à vérifier ») (RG09).
- Étant donné un courrier médical ou hors champ administratif, alors l'appli refuse poliment et ne stocke rien.
- Étant donné un usager gratuit ayant déjà décodé 3 courriers ce mois-ci, alors l'écran d'abonnement s'affiche (RG12).
- Étant donné une date limite, quand j'appuie sur « Me le rappeler », alors un rappel est créé à J-3.

### US11 (M) : Ranger mes documents en sécurité
En tant qu'usager, je veux un coffre-fort où mes papiers sont chiffrés,
afin de les retrouver sans craindre une fuite.
- Étant donné un document importé, alors le fichier stocké est chiffré avant l'envoi et illisible côté serveur (RG11).
- Étant donné un nouvel appareil, quand je saisis ma phrase de récupération, alors mes documents redeviennent lisibles.
- Étant donné une phrase de récupération perdue et l'ancien appareil perdu, alors l'appli explique que les documents sont irrécupérables (choix assumé, annoncé à l'activation).

### US12 (M) : S'abonner et résilier facilement
En tant qu'usager ou aidant, je veux m'abonner en un geste et résilier aussi facilement,
afin de garder le contrôle.
- Étant donné l'écran d'abonnement, alors le prix, la périodicité, la reconduction et le lien de résiliation sont visibles avant l'achat.
- Étant donné un achat confirmé par le store, quand le webhook RevenueCat arrive, alors `subscriptions.entitlement` passe à `serenite` en moins d'une minute.
- Étant donné les réglages, alors « Gérer / résilier mon abonnement » ouvre la page du store en un tap.

### US13 (M) : Supprimer mon compte
En tant qu'usager, je veux supprimer mon compte et toutes mes données depuis l'appli,
afin d'exercer mon droit à l'effacement.
- Étant donné les réglages, quand je confirme la suppression, alors les fichiers du coffre, les lignes en base et le compte d'authentification sont supprimés en moins de 24 h.
- Étant donné un abonnement actif, alors l'appli rappelle qu'il faut aussi le résilier sur le store.

### US14 (S) : Poser une question à l'assistant
En tant qu'usager, je veux poser une question en langage courant sur une de mes démarches,
afin d'avoir une réponse fiable sans lire la fiche entière.
- Étant donné une question dans le périmètre, alors la réponse cite la fiche source et sa date de mise à jour.
- Étant donné une question hors périmètre (ex. litige avec un voisin), alors l'assistant le dit et oriente vers France Services ou un professionnel.
- Étant donné une question appelant un conseil personnalisé (« quelle case dois-je cocher pour payer moins ? »), alors l'assistant explique les règles générales sans trancher à la place de l'usager.

### US15 (S) : Préparer ma retraite
En tant que futur retraité, je veux un calendrier qui part de ma date de départ souhaitée,
afin de faire chaque étape au bon moment.
- Étant donné une date de départ souhaitée, alors 3 rappels sont créés (RG06).
- Étant donné une date de départ à moins de 6 mois, alors l'appli signale l'urgence et propose de déposer la demande tout de suite.

### US16 (S) : Préparer ma déclaration de revenus
En tant que contribuable, je veux une liste de ce qu'il faut rassembler et la date limite de mon département,
afin de déclarer sans stress.
- Étant donné mon département renseigné, alors la date limite de déclaration en ligne de l'année en cours est affichée (RG13).
- Étant donné la checklist, alors chaque rubrique (dons, emploi à domicile, frais d'hébergement en établissement…) renvoie à la fiche officielle.

### US17 (C) : Alerte de créneau de rendez-vous en mairie
Reporté tant qu'aucun accès autorisé aux créneaux n'existe (pas de scraping). Au MVP : lien direct vers le moteur officiel de prise de RDV.

---

## 4. Règles métier

| Réf. | Règle | Story |
|---|---|---|
| RG01 | Tout parcours affiche le lien vers le site officiel et, si le coût officiel est 0 €, la phrase « Cette démarche est gratuite sur [nom du site] ». Le prix de l'abonnement n'est jamais présenté comme le coût d'une démarche. | US01, US05 |
| RG02 | Les constantes réglementaires (tarifs, durées de validité, délais) sont stockées dans `procedures_catalog.content` avec `source_url` et `source_updated_at`. Une version publiée n'est jamais modifiée : toute correction crée une nouvelle version. Une démarche en cours garde la version avec laquelle elle a démarré. | US05 |
| RG03 | Coût CNI / passeport (valeurs initiales) : CNI = 0 €, sauf perte ou vol = 25 € ; passeport majeur = 86 €, mineur de 15 à 17 ans = 42 €, mineur de moins de 15 ans = 17 €. | US05 |
| RG04 | Justificatif de domicile valide si `date du document >= date du jour - 12 mois`. Photo d'identité valide si prise il y a moins de 6 mois. | US06 |
| RG05 | Rappel d'expiration créé automatiquement : `date d'échéance = expires_on - 6 mois` pour la catégorie `identite`, `expires_on - 1 mois` sinon, à 9 h heure de Paris. Si cette date est passée, le rappel part immédiatement. Modifier ou effacer `expires_on` remplace ou supprime le rappel non encore envoyé. | US09 |
| RG06 | Retraite, à partir de la date de départ souhaitée D : vérifier le relevé de carrière à D - 12 mois, déposer la demande unique à D - 6 mois, relancer la caisse si aucune réponse 4 mois après le dépôt. | US15 |
| RG07 | Date de réponse attendue = date de dépôt + délai indicatif du parcours (`content.delai_reponse_jours`). Un rappel de relance est créé à cette date. | US08 |
| RG08 | Avant tout envoi au modèle d'IA, le texte OCR est pseudonymisé sur l'appareil : NIR (13 chiffres + clé), IBAN, numéros fiscaux et d'allocataire (suites de 7 chiffres ou plus), e-mails et téléphones sont remplacés par des jetons (`[NIR]`, `[IBAN]`, `[NUMERO]`, `[EMAIL]`, `[TEL]`). La photo ne quitte jamais l'appareil. | US10 |
| RG09 | Une date limite issue du décodeur n'est acceptée que si : (a) elle figure littéralement dans le texte (`explicite`), ou (b) elle est calculée **par le code** à partir d'une date du texte et d'un délai écrit dans le texte (`calculee`). Sinon, `incertaine`. Le modèle d'IA ne calcule jamais une date. | US10 |
| RG10 | Délai indicatif de réponse (valeurs initiales) : CNI / passeport 30 jours après le RDV, retraite 120 jours après le dépôt. | US08 |
| RG11 | Chiffrement du coffre : clé de 256 bits générée sur l'appareil, stockée dans le trousseau sécurisé (SecureStore). Fichier chiffré en XChaCha20-Poly1305 avant envoi. La clé est sauvegardée uniquement sous forme d'une phrase de récupération de 12 mots, montrée une fois à l'activation du coffre. | US11 |
| RG12 | Offre gratuite : au plus 1 démarche active (statut différent de `terminee` et `abandonnee`), 5 documents, 3 courriers décodés par mois civil (heure de Paris). Les limites sont vérifiées **côté serveur** (déclencheurs SQL et Edge Function). Le passage en gratuit après un abonnement ne supprime rien : l'usager garde l'accès en lecture et ne peut plus créer au-delà des limites. | US08, US10, US12 |
| RG13 | Date limite de déclaration en ligne = ligne de `official_deadlines` pour l'année en cours et la zone du département (`01-19`, `20-54`, `55-976`). Si elle n'est pas encore publiée, afficher « Dates pas encore annoncées » plutôt qu'une estimation. | US16 |
| RG14 | Une démarche abandonnée ou terminée depuis plus de 3 ans, et un compte inactif depuis 3 ans, sont purgés après un e-mail d'avertissement à J-30. | US13 |

---

## 5. Modèle de données

Détail exécutable : [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
Chaque table propre à un usager porte `user_id` (propriétaire) avec RLS `user_id = auth.uid()`.

| Table | Propriétaire | Champs principaux | Écriture par |
|---|---|---|---|
| `profiles` | `id` = utilisateur | taille de texte, lecture vocale, département fiscal, jeton push, date d'acceptation de l'avertissement | usager |
| `subscriptions` | `user_id` | `entitlement` (`gratuit` / `serenite`), `expires_at` | webhook RevenueCat (service) |
| `procedures_catalog` | aucun (public) | `slug`, `version`, `content` (JSON), `official_url`, `source_url`, `source_updated_at`, `is_published` | administrateur (service) |
| `official_deadlines` | aucun (public) | `slug`, `year`, `zone`, `due_on`, `source_url` | administrateur (service) |
| `user_procedures` | `user_id` | démarche du catalogue + version, `status`, `answers` (réponses du diagnostic), `current_step`, `external_ref`, `submitted_at`, `expected_response_at`, `target_date` | usager |
| `procedure_events` | `user_id` | événements de la frise (`kind`, `note`, `occurred_at`) | usager |
| `documents` | `user_id` | catégorie, titre, chemin chiffré, type et taille d'origine, nonce, `issued_on`, `expires_on` | usager |
| `procedure_documents` | `user_id` | lien exigence de pièce ↔ document | usager |
| `reminders` | `user_id` | `kind`, `title`, `due_at`, source, `sent_at`, `dismissed_at` | usager et déclencheurs |
| `decoded_letters` | `user_id` | organisme, date du courrier, résumé, actions, date limite et certitude. **Le texte du courrier n'est pas stocké.** | Edge Function (service) |
| `usage_counters` | `user_id` | compteur mensuel de courriers décodés | Edge Function (service) |

Stockage : bucket privé `coffre`, chemin `{user_id}/{document_id}.bin`, contenu chiffré.

### Format du contenu d'un parcours (`procedures_catalog.content`)

Exemple complet : [`content/cni-passeport.v1.json`](content/cni-passeport.v1.json).

```jsonc
{
  "questions": [ { "id": "motif", "label": "…", "choices": [ { "value": "renouvellement", "label": "…" } ], "show_if": { } } ],
  "outcomes":  [ { "id": "cni_renouvellement", "when": { "titre": "cni", "motif": "renouvellement" },
                   "cout_eur": 0, "pieces": ["…"], "etapes": ["…"], "delai_reponse_jours": 30 } ],
  "pieces":    { "justificatif_domicile": { "label": "…", "max_age_months": 12, "category": "domicile" } },
  "etapes":    { "pre_demande": { "label": "…", "url": "…", "champs": [ { "label": "…", "aide": "…" } ] } }
}
```

Règle d'évaluation : le premier `outcome` dont toutes les paires de `when` correspondent aux réponses gagne. Aucun résultat → écran « cas non couvert » (US05).
Puis chaque entrée de `pieces_conditionnelles` dont le `when` correspond est appliquée dans l'ordre (`ajouter` sans doublon, puis `retirer`). Les `rappels` sont créés par l'appli à partir de la date de l'étape indiquée.

---

## 6. Écrans

| ID | Écran | Contenu principal | Actions | États vides / erreurs |
|---|---|---|---|---|
| E01 | Onboarding (3 écrans) | Choix de la taille de texte et de la lecture vocale ; promesse ; avertissement de non-affiliation | Choix de la taille, « J'ai compris » | Impossible d'entrer dans l'appli sans accepter |
| E02 | Connexion | E-mail + code, Apple, Google | Recevoir un code, se connecter | Code faux ou expiré : message + renvoi |
| E03 | Accueil | Démarches en cours, 4 tuiles, micro, prochains rappels | Ouvrir une tuile, parler | Aucune démarche : « Par quoi commençons-nous ? » |
| E04 | Question de diagnostic | Une question, 2 à 4 grandes réponses, progression | Répondre, revenir | n/a |
| E05 | Résultat « Votre démarche » | Coût officiel, durée, étapes, mention de gratuité, lien officiel | Commencer, poser une question | Cas non couvert : texte + lien officiel |
| E06 | Checklist des pièces | Pièces requises avec état (manquante, valide, trop ancienne) | Scanner, choisir dans le coffre | Pièce refusée : raison en une phrase |
| E07 | Scanner | Caméra avec détection des bords, aperçu | Prendre, reprendre, valider | Photo floue : « Rapprochez-vous et évitez les reflets » |
| E08 | Étape guidée (côte à côte) | Explication champ par champ, boutons « Copier » | Ouvrir le site officiel, saisir le numéro obtenu | Site inaccessible : réessayer plus tard + lien France Services |
| E09 | Frise de suivi | Étapes datées, prochaine action, date de réponse attendue | Marquer une étape faite, ajouter une note, clôturer | Réponse en retard : bouton « Préparer une relance » (V1 : modèle) |
| E10 | Lire un courrier : capture | Caméra multi-pages (jusqu'à 4) | Prendre, ajouter une page, expliquer | Texte illisible : conseils de prise de vue |
| E11 | Lire un courrier : résultat | Organisme, résumé, actions, date limite et certitude, avertissement | Me le rappeler, écouter, supprimer | Hors champ : refus poli ; limite gratuite : E15 |
| E12 | Coffre-fort | Documents par catégorie, badges d'expiration | Ajouter, ouvrir, renommer, supprimer | Coffre vide : explication + « Scanner mon premier document » |
| E13 | Activation du coffre | Explication du chiffrement, phrase de récupération de 12 mots | Copier sur papier, confirmer 3 mots | Mauvais mots : recommencer |
| E14 | Échéancier | Rappels à venir, triés par date | Marquer fait, reporter de 7 jours | Aucun rappel : « Rien à prévoir pour l'instant » |
| E15 | Abonnement | Offres, prix, reconduction, résiliation, CGV | Essai 7 jours, s'abonner, restaurer | Achat échoué : message du store |
| E16 | Assistant | Conversation, sources cliquables | Poser une question (texte ou voix) | Hors périmètre : orientation |
| E17 | Réglages | Taille de texte, voix, département fiscal, notifications, abonnement, confidentialité, suppression du compte | Modifier, exporter mes données, supprimer | n/a |

Règles d'interface communes : texte de corps à 18 pt minimum à 100 %, contraste AA, un seul bouton principal par écran, aucun texte en majuscules seules, icône haut-parleur sur E04 à E11.

---

## 7. Sécurité et RGPD

| Sujet | Décision |
|---|---|
| Isolation | RLS sur toutes les tables, `user_id = auth.uid()`. Les tables écrites par le serveur (abonnements, compteurs, courriers décodés) n'ont **aucune** politique d'écriture pour les usagers. |
| Limites gratuites | Vérifiées par déclencheurs SQL, donc impossibles à contourner depuis le client. |
| Documents | Chiffrés sur l'appareil (RG11). Le serveur ne détient pas la clé. |
| Courriers | Photo et OCR sur l'appareil ; seul le texte pseudonymisé part vers l'Edge Function, puis vers le modèle ; seul le résultat structuré est stocké. |
| Fournisseur d'IA | Contrat sans rétention ni entraînement. Le fournisseur figure dans la liste des sous-traitants. |
| NIR | Jamais demandé ; masqué avant tout envoi (RG08). |
| Données de santé | Courriers médicaux refusés par le décodeur ; aucune catégorie « santé » dans le coffre. |
| Journalisation | Les logs des Edge Functions ne contiennent ni texte de courrier ni contenu de réponse. |
| Conservation | RG14. Suppression du compte : US13. |
| AIPD | À rédiger avant la bêta (personnes vulnérables, pièces d'identité). |
| Hébergement | Projet Supabase en région UE ; sauvegardes en UE. |

---

## 8. Architecture technique

```
Appli Expo (React Native)
 ├─ OCR sur l'appareil (ML Kit / Vision) + pseudonymisation (RG08)
 ├─ Chiffrement libsodium (RG11) + SecureStore
 ├─ supabase-js (Auth, PostgREST, Storage)  ──►  Postgres + RLS
 └─ RevenueCat SDK                          ──►  Webhook ─► Edge Function `revenuecat-webhook`
Edge Functions (Deno)
 ├─ `decode-letter`      : contrôle de la limite, appel au modèle, validation du JSON, calcul des dates (RG09)
 ├─ `ask-assistant`      : recherche dans les fiches (pgvector) + réponse sourcée
 ├─ `send-reminders`     : toutes les 15 min (pg_cron), envoi Expo Push, marque `sent_at`
 └─ `delete-account`     : purge Storage + auth.admin.deleteUser
Import hebdomadaire des fiches service-public.fr (open data) → table d'index pour l'assistant (V1 : pgvector)
```

---

## 9. Cas limites et questions ouvertes

**Cas limites**
- Usager sans adresse e-mail (fréquent chez les seniors) : connexion Apple / Google, ou e-mail créé par l'aidant. À surveiller en bêta.
- Changement de téléphone sans phrase de récupération : documents perdus (annoncé à l'activation). Les métadonnées et rappels sont conservés.
- Fuseau horaire hors métropole (DROM) : `profiles.timezone`, rappels envoyés à 9 h locale.
- Courrier de plusieurs pages dont la date limite est en page 3 : capture multi-pages obligatoire avant analyse.
- Démarche dont la réglementation change en cours de route : la démarche garde sa version (RG02) et un bandeau signale « La règle a changé le JJ/MM, vérifiez ».
- Deux CNI enregistrées (ancienne et nouvelle) : le rappel suit la date d'expiration la plus lointaine de la catégorie ; l'ancienne peut être archivée.

**Questions ouvertes**
1. Nom définitif et dépôt INPI (vérifier l'absence de confusion avec un service public).
2. Fournisseur d'IA et région d'hébergement du modèle.
3. Prix définitifs après test (référence : 4,99 € / mois, 39,99 € / an).
4. Faut-il un code d'accès local (PIN / biométrie) à l'ouverture de l'appli ? Recommandé : oui, désactivable.

---

## 10. Prompt de génération (à coller dans Claude Code)

> Crée une application Expo (SDK récent, TypeScript, expo-router) nommée `copilote-demarches`.
> Back-end : Supabase, schéma dans `demarches-copilote/supabase/migrations/0001_init.sql` (ne pas le modifier sans nouvelle migration).
> Implémente d'abord, dans cet ordre : E01, E02, E03, E04, E05 pour le parcours défini dans `demarches-copilote/content/cni-passeport.v1.json`, en respectant les règles RG01 à RG05 de `demarches-copilote/SPECS-MVP.md`.
> Contraintes : taille de texte pilotée par `profiles.text_scale`, cibles tactiles de 48 pt minimum, aucune WebView pour les sites officiels (navigateur système), aucune couleur ni typographie évoquant l'État (pas de bleu-blanc-rouge dominant, pas de Marianne).
> Ajoute des tests pour l'évaluateur de parcours (sélection de l'`outcome`, cas non couvert) et pour la règle RG04.
