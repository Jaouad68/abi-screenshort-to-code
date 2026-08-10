# Plombéo

> « Votre métier. Simplement mieux géré. »

Application de gestion pour plombier indépendant en France : clients, interventions,
devis, factures. Conçue mobile-first pour un usage sur chantier, et multi-tenant dès
le premier commit pour pouvoir devenir un SaaS multi-artisans sans réécriture.

- **Architecture (Phase 0)** : [`docs/plombeo/PHASE-0-ARCHITECTURE.md`](../docs/plombeo/PHASE-0-ARCHITECTURE.md)
- **Spécification Phase 1** : [`docs/plombeo/PHASE-1-SPECIFICATION.md`](../docs/plombeo/PHASE-1-SPECIFICATION.md)
- **Spécification Phase 2** : [`docs/plombeo/PHASE-2-SPECIFICATION.md`](../docs/plombeo/PHASE-2-SPECIFICATION.md)
- **Spécification Phase 3** : [`docs/plombeo/PHASE-3-SPECIFICATION.md`](../docs/plombeo/PHASE-3-SPECIFICATION.md)
- **Spécification Phase 4** : [`docs/plombeo/PHASE-4-SPECIFICATION.md`](../docs/plombeo/PHASE-4-SPECIFICATION.md)
- **Spécification Phase 5** : [`docs/plombeo/PHASE-5-SPECIFICATION.md`](../docs/plombeo/PHASE-5-SPECIFICATION.md)
- **Spécification Phase 6** : [`docs/plombeo/PHASE-6-SPECIFICATION.md`](../docs/plombeo/PHASE-6-SPECIFICATION.md)
- **Spécification Phase 7** : [`docs/plombeo/PHASE-7-SPECIFICATION.md`](../docs/plombeo/PHASE-7-SPECIFICATION.md)
- **Spécification Phase 8** : [`docs/plombeo/PHASE-8-SPECIFICATION.md`](../docs/plombeo/PHASE-8-SPECIFICATION.md)
- **Spécification Phase 9** : [`docs/plombeo/PHASE-9-SPECIFICATION.md`](../docs/plombeo/PHASE-9-SPECIFICATION.md)
- **Spécification Phase 10** : [`docs/plombeo/PHASE-10-SPECIFICATION.md`](../docs/plombeo/PHASE-10-SPECIFICATION.md)
- **Spécification Phase 11** : [`docs/plombeo/PHASE-11-SPECIFICATION.md`](../docs/plombeo/PHASE-11-SPECIFICATION.md)
- **Spécification Phase 12** : [`docs/plombeo/PHASE-12-SPECIFICATION.md`](../docs/plombeo/PHASE-12-SPECIFICATION.md)
- **Spécification Phase 13** : [`docs/plombeo/PHASE-13-SPECIFICATION.md`](../docs/plombeo/PHASE-13-SPECIFICATION.md)
- **Spécification Phase 14** : [`docs/plombeo/PHASE-14-SPECIFICATION.md`](../docs/plombeo/PHASE-14-SPECIFICATION.md)
- **Spécification Phase 15** : [`docs/plombeo/PHASE-15-SPECIFICATION.md`](../docs/plombeo/PHASE-15-SPECIFICATION.md)

## État d'avancement

**Phase 1 — Fondations : terminée.**

- Multi-tenant : `Organization` / `User` / `Membership` porteur du rôle, cloisonnement
  logique par `organizationId`, vérifié par un test d'isolation dédié
- Authentification : inscription, connexion, déconnexion ; mot de passe haché (bcrypt,
  coût 12), session signée (`jose`) **et** révocable en base
- Sessions : liste des appareils connectés, « déconnecter tous mes appareils »
- RBAC : 8 rôles en base, permissions vérifiées côté serveur dans le DAL
- Protection anti-force brute sur la connexion (fenêtre glissante en base)
- Journal d'audit immuable (`AuditLog`), sans mise à jour ni suppression exposées
- Informations d'entreprise (nom, forme juridique, SIRET, coordonnées)
- Design system mobile-first, contraste vérifié, cibles tactiles ≥ 44 px
- PWA installable : manifeste, service worker, page hors-ligne

**Phase 2 — CRM : terminée.**

