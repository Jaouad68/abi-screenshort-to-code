# Carte de voyages

Carnet de voyages avec carte du monde interactive : marque les pays visités ou
en attente, ajoute tes voyages (année, villes, note) et découvre le % du monde
que tu as parcouru.

## Fonctionnalités

- Carte du monde cliquable (234 pays) : zoom molette / pincement / boutons, déplacement au glisser
- Statuts par pays : Pas visité, Visité, En attente (envies), avec la sélection en surbrillance
- Recherche de pays avec autocomplétion (clavier ↑ ↓ Entrée), noms en français
- Statistiques : % du monde visité (part de la surface terrestre hors Antarctique),
  pays visités, villes uniques, continents (sur 6)
- Liste des voyages, filtrable par continent, par année ou par pays en attente
- Ajout, modification et suppression de voyages
- Graphique « Voyages par an »
- Sauvegarde automatique dans le navigateur (localStorage), export / import JSON
- Responsive (ordinateur et mobile), aucune dépendance à l'exécution

## Lancer l'application

Application statique, sans étape de build :

```bash
cd carte-de-voyages
python3 -m http.server 8000   # ou : npx serve .
```

Puis ouvrir http://localhost:8000.

## Données de la carte

`data/countries.js` est généré à partir de Natural Earth (via `world-atlas`) :
tracés SVG pré-projetés (projection Natural Earth), noms français, continent et
surface réelle de chaque pays. Pour le régénérer :

```bash
npm install
npm run build:map
```
