# Construction du design system Plombéo dans Figma

Scripts prêts à exécuter via l'outil `use_figma` (API Plugin Figma). Ils
reconstruisent dans un fichier Figma **exactement** le design system qui vit
dans le code — pas une interprétation.

## Pourquoi ces scripts existent

La session qui a fait l'analyse n'a pas pu écrire dans Figma : les outils en
écriture sont derrière une approbation que cette session ne savait pas
présenter. L'analyse, elle, est faite. Ces fichiers la figent pour qu'une
session disposant de la permission n'ait plus qu'à exécuter, sans refaire le
travail de relevé.

## Source de vérité

| Ce qui est repris | D'où ça vient |
|---|---|
| Couleurs, rayons | `plombeo/src/app/globals.css`, bloc `@theme` |
| Composants, variantes, états | `plombeo/src/components/ui.tsx` |
| Contraintes tactiles et de focus | `globals.css` + `ui.tsx` (`min-h-11`, `:focus-visible`) |

**Si le code change, ces scripts deviennent faux.** Ils ne se mettent pas à jour
tout seuls. Relire `globals.css` avant de les rejouer.

## Ordre d'exécution

Strictement séquentiel. Chaque script suppose que le précédent a réussi.

| # | Fichier | Ce qu'il fait |
|---|---|---|
| 00 | `00-inspection.js` | **Lecture seule.** Inventaire de l'existant. À lancer d'abord, toujours |
| 01 | `01-variables.js` | Collections, variables primitives et sémantiques, portées, syntaxe de code |
| 02 | `02-pages.js` | Squelette de pages |
| 03a | `03a-fondations-couleurs.js` | Nuancier, avec les ratios de contraste mesurés |
| 03b | `03b-fondations-typographie.js` | Échelle typographique, avec les occurrences relevées |
| 03c | `03c-fondations-espacement.js` | Espacements, rayons, démonstration de la cible de 44 px |
| 04 | `04-bouton.js` | Bouton — 3 variantes × 3 états |
| 05 | `05-formulaires.js` | Champ, ZoneTexte, Selection |
| 06 | `06-conteneurs.js` | Carte, ListeVide, APrevoir |
| 07 | `07-signaux.js` | Badge (4 tons), Message (2 tons) |
| 08 | `08-ecrans-page.js` | Page des écrans **et récolte des identifiants de composants** |
| 09 | `09-ecrans-connexion-accueil.js` | Connexion, Accueil |
| 10 | `10-ecrans-agenda-client.js` | Agenda, Fiche client |
| 11 | `11-ecrans-devis-facture.js` | Devis (détail), Facture (détail) |
| 12 | `12-ecrans-equipe-portail.js` | Équipe, Portail client |

### Les scripts d'écrans demandent une étape manuelle

Les scripts 09 à 12 commencent par un bloc `CONFIG` vide. **Recopiez-y les
identifiants renvoyés par le script 08** avant de les exécuter.

Ce n'est pas une négligence : l'API ne charge les pages qu'à la demande et
n'autorise **qu'une bascule de page par exécution**. Un script d'écran ne peut
donc pas aller chercher lui-même un composant qui vit sur une autre page — il
faut le lui passer.

### Deux façons d'assembler, et pourquoi celle-ci

Dans les écrans, les éléments **atomiques** (bouton, champ, badge, message) sont
des **instances** du design system : corriger le composant les met tous à jour.

Les **cartes**, elles, sont des frames locales liées aux mêmes variables, et non
des instances. Une instance Figma n'accepte pas d'enfants arbitraires : une
carte instanciée resterait figée sur son contenu d'exemple, donc inutilisable
pour composer un écran.

Chaque script renvoie les identifiants des nœuds créés. **Conservez-les** : les
scripts suivants n'en ont pas besoin, mais toute reprise ou correction en
dépend.

L'étape 03 est scindée en trois parce que l'API n'autorise **qu'une bascule de
page par exécution** : trois pages de fondations, donc trois scripts. Même
raison pour les composants, regroupés par page et non par fichier unique.

## Ce qui a été vérifié, et ce qui ne l'a pas été

**Vérifié** : les dix fichiers sont syntaxiquement valides, contrôlés en les
enveloppant dans la fonction asynchrone que Figma leur applique (`await` et
`return` au premier niveau sont donc bien acceptés).

**Non vérifié** : aucun n'a tourné contre un vrai fichier Figma. Attendez-vous à
corriger des détails — un nom de style de police refusé, une propriété numérique
qui ne se lie pas. Les liaisons de variables numériques sont d'ailleurs
enveloppées dans un `try` : un échec est **remonté dans la valeur de retour**
plutôt que d'interrompre le script, parce qu'un composant correct mais
partiellement lié vaut mieux qu'une exécution arrêtée au milieu.

Le script `00` existe précisément pour constater l'état avant d'écrire.

En cas d'erreur : l'exécution de `use_figma` est **atomique**. Un script qui
échoue n'a rien modifié. On corrige et on rejoue, sans nettoyage préalable.

## Police

Le code utilise la pile de polices du système (`ui-sans-serif, system-ui…`), qui
n'existe pas dans Figma. Les scripts emploient **Inter**, la plus proche
disponible partout. C'est une approximation assumée, et la seule du lot.

## Deux écarts relevés à l'analyse, non corrigés ici

1. **Les fonds et bordures de badge sont codés en dur** dans `ui.tsx`
   (`#e8f4ed`, `#bcdcc9`, `#fdf3e2`…), hors du bloc `@theme`. Les scripts en
   font des variables Figma, ce qui rend l'écart visible : Figma sera mieux
   rangé que le code.
2. **La bordure `trait` n'atteint pas 3:1** contre le blanc (1,35:1). Sur un
   champ de saisie, c'est la seule chose qui délimite la zone de saisie.
   Volontairement **non corrigé** dans Figma : le fichier doit refléter le code,
   pas le réparer en douce. Voir la spécification du design system.