- Clients particuliers et professionnels ; seul un nom est obligatoire, pour une
  saisie rapide sur chantier
- Logements / sites d'intervention, avec les informations d'accès (étage, digicode,
  interphone, instructions) et un lien « Ouvrir dans le GPS »
- Carnet technique : équipements par logement (marque, modèle, n° de série,
  dates de pose, garantie, prochain entretien) — aucun champ obligatoire hors la catégorie
- Recherche unique sur les clients **et** les adresses de leurs logements
- Consentements aux communications commerciales, jamais cochés par défaut
- Archivage réversible, suppression définitive réservée au propriétaire et confirmée
  par la saisie du nom
- Export CSV du fichier client (portabilité §79 et droit d'accès RGPD)

**Phase 3 — Terrain : terminée.**

- Demandes entrantes avec niveau d'urgence, converties en rendez-vous sans ressaisie
- Agenda en vue jour, navigation par date, lien GPS et appel direct
- Interventions : tâches, temps, fournitures, diagnostic et compte rendu
- Machines à états explicites (demande, rendez-vous, intervention), transitions
  validées côté serveur — une intervention clôturée ne se rouvre jamais
- **Capture hors-ligne** : la saisie de chantier est écrite dans IndexedDB avant
  tout envoi, avec un identifiant généré sur l'appareil ; la synchronisation est
  idempotente, les états (`en attente`, `échec`) sont visibles, et le retour du
  réseau déclenche l'envoi automatiquement

Non livré volontairement et sans faux-semblant : les **photos** d'intervention
exigent un stockage objet, qui relève de la Phase 6. Aucun bouton n'est proposé
tant qu'elles ne sont pas réellement conservées (§76).

**Phase 4 — Catalogue et devis : terminée.**

- Catalogue de prestations et de fournitures, avec prix et TVA par défaut
- Devis : lignes depuis le catalogue ou en saisie libre, remise, acompte,
  durée de validité, machine à états (brouillon → prêt → envoyé → accepté)
- **Devis à variantes** (Essentiel / Confort / Premium) : un devis simple est un
  devis à une seule proposition, la notion n'est jamais imposée
- Génération d'un devis **depuis une intervention**, reprenant temps et fournitures
- Numérotation `DEV-2026-001` attribuée au passage en « prêt », par incrément
  atomique en base : deux devis simultanés n'obtiennent jamais le même numéro
- Document imprimable (PDF via le navigateur), sans navigation ni service externe

**Prudence fiscale assumée** : Plombéo ne déduit **jamais** le taux de TVA
applicable ni ne rédige de mention légale. L'artisan saisit son taux par ligne et
rédige ses conditions. Un texte par défaut lui donnerait un faux sentiment de
couverture (§15, §54).

**Phase 5 — Factures et paiements : terminée.**

- Facture depuis un devis accepté, facture d'acompte, ou facture directe
- **Une facture émise ne se modifie plus** : trois barrières — interdiction
  applicative à chaque écriture, totaux figés en base, et empreinte SHA-256
  permettant de détecter une altération faite hors application
- Correction par **avoir** uniquement, jamais par réécriture
- Encaissements réellement perçus (virement, chèque, espèces, carte), paiements
  partiels, solde ; les états « partiellement payée » et « payée » sont **dérivés**
  des paiements, jamais saisis
- Facture imprimable, impayés et retards signalés sur l'accueil
- La suppression d'un client porteur d'une facture émise est désormais **refusée**

**Non livré, sans faux-semblant** : le paiement **en ligne** par lien sécurisé exige
un prestataire configuré. Aucun bouton ne le propose et rien ne le simule (§76).

**Phase 6 — Documents, photos et signature : terminée.**

- Pièces versées sur un client, un logement, une intervention, un devis ou une
  facture ; photos **avant / après travaux** prises depuis l'appareil
- **Type de fichier vérifié sur les octets réels**, pas sur l'extension ni sur
  l'en-tête déclaré : un exécutable renommé en `.jpg` est refusé
- Chemin de stockage produit par le serveur à partir d'octets aléatoires : aucune
  donnée cliente n'y entre, la traversée de répertoire est impossible par
  construction
- Aucun fichier public : tout passe par `/api/documents/[id]`, qui vérifie session,
  organisation et permission, et sert en `attachment` + `nosniff`
- **Signature manuscrite** du bon d'intervention, avec horodatage serveur, nom du
  signataire, appareil (sans adresse IP) et **empreinte SHA-256 du contenu signé**,
  reconstruit côté serveur depuis la base — jamais repris du formulaire

**Sur la portée de la signature, l'interface le dit en toutes lettres** : il s'agit
d'une signature *simple*. Plombéo ne la qualifie pas juridiquement et ne garantit pas
qu'elle suffise pour un engagement donné ; une signature avancée ou qualifiée passe
par un prestataire spécialisé (§76). Le niveau requis selon la nature et le montant de
l'engagement reste **[À VÉRIFIER — SOURCE OFFICIELLE ET CONSEIL JURIDIQUE]**.

**Non livré, sans faux-semblant** : sans `STOCKAGE_DISQUE_RACINE` ni
`STOCKAGE_S3_BUCKET`, l'envoi de fichiers est **refusé avec un message clair**. Aucun
adaptateur « Null » n'accepte un fichier pour le perdre ensuite. L'implémentation S3
échoue explicitement tant qu'aucun fournisseur n'est retenu.

**Phase 7 — Automatisation, relances et notifications : terminée.**

- **Moteur de règles** à quatre déclencheurs : facture échue, devis sans réponse,
  rendez-vous du lendemain, intervention non clôturée
- **Relance des impayés** : une relance part **une seule fois**, garantie par une
  clé d'idempotence sous contrainte d'unicité en base — pas par un test applicatif,
  que deux balayages concurrents contourneraient
- **Envoi d'e-mails réel** (SMTP), avec le devis ou la facture **en PDF joint**,
  généré côté serveur sans dépendre d'un navigateur
- File d'attente en base : émettre une facture n'échoue jamais parce qu'un serveur
  d'e-mail est lent, et chaque envoi reste traçable et rejouable
- Centre de notifications, avec compteur dans l'en-tête
- Point d'entrée `/api/cron/automatisations`, protégé par un secret comparé en
  **temps constant** ; sans `CRON_SECRET`, la route est **fermée**, pas ouverte

**Le dosage des relances est le cœur de cette phase** (§84). Garde-fous non
désactivables : 3 relances maximum par facture, 7 jours minimum entre deux, envoi
entre 8 h et 20 h hors week-end, arrêt immédiat dès qu'un paiement est enregistré,
exclusion possible client par client. Et surtout : **aucune règle n'est active à
l'installation**. Plombéo n'envoie rien tant que l'artisan ne l'a pas décidé.
L'interface annonce ces limites, parce que c'est ce qui permet de faire confiance à
une automatisation.

**Les relances constatent un retard, elles ne mettent pas en demeure.** Aucun texte
par défaut n'évoque intérêts de retard, indemnité forfaitaire ni pénalités : ces
notions ont un régime précis **[À VÉRIFIER — SOURCE OFFICIELLE]**, et un défaut
donnerait à l'artisan un faux sentiment de couverture (§15, §54). Un test vérifie
l'absence de ces termes dans les modèles livrés.

**Non livré, sans faux-semblant** : sans configuration SMTP, l'envoi est **refusé
avec un message explicite**, l'option « e-mail au client » n'est même pas proposée
dans les règles, et les échecs sont affichés. Aucun mode « console » qui écrirait
l'e-mail dans les journaux : cela ressemble trop à un envoi réussi.

**Phase 8 — Fournisseurs, achats et stock : terminée.**

- Fournisseurs, factures d'achat, et **prix de revient** : Plombéo connaissait les
  prix de vente, il connaît désormais ce que les fournitures coûtent
- **Marge réelle** sur chaque fourniture et chaque devis
- Suivi de stock **choisi article par article**, mouvements en journal
- Correction après comptage, seuils d'alerte branchés sur les notifications

**Le risque de cette phase n'était pas technique mais ergonomique.** La Phase 0
l'avait identifié : « sur-ingénierie si trop détaillé pour un indépendant ». Un module
de stock complet est exactement ce qu'un plombier seul n'utilisera jamais — il saisira
trois articles, oubliera de décrémenter, verra des chiffres faux, et cessera d'ouvrir
l'écran. Trois partis pris en découlent :

- **aucun suivi par défaut** : l'artisan coche les rares références qui comptent ;
- **le stock négatif est accepté et signalé, jamais bloqué**. Refuser de sortir une
  pièce que l'artisan a dans les mains le pousserait à mentir au logiciel ;
- **aucune décrémentation silencieuse** : les fournitures d'une intervention ne
  sortent pas du stock toutes seules.

**La marge n'est affichée que si le prix d'achat est connu.** Un zéro par défaut
afficherait 100 % de marge sur toute référence non renseignée — le chiffre le plus
flatteur et le plus faux. Les lignes sans prix d'achat sont écartées du total **et
comptées**, pour ne pas laisser croire que le total couvre tout.

**Ce que Plombéo ne fait pas** : aucune valorisation de stock au bilan, aucune méthode
comptable (PMP, FIFO), aucune détermination de TVA déductible. Le prix affiché est le
« dernier prix payé », jamais une « valeur de stock » — un total ainsi intitulé
laisserait croire à un chiffre opposable **[À VÉRIFIER — SOURCE OFFICIELLE ET
EXPERT-COMPTABLE]**. Une facture fournisseur est un document *reçu* : elle n'entre dans
aucune numérotation Plombéo et ne porte aucune empreinte d'intégrité.

**Phase 9 — Pilotage et pré-comptabilité : terminée.**

- **Facturé** et **encaissé** affichés séparément, jamais fusionnés en un
  « chiffre d'affaires » : sa détermination dépend du régime de l'entreprise
- Rentabilité par chantier, encours, comparaison entre mois
- Exports **journal des ventes** et **journal des achats** au format tableur

**Le risque était la crédibilité des chiffres**, et la Phase 0 l'avait nommé :
« indicateurs mal définis (confusion réel/estimation) ». Trois règles en découlent :

- **le coût horaire est saisi, jamais déduit**. Il intègre charges, congés et temps non
  facturable, dont Plombéo ne sait rien. Tant qu'il n'est pas renseigné, la rentabilité
  n'est pas affichée et l'écran dit pourquoi. Une valeur par défaut produirait des
  chiffres crédibles et faux ;
- **aucune prévision, aucune tendance, aucun modèle.** Une courbe tracée sur trois mois
  de données serait une invention graphique ;
- **un chantier non calculable reste affiché** comme tel. L'écarter en silence donnerait
  une moyenne flatteuse — ce sont justement les chantiers mal renseignés qui manquent.

**L'export n'est pas un FEC.** Le fichier des écritures comptables répond à un format
normé et suppose un plan comptable, que Plombéo n'a pas **[À VÉRIFIER — SOURCE
OFFICIELLE]**. Sur les avoirs, les colonnes HT et TVA restent **vides** : Plombéo
n'en connaît pas la ventilation et ne la déduit pas d'un taux supposé.

