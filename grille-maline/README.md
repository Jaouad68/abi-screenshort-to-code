# Grille Maline

Application web EuroMillions (5 numéros de 1 à 50, 2 étoiles de 1 à 12), en français, mobile d'abord,
sans backend. **Elle ne prédit aucun tirage** : chaque combinaison a 1 chance sur 139 838 160 de
gagner le jackpot, et l'application l'affiche en permanence.

Tout le code tient dans `index.html` (React 18 + htm pour le JSX sans compilation, Tailwind).

## Fonctionnalités

1. **Générateur anti-partage** : tirage par `crypto.getRandomValues` (sans biais de modulo, aucun
   repli sur `Math.random`), puis rejet des grilles populaires :
   - plus de 3 numéros entre 1 et 31 (dates de naissance) ;
   - suite de 3 numéros consécutifs ou plus ;
   - motifs visuels : 3 cases voisines en colonne ou en diagonale, ou 4 numéros sur une même
     ligne ou colonne de la grille de référence (5 lignes de 10, constante `COLONNES`) ;
   - multiples réguliers : 3 multiples de 5 ou plus, progression arithmétique de 4 termes ;
   - combinaison de 5 numéros déjà sortie (si un historique est importé).

   Mode **« Les plus sortis »** : tirage aléatoire parmi les 15 numéros et 5 étoiles les plus sortis
   de l'historique importé, avec les mêmes filtres quand c'est possible. Ce mode n'augmente pas les
   chances de gagner, et l'interface le dit.
2. **Score d'originalité** (0 à 100) avec l'explication de chaque critère.
3. **Import CSV** de l'historique (format FDJ `boule_1…etoile_2` ou `date;n1;n2;n3;n4;n5;e1;e2`),
   fréquences et écarts, avec un rappel que ces chiffres ne prédisent rien.
   **Analyse approfondie** : test du khi-deux d'uniformité (corrigé pour le tirage sans remise),
   marges de normalité, étoiles ajustées aux changements de règles (9, 11 puis 12 étoiles), parité,
   sommes, suites, paires, écarts, persistance entre périodes et **test rétrospectif** des
   « numéros les plus sortis ».
4. **Budget** : plafond mensuel, dépenses, alertes à 80 % et en cas de dépassement, lien vers
   joueurs-info-service.fr.
5. **Simulateur** : X grilles par semaine pendant N années, dépense totale, gain moyen attendu
   (taux de retour réglable, 50 % par défaut), probabilité de jackpot sur la période.

Les données (historique, budget, réglages) restent dans le `localStorage` de l'appareil.

## Lancer en local

```bash
cd grille-maline
python3 -m http.server 8000
```

## Tests

```bash
npm run test:grille-maline   # ou : node --test grille-maline/moteur.test.mjs
```

Les tests extraient le `<script id="moteur">` de `index.html` : ils vérifient le code livré.
