# Sécurité — Plombéo

État à la fin de la **Phase 5**. Ce document décrit ce qui est réellement en place et,
tout aussi important, ce qui ne l'est pas encore.

## Modèle de menace retenu

L'utilisateur est un artisan seul, sur un téléphone qu'il pose sur un chantier. Les
risques prioritaires sont donc, dans l'ordre :

1. l'accès aux données d'un artisan par un autre (fuite entre tenants) ;
2. le vol ou la perte d'un appareil resté connecté ;
3. le forçage d'un mot de passe faible ;
4. l'énumération des comptes existants.

## Ce qui est en place

### Cloisonnement entre artisans

Le cloisonnement est **logique** : chaque table métier porte `organizationId`
(décision d'architecture n°8). La garantie ne repose pas sur la discipline des
développeurs mais sur un point de passage unique, `src/lib/dal.ts` :

- l'organisation courante est **toujours** dérivée de la session serveur ;
- aucune Server Action n'accepte d'`organizationId` venant du client ;
- l'appartenance (`Membership`) est revérifiée **à chaque requête**, si bien qu'un
  accès retiré prend effet immédiatement sans attendre l'expiration du cookie.

Vérifié par `src/lib/isolation.test.ts`, dont la valeur a été contrôlée par mutation
(voir README).

### Sessions

Double barrière, les deux nécessaires :

| Barrière | Rôle |
|---|---|
| Jeton signé HS256 (`jose`) | Intégrité et expiration |
| Ligne `Session` en base | **Révocation** — c'est la base qui fait autorité |

Un cookie encore valide cryptographiquement n'authentifie pas si la session est
révoquée ou expirée en base. C'est ce qui rend « déconnecter tous mes appareils »
réellement effectif.

Seul le **SHA-256** du jeton est stocké : une lecture de la table `Session` ne permet
pas de fabriquer un cookie valide. SHA-256 sans sel est adapté ici, l'entrée étant un
secret aléatoire de 256 bits — contrairement à un mot de passe, qui exige bcrypt.

Cookie : `httpOnly`, `secure` en production, `sameSite=lax`, expiration explicite.

### Mots de passe

bcrypt, coût 12, minimum 12 caractères. Jamais journalisés, jamais renvoyés au client.

### Non-énumération des comptes

- Un e-mail inconnu et un mot de passe incorrect produisent **le même message**.
- Pour un e-mail inconnu, une comparaison bcrypt **factice** est exécutée afin que le
  temps de réponse soit comparable (~300 ms mesurés) : sans cela, la latence
  révélerait quels e-mails sont enregistrés.
- L'inscription sur un e-mail déjà pris renvoie un message neutre.

### Anti-force brute

Compteur en base sur une fenêtre glissante (10 échecs / 15 minutes par e-mail). En
base plutôt qu'en mémoire : l'hébergement est sans état et un compteur mémoire serait
contourné en frappant une autre instance.

### Journal d'audit

`AuditLog` est en écriture seule : `src/lib/audit.ts` est le seul point d'écriture, et
aucune fonction de mise à jour ou de suppression n'existe. La table n'a délibérément
pas de colonne `updatedAt`. Les métadonnées ne doivent jamais contenir de mot de
passe, de jeton, ni de donnée personnelle superflue.

L'échec d'écriture d'un audit ne fait jamais échouer l'action métier qu'il accompagne.

### Cloisonnement des données métier (Phase 2)

Les clients, logements et équipements suivent la même règle que le reste : `src/lib/crm.ts`
dérive l'organisation de la session et l'applique à **chaque** requête.

Point important : les lectures utilisent `findFirst({ where: { id, organizationId } })`
plutôt que `findUnique({ where: { id } })`. Un identifiant valide appartenant à un autre
artisan se comporte donc exactement comme un identifiant inexistant — l'application
renvoie 404 dans les deux cas. Une réponse différente confirmerait l'existence d'une
fiche chez quelqu'un d'autre.

Les écritures utilisent `updateMany`/`deleteMany` avec le même filtre : une action visant
la fiche d'un autre artisan touche zéro ligne au lieu d'écrire. Les créations rattachées
à un parent (logement sous un client, équipement sous un logement) revalident ce parent
avant d'écrire.

Vérifié par `src/lib/isolation-crm.test.ts`, validé par mutation, et par un parcours
navigateur où un second artisan tente d'atteindre les fiches du premier par leurs URL
exactes.

### Actions sensibles

- **Export du fichier client** : permission dédiée (`client:exporter`), journalisé avec
  le nombre de lignes, réponse en `Cache-Control: no-store, private`. Le CSV neutralise
  l'injection de formule (`=`, `+`, `-`, `@`), sans quoi un nom de client malveillant
  s'exécuterait à l'ouverture dans Excel.
- **Suppression définitive d'un client** : réservée au propriétaire, confirmée par la
  saisie exacte du nom, journalisée. Elle emporte logements et équipements en cascade.
  ⚠️ À revoir en Phase 5 : elle devra être bloquée pour les clients porteurs de pièces
  comptables soumises à conservation **[À VÉRIFIER — SOURCE OFFICIELLE]**.

### Synchronisation hors-ligne (Phase 3)

L'endpoint `/api/sync` reçoit des mutations produites hors réseau. Trois protections :

- **Cloisonnement** : les interventions citées sont d'abord filtrées par l'organisation
  de la session. Un identifiant d'intervention appartenant à un autre artisan est
  refusé, pas écrit — vérifié par mutation dans `src/lib/idempotence.test.ts`.
- **Idempotence** : chaque mutation porte un `clientMutationId` (UUID généré sur
  l'appareil), et le serveur fait un `upsert` dessus. Rejouer une mutation ne crée pas
  de doublon *et* renvoie « appliqué » — un refus ferait réessayer la file jusqu'au
  seuil puis afficherait une fausse erreur à l'artisan.
- **Écritures figées après clôture** : une intervention `CLOTUREE` ou `ANNULEE`
  n'accepte plus aucune mutation. C'est elle qui servira de base à la facturation.

Chaque mutation d'un lot est traitée indépendamment : une ligne invalide ne fait pas
perdre les autres, sans quoi une seule saisie fautive bloquerait toute la file.

### Intégrité des états métier

Les transitions sont déclarées dans `src/lib/etats.ts` et vérifiées **côté serveur**
avant toute écriture. Masquer un bouton ne protège rien : une Server Action est un
point d'entrée réseau.

### Intégrité des documents commerciaux (Phase 4)

- Un devis n'est modifiable qu'à l'état `BROUILLON`. Le contrôle est fait **côté
  serveur à chaque écriture de ligne**, pas seulement par masquage de boutons.
- Le numéro est attribué une seule fois, par incrément atomique en base : deux
  devis passés en « prêt » simultanément n'obtiennent jamais le même numéro
  (vérifié par mutation, avec 20 attributions concurrentes).
- Un devis accepté ou refusé est figé : une correction passera par un nouveau
  devis, jamais par une réécriture (§14).

### Intégrité des pièces comptables (Phase 5)

Une facture émise ne se modifie plus. Trois barrières indépendantes, chacune
rattrapant ce que la précédente laisserait passer :

1. **Interdiction applicative** — toute écriture sur une facture ou ses lignes est
   refusée hors état `BROUILLON`, vérifiée côté serveur à chaque écriture. Testé en
   appelant les Server Actions avec des données forgées, c'est-à-dire exactement ce
   que ferait quelqu'un contournant l'interface.
2. **Totaux figés** — écrits en base à l'émission, jamais recalculés à l'affichage.
   Une facture affiche demain ce qu'elle affichait le jour de son émission.
3. **Empreinte SHA-256** — calculée à l'émission, vérifiée à chaque affichage. C'est
   un mécanisme de **détection**, pas de protection : il n'empêche pas une écriture
   directe en base, il empêche qu'elle passe inaperçue. Une divergence est journalisée
   comme incident (`invoice.integrity_failed`).

Correction : par **avoir** uniquement. La facture d'origine reste intacte.

`facture:emettre` est une permission **distincte** de `facture:modifier` : émettre est
l'acte irréversible qui engage l'entreprise.

Un client porteur d'une facture émise ne peut plus être supprimé — les pièces
comptables sont soumises à des obligations de conservation **[À VÉRIFIER — SOURCE
OFFICIELLE]**.

### Fichiers versés et signature (Phase 6)

**Aucun bucket public, aucune URL devinable.** Un fichier n'est jamais servi
directement : `GET /api/documents/[id]` vérifie la session, l'organisation et la
permission avant de streamer le moindre octet. Comme partout, la lecture filtre sur
`organizationId`, donc l'identifiant valide d'un autre artisan se comporte exactement
comme un identifiant inexistant — la réponse ne confirme jamais l'existence d'une pièce
chez quelqu'un d'autre.

Contrôles à l'envoi :

- **type déterminé sur les octets réels** (nombres magiques), jamais sur l'extension ni
  sur l'en-tête `Content-Type` — tous deux fournis par le client. Un exécutable renommé
  en `.jpg` passerait n'importe quel contrôle déclaratif ;
- liste blanche stricte : JPEG, PNG, WebP, HEIC, PDF. Un type identifiable mais hors
  liste (GIF, SVG) est refusé ;
- plafond de 10 Mo par fichier ;
- **chemin de stockage produit par le serveur** à partir de l'organisation et de 16
  octets aléatoires. Aucune donnée cliente n'y entre : la traversée de répertoire est
  impossible par construction, pas par filtrage — un filtre s'oublie, une absence
  d'entrée non. Le nom d'origine est conservé pour l'affichage seulement ;
- servi en `Content-Disposition: attachment` + `X-Content-Type-Options: nosniff` +
  `Cache-Control: no-store, private` : un fichier versé ne s'exécute jamais dans le
  navigateur et ne se met jamais en cache partagé.

**Aucun adaptateur « Null ».** Sans stockage configuré, l'envoi est refusé avec un
message explicite. Un adaptateur qui accepterait un fichier sans le conserver serait
pire que l'absence de fonctionnalité : l'artisan croirait ses preuves de chantier
enregistrées (§76).

Signature :

- l'**empreinte SHA-256 du contenu signé** est calculée sur un résumé **reconstruit
  côté serveur depuis la base**, jamais repris du formulaire. Une empreinte portant sur
  un texte envoyé par le navigateur n'attesterait que de ce que le client a bien voulu
  transmettre ;
- un tracé vide ou un nom vide sont refusés : mieux vaut aucune signature qu'une
  signature blanche donnant l'illusion d'un accord ;
- minimisation : user-agent tronqué à 180 caractères, **aucune adresse IP**.

**Ce que Plombéo ne prétend pas.** Il s'agit d'une signature *simple*, annoncée comme
telle en toutes lettres dans l'interface. Plombéo ne qualifie pas juridiquement sa
valeur probatoire. Le niveau de signature requis selon la nature et le montant de
l'engagement relève du règlement eIDAS et du droit français : **[À VÉRIFIER — SOURCE
OFFICIELLE ET CONSEIL JURIDIQUE]**. Une signature avancée ou qualifiée exige un
prestataire spécialisé (décision d'architecture n°4, toujours ouverte).

### Responsabilité fiscale

Plombéo **ne détermine jamais** le taux de TVA applicable et **ne rédige aucune
mention légale**. Les taux proposés dans les listes sont des valeurs de saisie, pas
une règle d'application. Cette frontière est délibérée : un défaut de conseil
fiscal engagerait l'artisan, et un texte par défaut lui donnerait un faux sentiment
de couverture (§15, §54).

**[À VÉRIFIER — SOURCE OFFICIELLE]** subsistent sur : les taux et leurs conditions
d'application aux travaux de plomberie, les mentions obligatoires d'un devis, et la
méthode d'agrégation et d'arrondi de la TVA retenue dans `src/lib/calcul.ts`.

### En-têtes de sécurité

Appliqués à toutes les réponses par `src/proxy.ts` : `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`,
`Permissions-Policy: camera=(), microphone=(), geolocation=()` (ouverts en Phase 3,
quand ces fonctionnalités serviront réellement).

### Autorisation

Le contrôle est fait **au plus près de la donnée**, dans le DAL — jamais dans un
`layout.tsx` : avec le rendu partiel de Next.js, un layout n'est pas réexécuté à chaque
navigation et ne constitue donc pas une barrière fiable. La redirection présente dans
`proxy.ts` est **optimiste** (simple présence du cookie) et n'a qu'un rôle de confort.

Masquer un bouton dans l'interface ne protège rien : une Server Action est un point
d'entrée réseau et vérifie systématiquement la permission côté serveur.

### Automatisation et envoi d'e-mails (Phase 7)

**Le balayage est la seule fonction du projet qui traverse les organisations.**
C'est pourquoi son point d'entrée `/api/cron/automatisations` n'est pas protégé par
une session — aucun humain ne l'appelle — mais par un **secret partagé comparé en
temps constant** (`timingSafeEqual`) : une comparaison naïve fuit le secret octet par
octet. Sans `CRON_SECRET` configuré, la route est **fermée (503)**, pas ouverte : le
défaut sûr est de ne rien faire. Le refus renvoie le même message qu'il s'agisse d'un
secret absent ou erroné.

`contenuPdfPourOrganisation` est la seule fonction de lecture métier qui ne vérifie ni
session ni permission — le balayage tourne sans utilisateur connecté. Son unique
appelant légitime est la file d'e-mails, qui lit `organizationId` sur la ligne que le
moteur a elle-même écrite, jamais sur une donnée reçue d'un client. Toutes les routes
et Server Actions passent par `contenuPdf`, qui exige la permission.

**Dosage des relances** (§84). Une automatisation mal calibrée abîme la relation que
l'artisan a mis des années à construire. Garde-fous non désactivables : 3 relances
maximum par facture, 7 jours minimum entre deux, envoi entre 8 h et 20 h hors
week-end, arrêt immédiat sur paiement, exclusion par client. **Aucune règle n'est
active à l'installation.**

L'**idempotence** repose sur une clé déterministe (`déclencheur:entité:occurrence`)
sous contrainte d'unicité en base, jamais sur un booléen « déjà envoyé » : entre la
lecture et l'écriture, deux balayages concurrents verraient tous deux `false`. Le
test qui la valide a d'abord été écrit de façon **vacueuse** — le délai minimum
rattrapait le second balayage avant que la clé n'entre en jeu, et retirer la
contrainte ne faisait échouer aucun test. Il a été refait avec deux balayages
espacés de 30 jours, où tous les garde-fous applicatifs sont franchis et où seule la
base peut encore arbitrer.

**Aucun e-mail avalé en silence** (§76). Sans SMTP configuré, l'envoi est refusé avec
un message explicite, l'option n'est pas proposée à la création d'une règle, et les
échecs sont affichés à l'artisan. Pas de mode « console » : écrire l'e-mail dans les
journaux ressemble trop à un envoi réussi. Au-delà de 5 tentatives, l'état devient
définitivement `ECHOUE` plutôt que de rester « en cours » indéfiniment.

Les exécutions **écartées** sont tracées avec leur motif en français : une
automatisation qui ne fait rien sans dire pourquoi est indiscernable d'une
automatisation en panne. Les motifs temporaires (hors plage d'envoi, délai non
atteint) ne sont pas figés — les enregistrer bloquerait l'envoi pour toujours.

### Achats et stock (Phase 8)

Les **prix d'achat et les conditions fournisseur sont des données commercialement
sensibles** : leur fuite serait plus dommageable que celle d'un simple identifiant.
D'où une séparation nette dans les rôles — le technicien voit et bouge le stock, parce
que c'est lui qui prend les pièces dans le camion, mais **ne voit pas les achats**.

Le journal des mouvements porte l'e-mail de l'auteur de chaque mouvement : un écart de
stock doit pouvoir donner lieu à une question, pas à une enquête.

### Mise à jour des dépendances

`npm audit` fait partie de la vérification, pas d'une revue annuelle. En août 2026,
Next.js 16.2.10 portait trois avis de sévérité haute, corrigés en 16.3.0 — dont un
contournement de `proxy.ts` en App Router.

Ce contournement **n'ouvrait rien ici** : la redirection de `proxy.ts` est
délibérément optimiste et l'autorisation réelle vit dans le DAL, au plus près de la
donnée. C'est précisément le bénéfice de ne jamais faire d'un middleware une barrière
de sécurité. Les deux autres avis (déni de service sur les Server Actions, exposition
non authentifiée de points d'entrée de fonctions serveur) étaient, eux, réellement
applicables. La montée de version a été faite et vérifiée par les 213 tests et les six
parcours navigateur.

## Ce qui n'est PAS encore en place

À traiter aux phases indiquées — ne pas considérer les phases livrées comme un socle de
sécurité complet :

| Manque | Phase prévue |
|---|---|
| MFA / TOTP | Phase 15 (obligatoire pour le rôle Propriétaire dès que le paiement en ligne est réel) |
| Réinitialisation du mot de passe | Phase 15 (l'adaptateur e-mail existe depuis la Phase 7 ; le parcours de réinitialisation reste à écrire) |
| Rate limiting global (hors connexion) | Phase 15 |
| Politique CSP | Phase 15 |
| Chiffrement au repos de colonnes sensibles (IBAN…) | Phase 15 |
| Analyse antivirale des fichiers versés | Phase 15 (prestataire à retenir ; aucun contrôle antiviral n'est fait aujourd'hui) |
| Politique de rétention et purge des documents | Phase 7 (règles datées, obligations **[À VÉRIFIER — SOURCE OFFICIELLE]**) |
| Purge planifiée des sessions et tentatives expirées | Phase 15 (la fonction et le point d'entrée cron existent ; le branchement reste à faire) |
| Rotation du secret de session | Phase 15 |
| Tests de restauration de sauvegarde | Phase 15 |

## RGPD

L'architecture réduit le risque mais **ne constitue pas une garantie juridique de
conformité**. Une revue par un juriste ou un DPO reste nécessaire avant toute collecte
de données réelles de clients tiers.

Mesures déjà appliquées :

- **Minimisation** : aucune adresse IP conservée ; le user-agent est tronqué à 180
  caractères et sert uniquement à ce que l'artisan reconnaisse ses appareils.
- **Purge** : `purgerDonneesExpirees()` supprime tentatives de connexion (24 h) et
  sessions expirées.
- Les durées de conservation des documents comptables relèvent d'obligations légales
  françaises **[À VÉRIFIER — SOURCE OFFICIELLE]** et seront traitées en Phase 5.

## Signaler une vulnérabilité

Projet en cours de construction, non encore exposé publiquement. Signalement par le
canal interne du projet.