**Phase 10 — Portail client : terminée.**

- Lien personnel par client : consultation des devis et factures, **acceptation d'un
  devis en ligne**, sans créer de compte
- Jeton aléatoire de 32 octets, **stocké haché**, expirant, révocable
- Le lien n'est affiché **qu'une fois** : la base n'en garde que l'empreinte

**C'est la première porte du projet ouverte à quelqu'un sans session Plombéo**, d'où
deux règles strictes :

- **double filtre systématique** — client *et* organisation. Un jeton valide n'est pas
  un passe-partout : le devis d'un autre client, identifiant exact, répond comme
  inexistant ;
- **liste blanche stricte** des champs exposés. `Client.notes` est une note interne que
  le schéma décrit depuis la Phase 2 comme ne devant jamais figurer sur un document
  remis au client : le portail est le premier endroit où cette règle pouvait être
  violée. Marges, prix d'achat et coût horaire n'ont aucun chemin vers ces projections.

Un jeton inconnu, révoqué ou expiré reçoit **la même réponse** : distinguer
renseignerait sur l'existence d'un lien.

**Phase 11 — Assistant IA : terminée.**

- Mise au propre d'un compte rendu, adaptateur générique, trace de chaque appel
- **Aucun fournisseur retenu** : la décision n°9 engage un contrat de sous-traitance
  sur des données personnelles et ne peut pas être tranchée par le code. Sans
  configuration, l'assistant est **indisponible et le dit** — rien n'est simulé

