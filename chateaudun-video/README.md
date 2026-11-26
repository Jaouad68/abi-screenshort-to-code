# Châteaudun, film de découverte touristique (5 min)

Format 16:9, 1920x1080, 30 i/s. Musique originale joyeuse générée par script (libre de droits), sol majeur, 112 BPM. L'ancienne version calme est gardée dans `public/musique-calme.mp3`.

- Aperçu : `npm run studio`
- Musique : `npm run music` (crée `public/musique.mp3`)
- Export : `npm run render` (sortie dans `sorties/`)

## Montage

| Temps | Séquence |
|---|---|
| 0:00 | Ouverture : le château se reflétant dans le Loir |
| 0:20 | Carte : Paris, Chartres, Orléans, puis le Dunois |
| 0:45 | I. Le château |
| 2:08 | II. La vieille ville et la grande place |
| 3:16 | III. 18 octobre 1870 |
| 4:00 | IV. Le quartier Kellermann, d'hier à aujourd'hui |
| 4:44 | Fin et crédits |

Chaque photo n'apparaît qu'une seule fois, avec un lent mouvement de caméra en plusieurs temps.

Les plans (photo, cadrage, zoom, légende) sont tous dans `src/shots.ts` :
modifier ce fichier puis relancer l'export suffit.

Les images dans `public/photos/` ont été fournies pour ce film :
vérifier leurs droits avant toute diffusion publique.
