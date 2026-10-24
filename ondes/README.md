# Ondes

Application web installable (PWA) pour écouter les radios et regarder les
télévisions gratuites du monde entier, en direct.

## Fonctionnalités

- **Radio** : plus de 40 000 stations (annuaire libre Radio Browser), populaires par pays,
  16 genres, tendances mondiales, tous les pays avec leur nombre de stations
- **Télévision** : chaînes gratuites en accès libre, par pays et par catégorie. Trois annuaires
  sont fusionnés : la liste par pays d'iptv-org, ses fichiers sources (chaînes pas encore
  classées, plateformes Pluto TV, Samsung TV Plus, Rakuten TV…) et la liste Free-TV. Les doublons
  sont regroupés et leurs flux servent de secours. Pour chaque pays, des onglets ajoutent les
  chaînes du monde entier dans ses langues (« En arabe », « En français »…) et les chaînes
  internationales, avec affichage par pages pour les grandes listes, lecteur HLS, zapping précédente / suivante, incrustation et plein écran
- **Recherche** de radios et de chaînes, par nom ou par pays
- **Favoris** et historique récent, gardés sur l'appareil
- **Lecteur** : mini-lecteur, lecteur plein écran, minuteur de sommeil, volume, partage,
  commandes sur l'écran verrouillé (Media Session)
- **Installable** sur iPhone et Android (« Ajouter à l'écran d'accueil »), démarrage hors ligne
  de l'interface

## Lancer en local

```bash
cd ondes
python3 -m http.server 8000
```

Puis ouvrir http://localhost:8000. Aucune étape de build : `vendor/hls.min.js` est la
version 1.5.20 de hls.js.

## Mise en ligne

N'importe quel hébergement statique en HTTPS convient (Vercel, Netlify, GitHub Pages).
En HTTPS, l'application n'affiche que les flux HTTPS, car les navigateurs bloquent les
flux HTTP sur une page sécurisée.

## Limites

- Les flux appartiennent aux diffuseurs : certains sont hors ligne, d'autres réservés à
  leur pays. L'application passe alors au flux suivant ou affiche un message.
- iptv-org et Free-TV ne répertorient que des chaînes diffusées gratuitement et légalement en ligne :
  les chaînes payantes n'y figurent pas.