**Le §22 est traité comme une contrainte de conception, pas comme une mention en bas
d'écran.** Un assistant qui écrit « il s'agit probablement d'un joint défectueux » a
franchi la ligne, quel que soit l'avertissement qui l'entoure. Trois garanties, toutes
vérifiées par des tests qui tombent si on les retire :

- **toutes** les consignes envoyées portent l'interdiction explicite de diagnostiquer,
  d'émettre une hypothèse de panne et de proposer un prix ;
- les lignes proposées ont un prix **forcé à zéro dans le code** — la garantie ne repose
  pas sur l'espoir que la consigne soit respectée ;
- l'IA n'écrit **jamais** dans le champ `diagnostic`, qui porte depuis la Phase 3 la
  mention « jamais généré ni déduit par l'application ». Même acceptée, une proposition
  n'entre que dans le compte rendu.

Rien ne s'enregistre sans validation explicite. Le texte est **caviardé** avant envoi
(téléphone, e-mail, code postal, IBAN) — et l'interface précise que **cela ne garantit
pas l'anonymat**, un texte libre pouvant toujours contenir un nom.

**Phase 15 — Durcissement : terminée**, traitée avant les phases 12 à 14.

Raison de ce déplacement : les phases 12 à 14 **ajoutent** des fonctionnalités, la 15
**protège ce qui existe** — neuf phases de données réelles. Une application qu'on
n'ose pas déployer ne sert personne, quel que soit le nombre de ses modules.

