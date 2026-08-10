# Sécurité — Plombéo

État à la fin de la **Phase 2**. Ce document décrit ce qui est réellement en place et,
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

## Ce qui n'est PAS encore en place

À traiter aux phases indiquées — ne pas considérer les phases livrées comme un socle de
sécurité complet :

| Manque | Phase prévue |
|---|---|
| MFA / TOTP | Phase 15 (obligatoire pour le rôle Propriétaire dès que le paiement en ligne est réel) |
| Réinitialisation du mot de passe | Phase 6 (avec l'adapter e-mail) |
| Rate limiting global (hors connexion) | Phase 15 |
| Politique CSP | Phase 15 |
| Chiffrement au repos de colonnes sensibles (IBAN…) | Phase 5 |
| Blocage de la suppression d'un client porteur de pièces comptables | Phase 5 |
| Purge planifiée des sessions et tentatives expirées | Phase 7 (la fonction existe, le cron non) |
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
