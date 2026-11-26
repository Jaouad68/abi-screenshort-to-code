# Recon map: page d'abonnement d'un service de streaming musical (web)

Référence étudiée : la page publique Premium de Spotify (France).
Scope : la page d'offres seule (sections, formules, comparatif, mentions). Pas de lecteur, pas de catalogue, pas de paiement.
For : Jaouad, sous une marque originale à définir avec /replica-brand.
Date : 2026-11-26

Règle de clean-room : on reprend la structure et le parcours, pas le nom, le logo,
le vert, les illustrations, les textes ni les noms de fonctionnalités déposés
(« Jam », « daylist », « Mix à plusieurs », « DJ »). Les captures de `screens/`
servent de référence et ne sont jamais livrées.

## Sources

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | page d'offres | https://www.spotify.com/fr/premium/ | lue une fois le 2026-11-26, texte + captures desktop et mobile dans `screens/S01-premium*`. Les feuilles de style tierces n'ont pas chargé, la mise en page des captures est partielle |
| 2 | article d'aide sur les formules | https://support.spotify.com/fr/article/premium-plans/ | non lu (domaine autorisé après coup), à consulter si besoin de détails sur Duo/Famille |

## Core loop

Un visiteur compare les formules et clique sur l'essai gratuit de celle qui lui convient.

## Screens

| ID | screen | route / how to reach | purpose | key components | states seen |
| --- | --- | --- | --- | --- | --- |
| S01 | Page d'offres | `/premium` | présenter l'offre payante et convertir en essai | en-tête avec menu des formules, hero à mots qui défilent, bandeau d'avantages, sections de fonctionnalités, section « sur tous vos appareils », grille de 4 cartes d'offre, lien vers la formule gratuite, pied de page | desktop, mobile, offre d'essai active avec date de fin |
| S02 | Ancre « toutes les formules » | `/premium#plans` (lien « Voir tous les abonnements ») | aller directement à la grille | grille de cartes | idem S01 |
| S03 | Mentions de l'offre | lien « Offre soumise à conditions » | conditions de l'essai | page de texte | hors scope, on écrit les nôtres |

## Sections de S01, de haut en bas

1. **En-tête** : logo, menu déroulant « Abonnements » (4 formules avec une ligne de description chacune), Assistance, Télécharger, S'inscrire, Connexion, bouton d'essai. Sur mobile : bouton Menu, et un bouton d'essai collant.
2. **Hero** : titre avec un mot qui change en boucle (5 mots), bouton d'essai principal, lien secondaire vers toutes les formules, mention légale de l'offre avec prix après essai et date de fin.
3. **Intro** : deux phrases de positionnement.
4. **Formule principale** : étiquette de formule, titre, 4 avantages avec icône + titre + phrase (sans pub, qualité lossless, hors connexion, ordre de lecture libre), bouton d'essai, lien formules, mention légale répétée.
5. **Écoute personnalisée** : 3 cartes de fonctionnalités marquées Premium (DJ IA, audio vers vidéo, playlist du moment).
6. **Écoute à plusieurs** : 2 cartes (écoute synchronisée en temps réel, compatibilité musicale).
7. **Contenus** : 2 cartes (livres audio, podcasts).
8. **Appareils** : 3 colonnes (voiture, montres, maison).
9. **Grille d'offres** : titre + sous-titre, 4 cartes (voir ci-dessous), lien « ou inscrivez-vous gratuitement ».
10. **Pied de page** : 4 colonnes de liens, réseaux sociaux, sélecteur de pays, liens légaux, bouton paramètres des cookies.

## Les formules observées (faits de marché, pas du contenu à copier)

| formule | prix | comptes | essai | avantages listés | bouton | condition |
| --- | --- | --- | --- | --- | --- | --- |
| Personnel | 12,14 €/mois | 1 | 3 mois à 0 € (badge) | 1 compte, 12 h/mois de livres audio, résiliable | essai | jamais essayé Premium, offre jusqu'au 31/12/2026 |
| Étudiants | 7,07 €/mois | 1 vérifié | 1 mois à 0 € (badge) | compte vérifié, réduction étudiante, résiliable | essai | inscrit dans l'enseignement supérieur |
| Duo | 17,20 €/mois | 2 | aucun | 2 comptes, livres audio (gestionnaire seul), résiliable | « Obtenir » | même adresse |
| Famille | 21,24 €/mois | jusqu'à 6 | aucun | 6 comptes, contrôle parental, livres audio (gestionnaire seul), avantages moins de 15 ans, résiliable | « Obtenir » | même adresse |

Ordre d'affichage : Personnel, Étudiants, Duo, Famille (la carte Famille passe seule sur une deuxième ligne en desktop). Chaque formule a sa couleur d'accent sur le nom et le bouton.

## Flows

```
F01 Visiteur démarre l'essai de la formule principale
    S01 hero -> bouton d'essai -> (inscription, hors scope)
    happy path clicks: 1
    edge: déjà abonné ou déjà essayé (l'offre ne s'applique pas), offre expirée (le badge et la mention disparaissent)

F02 Visiteur compare les formules puis en choisit une
    S01 -> « Voir tous les abonnements » -> S02 grille -> bouton de la carte
    happy path clicks: 2
    edge: étudiant non éligible, foyer à des adresses différentes

F03 Visiteur arrive par le menu d'une formule précise
    S01 en-tête -> menu Abonnements -> formule -> carte correspondante mise en avant
    happy path clicks: 2
```

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| Button | primaire (pilule pleine), secondaire (lien souligné), couleur par formule | default, hover, focus, active | S01 partout |
| Header | desktop, mobile avec bouton Menu | ouvert, fermé, menu déroulant des formules | S01 |
| StickyCTA | mobile | visible après le hero | S01 |
| RotatingWord | — | animation, réduite si prefers-reduced-motion | hero |
| LegalNote | petit texte avec lien | — | hero, formule principale, cartes |
| FeatureRow | icône + titre + texte | — | formule principale |
| FeatureCard | carte avec badge « Premium », visuel, titre | — | sections 5 à 7 |
| DeviceColumn | icône/visuel + titre + texte | — | section 8 |
| PlanCard | avec badge d'essai, sans badge | default, hover, mise en avant (ancre) | grille |
| Footer | colonnes de liens, pays, légal | — | S01 |

## Inferred data model

Pas de back-end dans ce scope. Les formules seront un fichier de données statique.

```
Plan     id, name, tagline, price_month_eur, accounts_max, trial {months, price_eur, badge, ends_at} | null,
         benefits[], cta_label, condition_note, accent_color
         evidence: S01 grille et menu de l'en-tête
         confidence: high
Feature  id, group (perso | social | contenus | appareils), title, body, premium_only, visual
         evidence: S01 sections 4 à 8
         confidence: high
```

## Feature matrix

Voir `features.csv`. Must : 10, should : 7, could : 4, skip : 5.

## Out of scope (cannot or should not be cloned)

- Le nom, le logo, le vert et la typographie propriétaire de la marque, ses illustrations et ses textes.
- Les noms de fonctionnalités déposés (Jam, daylist, DJ, Mix à plusieurs) : on décrit nos propres fonctionnalités avec nos mots.
- Le catalogue musical, les livres audio et les podcasts : contenus sous licence.
- Les intégrations CarPlay, Android Auto, montres et enceintes : partenariats et certifications.
- L'inscription, la vérification étudiante et le paiement : hors du scope choisi (page seule).

## Size

Screens 1 (+ ancre), flows 3, entities 2 (statiques). Hard parts : une page qui convertit sans ressembler à l'original, le mot qui défile accessible, la grille de 4 cartes responsive. Size : S.