- **CSP** stricte, sans `unsafe-eval` ni aucune origine distante
- **HSTS**, COOP, Permissions-Policy ; le micro reste fermé
- **Rate limiting** en base, sur les écritures seulement
- **Purge** des sessions expirées branchée sur le cron
- **Rotation du secret de session** sans déconnecter tout le monde

Quatre points restent **hors du périmètre, et le disent** : MFA (à livrer avec
l'ouverture multi-utilisateurs), réinitialisation du mot de passe (assumée absente
plutôt que bâclée — c'est un contournement de l'authentification), analyse antivirale
et tests de restauration. `SECURITY.md` en donne la raison point par point, et décrit
la procédure de sauvegarde attendue de l'exploitant.

**Phase 12 — Hors-ligne avancé : terminée.**

Le compte rendu ne peut plus être écrasé en silence. Deux appareils, ou un appareil
revenu du hors-ligne, déclenchent un **conflit affiché** plutôt qu'une perte : les deux
versions sont montrées, l'artisan tranche. Fusionner automatiquement produirait une
phrase que personne n'a écrite, sur un document remis au client.

Le problème était **plus petit qu'il n'y paraît**, et par construction : la saisie de
chantier de la Phase 3 est en **ajout** (temps, fournitures, tâches, photos), donc elle
ne peut pas entrer en conflit. Seuls trois champs texte le peuvent. Bâtir un mécanisme
général de fusion pour trois champs aurait été la sur-ingénierie que la Phase 8 a appris
à éviter.

Le **mode dégradé du devis** n'avait rien à livrer : un devis suppose le catalogue et
des compteurs atomiques ; le rendre hors ligne exigerait des numéros provisoires, ce qui
heurte la continuité de numérotation. L'interface signale déjà l'absence de réseau.

**Phase 13 — Contrats d'entretien et garanties : terminée.**

- Contrats récurrents, échéance calculée, rappel automatique avant la visite
- Garanties enregistrées, couverture affichée par comparaison de dates

**L'échéance avance sur la visite RÉELLE, jamais sur la date théorique.** Plombéo ne
coche aucune visite tout seul : un contrat « à jour » sans qu'aucun technicien ne soit
passé serait pire qu'un contrat en retard. Un test le vérifie explicitement.

**Une échéance notifie, elle ne facture jamais.** Émettre une facture est l'acte
irréversible qui engage l'entreprise — la Phase 5 en a fait une permission distincte
pour cette raison.

