# Brand : page d'abonnement musique

Pas encore d'angle (`replica/fixes.md` n'existe pas, /replica-entrepreneur n'a pas tourné).
Noms choisis pour un service d'écoute francophone, chaleureux, plutôt « disquaire » que « tech ».

## Étape 1 : le nom

20 candidats, par style :

- descriptifs : Écoute+, Sonothèque, Musicabo, Plein Son
- composés : Sillonnet, Platinum Play, Boucle Libre, Sonbox
- inventés : Sonnia, Mélova, Tympa, Ritmo
- métaphores : Sillon, Platine, Refrain, Tympan, Diapason
- verbes : Boucle, Monte-le-son, Écoute

Écartés : Diapason (magazine musical français), Platinum Play (trop proche
d'offres « platinum » existantes), Ritmo / Sonbox / Écoute (trop génériques),
Mezzo et Allegra non retenus (marques connues). Aucun nom ne joue sur
« Spotify », « Spot » ni sur le vert de l'original.

**Les 5 retenus**

| nom | idée | prononciation | risque repéré à vérifier |
| --- | --- | --- | --- |
| **Sillon** (recommandé) | le sillon du vinyle : la musique qu'on suit | une syllabe claire en français, lisible en anglais | nom commun, marque possiblement déposée dans d'autres classes |
| Refrain | ce qu'on réécoute en boucle | identique en français et en anglais | mot très courant, domaine .com probablement pris |
| Platine | la platine vinyle | facile | proche de « platinum », à vérifier en classe 9 et 41 |
| Boucle | écouter en boucle | facile en français, difficile en anglais | nom commun |
| Tympan | l'oreille, l'écoute | facile | connotation médicale possible |

## Étape 2 : les vérifications

Aucune n'a été lancée : le réseau de cette session ne joint pas les bases de
marques ni les registres de domaines. Tout est **à faire**, rien n'est « disponible ».

| check | où | Sillon | Refrain | Platine | Boucle | Tympan |
| --- | --- | --- | --- | --- | --- | --- |
| marque France | data.inpi.fr, classes 9, 38, 41, 42 | à faire | à faire | à faire | à faire | à faire |
| marque UE | euipo.europa.eu eSearch / TMview | à faire | à faire | à faire | à faire | à faire |
| marque US | tmsearch.uspto.gov | à faire | à faire | à faire | à faire | à faire |
| monde | WIPO Global Brand Database | à faire | à faire | à faire | à faire | à faire |
| domaine | .fr, .com, .app chez un registrar | à faire | à faire | à faire | à faire | à faire |
| App Store et Play | recherche du nom exact | à faire | à faire | à faire | à faire | à faire |
| réseaux | X, Instagram, TikTok, GitHub | à faire | à faire | à faire | à faire | à faire |
| le web | « nom + musique streaming » | à faire | à faire | à faire | à faire | à faire |

Ce sont des vérifications de premier niveau, pas un avis juridique. Avant
d'investir dans le nom, une recherche par un conseil en propriété industrielle
s'impose.

## Étape 3 : la palette

L'original est vert vif sur noir. Ici : terre cuite sur crème, une autre famille
de teinte et un fond clair par défaut.

| rôle | clair | sombre |
| --- | --- | --- |
| bg | `#FBF6EE` crème | `#1A1614` |
| surface | `#F1E8DA` | `#26201C` |
| text | `#1F1A17` | `#F5EEE4` |
| text-muted | `#5E554D` | `#B8ADA2` |
| accent (bouton principal) | `#B5442A` terre cuite | `#F08A68` |
| on-accent | `#FFFFFF` | `#1A1614` |
| formule Étudiants | `#2F6B5E` vert sapin | idem |
| formule Duo | `#8A5A00` ocre | idem |
| formule Famille | `#5B4B8A` prune | idem |

Contrastes mesurés (WCAG 2.1) : texte sur fond 16,0 ; texte secondaire 6,8 ;
blanc sur terre cuite 5,5 ; terre cuite sur crème 5,1 ; blanc sur sapin 6,2,
sur ocre 5,9, sur prune 7,5 ; sombre : texte 15,6, accent 7,3. Zéro échec AA.
À repasser avec `contrast.py` quand `replica/design/tokens.json` existera.

## Étape 4 : brief du logo (pour Sillon)

- Idée : une ligne qui tourne en spirale, comme le sillon d'un disque vu de dessus.
- Type : symbole + mot (« sillon » en minuscules, sérif humaniste).
- Doit rester lisible à 16 px (favicon) et en icône 1024 px.
- Livrables : SVG, icône 1024×1024 sans transparence pour iOS, jeu de favicons, image sociale 1200×630.
- Ne doit pas ressembler à la marque d'origine : pas de cercle plein avec des
  arcs horizontaux, pas de vert, pas de noir plein en fond.

## Étape 5 : la voix

Trois mots : **chaleureuse** (pas familière), **claire** (pas sèche),
**honnête** (pas de petits caractères cachés).

| à faire | à éviter |
| --- | --- |
| dire le prix après l'essai dans la même phrase | cacher le prix dans une note de bas de page |
| parler d'écoute et de moments | empiler les superlatifs (« incontournable », « ultime ») |
| tutoyer ou vouvoyer, mais toujours pareil | changer de registre d'une section à l'autre |
| des boutons qui disent ce qui se passe | des boutons vagues (« Découvrir ») |
| expliquer qui peut prendre une formule | renvoyer seulement vers « conditions » |

Les textes de la page seront écrits pendant le build, dans cette voix, sans
reprendre une seule tournure de l'original.

## Étape 6 : le balayage

Pas encore de code. `brand.json` est prêt pour `sweep.py` après le build.