**Plombéo ne qualifie aucune garantie.** Il enregistre un libellé, une date et une durée
**saisis**, et compare des dates. La nature (légale, contractuelle, constructeur), son
étendue et les obligations qui en découlent relèvent du droit applicable **[À VÉRIFIER —
SOURCE OFFICIELLE ET CONSEIL JURIDIQUE]**. Aucune durée par défaut n'est proposée :
suggérer « 2 ans » ou « 10 ans » serait déjà un conseil juridique.

**Phase 14 — SaaS, ouverture multi-utilisateurs : terminée.**

- Invitations par lien (jeton haché, expirant, à usage unique), rôle **figé à l'invitation**
- Retrait d'un membre, avec révocation immédiate de ses sessions
- Second facteur TOTP, vérifié **localement**, avec codes de récupération
- Connexion en deux étapes, `Plan` / `Subscription` **sans aucun encaissement**

**Aucun compte n'est créé avant acceptation.** Un compte créé d'avance est un compte
sans mot de passe choisi, donc une porte ouverte en attente.

**On n'invite jamais plus haut que soi.** Sans cette règle, l'invitation devient un
mécanisme d'élévation de privilèges : il suffirait d'inviter un complice — ou soi-même
sur une autre adresse — pour obtenir les pleins pouvoirs. L'écran borne la liste, le
serveur revérifie.

**Le mot de passe seul n'ouvre aucune session** quand le second facteur est actif : il
pose un défi de cinq minutes, dans un cookie `httpOnly`, qui n'atteste que du premier
facteur.

**Rien n'encaisse.** Aucun bouton « payer », aucun montant prélevé, aucun statut « payé »
qu'aucun paiement n'aurait produit (§76). Le nombre d'utilisateurs du plan n'est pas non
plus bloqué tant que ce choix n'est pas fait.

**Ce que l'ouverture des comptes a révélé.** Le premier compte non-propriétaire a montré
que l'écran d'accueil était inaccessible à tout rôle sans `devis:lire` et `facture:lire`,
que la barre de navigation proposait les quinze écrans à tout le monde, et qu'une erreur
de rôle produisait une page blanche. Les trois sont corrigés — c'était précisément
l'objet de la phase : *rendre les rôles réels*.

## Intégration continue

`.github/workflows/plombeo-ci.yml` vérifie à chaque poussée : types, lint, **409
tests** et build, contre une vraie base PostgreSQL.

La base réelle n'est pas un confort : les tests d'isolation multi-tenant sont des tests
d'**intégration**, et sans base ils se mettent en veille et passeraient au vert sans
rien vérifier. Une étape dédiée compte donc les tests d'isolation réellement exécutés
et **échoue s'ils ont été sautés** — une CI qui saute silencieusement le test le plus
important du projet serait pire que pas de CI.

## Démarrer

Nécessite Node.js 20.9+ et une base PostgreSQL.

```bash
npm install
cp .env.example .env    # puis renseigner DATABASE_URL et SESSION_SECRET
npx prisma migrate dev  # crée les tables
npm run dev
```

Ouvrir http://localhost:3000.

### Variables d'environnement

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Chaîne de connexion PostgreSQL |
| `SESSION_SECRET` | Secret de signature des cookies de session (≥ 32 caractères aléatoires) |
| `NEXT_PUBLIC_BASE_URL` | Base des liens absolus |
| `STOCKAGE_DISQUE_RACINE` | Racine des fichiers versés (disque persistant) |
| `STOCKAGE_S3_BUCKET` | Stockage objet compatible S3 — déclaré, pas encore implémenté |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | Serveur d'envoi d'e-mails |
| `EMAIL_EXPEDITEUR` | Adresse d'expédition |
| `CRON_SECRET` | Secret du point d'entrée de balayage. **Absent : la route est fermée.** |

Sans l'une des deux variables de stockage, l'envoi de fichiers est refusé avec un
message explicite : mieux vaut une fonctionnalité indisponible qu'une preuve de
chantier silencieusement perdue.

Aucun secret réel ne doit être committé : `.env` est ignoré par git.

## Jeu de démonstration (développement uniquement)

L'application démarre vide, et c'est voulu : aucune donnée fictive ne doit se
retrouver en production (§77). Pour l'explorer sans saisir une demi-heure de
données, un script pose l'activité plausible d'un plombier sur quelques semaines :

```bash
npm run demo
```

| | |
|---|---|
| Propriétaire | `patron@demo.plombeo.test` |
| Technicien | `technicien@demo.plombeo.test` |
| Mot de passe | `demo-plombeo-2026` |

Il crée 3 clients, 3 logements, 2 équipements, 6 références au catalogue, un achat
validé et son entrée en stock, 2 demandes, 3 rendez-vous dont un aujourd'hui, une
intervention clôturée, un devis à deux variantes, deux factures (une réglée, une
échue), un contrat d'entretien, une garantie, et quatre règles d'automatisation
**toutes inactives**.

Se connecter avec le compte technicien montre concrètement ce qu'un rôle limité
voit — et ne voit pas.

**Trois garde-fous**, parce qu'un jeu de démonstration lâché dans une base réelle
est une catastrophe silencieuse :

1. il refuse de s'exécuter si `NODE_ENV` vaut `production` ;
2. il refuse si la base contient la moindre entreprise qui ne soit pas la
   démonstration — ce qui protège une base de production dont la variable
   d'environnement aurait été oubliée ;
3. tout ce qu'il crée est explicitement factice (`@demo.plombeo.test`), et les
   mentions légales de l'entreprise portent un texte demandant à être remplacé,
   qui s'imprimera tel quel sur un devis.

Il **n'invente aucune règle fiscale** : toutes les lignes sont au taux par défaut
de 20 %. Les taux réduits dépendent de la nature des travaux et du logement
**[À VÉRIFIER — SOURCE OFFICIELLE]** ; les appliquer ici souillerait la
démonstration d'une réponse fausse. Il ne crée pas non plus de notification (elles
sont produites par le moteur), ni de consentement RGPD (un consentement est un
fait juridique daté).

Les numéros de pièces et l'empreinte d'intégrité des factures sont produits par
**les mêmes fonctions que l'application** (`src/lib/numerotation.ts`) : un numéro
forgé casserait la continuité de la numérotation, et une empreinte calculée
autrement ferait signaler la facture comme altérée dès son affichage.

## Vérifications

```bash
npm test        # Vitest : 409 tests, dont immuabilité, calculs, isolation et idempotence
npm run lint    # ESLint
npm run typecheck
npm run build   # build de production
```

### Sur la valeur des tests d'isolation

Les tests de `src/lib/isolation.test.ts` ont été validés **par mutation** : en retirant
temporairement chaque contrôle du DAL, on a vérifié que le test correspondant échoue
bien. Une première version passait sans le contrôle — elle ne prouvait donc rien. Toute
évolution de ces tests devrait refaire cette vérification.

### Sur les calculs financiers

Aucune opération en virgule flottante n'est faite sur un montant : les montants
sont des centimes entiers, les quantités des milli-unités, les taux de TVA des
centièmes de pourcent (5,5 % n'est pas représentable exactement en binaire). La
TVA est arrondie **une seule fois par taux**, sur la base agrégée, et une remise
est répartie au prorata sans perdre ni créer de centime. Ces propriétés sont
testées, et la valeur des tests a été confirmée par mutation.

### Sur l'immuabilité des factures

Une facture émise ne se modifie plus, et cela ne repose pas sur un seul mécanisme :
l'écriture est refusée côté serveur, les totaux sont figés en base plutôt que
recalculés, et une empreinte SHA-256 permet de **détecter** une altération faite hors
application. Une correction passe par un avoir. Les trois barrières ont été vérifiées
par mutation : retirer l'une d'elles fait échouer le test correspondant.

### Sur le contraste

Les couleurs ont été mesurées, pas supposées : l'orange de marque initial (`#d95f18`)
donnait 3,75:1 avec du texte blanc, sous le seuil de 4,5:1. Il a été assombri en
`#b04a0d`. Un audit de contraste automatisé (Playwright) parcourt les pages publiques
et compare chaque texte à son fond effectif.

## Structure

| Chemin | Rôle |
|---|---|
| `src/lib/dal.ts` | **Couche d'accès aux données** — point d'entrée unique de la session et du cloisonnement |
| `src/lib/crm.ts` | Accès CRM (clients, logements, équipements), toujours filtré par l'organisation de la session |
| `src/lib/terrain.ts` | Accès terrain (demandes, rendez-vous, interventions) |
| `src/lib/etats.ts` | **Machines à états** — transitions déclarées une fois, testées exhaustivement |
| `src/lib/file-sync.ts` | Logique pure de la file hors-ligne (déduplication, réessai, états) |
| `src/lib/sync-client.ts` | Stockage IndexedDB et envoi de la file |
| `src/app/api/sync/route.ts` | Réception idempotente des mutations hors-ligne |
| `src/lib/calcul.ts` | **Moteur de calcul** — arithmétique entière, TVA par taux, remise au prorata |
| `src/lib/devis.ts` | Accès catalogue et devis, numérotation atomique |
| `src/lib/facturation.ts` | **Intégrité des factures** — soldes, états dérivés, vérification d'empreinte |
| `src/lib/numerotation.ts` | Numérotation atomique et **calcul de l'empreinte** — sans dépendance au DAL, donc utilisable hors requête HTTP |
| `src/lib/navigation.ts` | Liens de l'espace connecté et permission attendue de chacun |
| `src/lib/roles.ts` | Ce qu'autorise chaque rôle, en une phrase, pour l'écran d'invitation |
| `src/lib/mfa.ts` | TOTP, codes de récupération, hiérarchie des rôles |
| `src/lib/invitations.ts` | Résolution d'un jeton d'invitation |
| `src/lib/csv.ts` | Génération CSV (BOM UTF-8, neutralisation de l'injection de formule) |
| `src/lib/libelles.ts` | Libellés affichés — aucun nom technique d'énumération dans l'interface |
| `src/lib/auth.ts` | Hachage, ouverture et révocation de session |
| `src/lib/session.ts` | Signature et empreinte des jetons |
| `src/lib/permissions.ts` | Correspondance rôle → permissions |
| `src/lib/securite.ts` | Anti-force brute, purge des données expirées |
| `src/lib/audit.ts` | Écriture du journal d'audit (seul point d'écriture) |
| `src/lib/validation.ts` | Schémas Zod partagés |
| `src/proxy.ts` | En-têtes de sécurité et redirection optimiste (Next.js 16 : remplace `middleware.ts`) |
| `src/components/ui.tsx` | Design system |
| `src/app/app/` | Espace connecté |
| `prisma/schema.prisma` | Modèle de données |
| `prisma/demo.ts` | Jeu de démonstration — **développement uniquement**, avec trois garde-fous |

## Règles à respecter dans les phases suivantes

1. **Toute table métier porte `organizationId`**, indexé, en cascade vers `Organization`.
2. **Aucune requête Prisma hors du DAL** dans une page ou une Server Action : le
   contexte tenant vient toujours de la session, jamais du client.
3. **Aucun contrôle d'autorisation dans un `layout.tsx`** : avec le rendu partiel, un
   layout n'est pas réexécuté à chaque navigation.
4. **Aucune donnée fictive** dans l'application : un module non livré est annoncé
   comme tel.
5. **Aucune règle réglementaire inventée** : mentions légales, taux et obligations
   viennent d'une source officielle ou restent configurables.

## Particularités de Next.js 16 dans ce projet

Cette version comporte des ruptures par rapport aux conventions antérieures :

- `middleware.ts` est déprécié au profit de **`proxy.ts`**, avec une fonction exportée
  nommée `proxy` (runtime Node.js uniquement, non configurable) ;
- `cookies()`, `headers()`, `params` et `searchParams` sont **asynchrones** ;
- Turbopack est actif par défaut ; `next lint` a été retiré au profit de l'ESLint CLI ;
- en Tailwind 4, la syntaxe `bg-[--ma-variable]` ne fonctionne plus — il faut les
  utilitaires générés par `@theme` (`bg-action`, `text-attenue`, `rounded-carte`…) ;
- **React 19 réinitialise un formulaire après l'exécution de son action.** Sans
  précaution, une erreur de validation vide tous les champs déjà saisis. Les Server
  Actions de formulaire renvoient donc la saisie brute (`valeurs`) et un compteur
  (`tentative`) servant de clé de remontage côté client. Tout nouveau formulaire doit
  suivre ce motif — c'est un piège silencieux, invisible tant qu'aucune validation
  n'échoue.
