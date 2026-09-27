# Mémoire dunoise — Châteaudun 1914–1918

Site de mémoire et de transmission consacré aux combattants de la Première Guerre mondiale liés à Châteaudun.
Refonte de https://memoire-dunoise-1914-1918.zsz4krtbkv.chatgpt.site (page unique d'origine).

- **Contenus** : `content/` (Markdown + `site.json`), modifiables depuis `/admin/` (Decap CMS).
- **Générateur** : `scripts/build.mjs` (Node 20+, dépendances : gray-matter, marked, sharp).
- **Styles et scripts** : `static/assets/` (aucun framework ; le site fonctionne sans JavaScript).
- **Guides** : [ADMINISTRATION.md](ADMINISTRATION.md) (mise à jour, mise en service, coûts) et [A-FOURNIR.md](A-FOURNIR.md) (informations manquantes).

## Règles éditoriales appliquées par le générateur

- Un contenu au statut « brouillon » n'est jamais généré.
- Un article sans source, un document sans provenance ni droits, une fiche de combattant sans lien établi avec Châteaudun ni référence sont refusés et signalés.
- Une rubrique sans contenu validé (Actualités, Participer, Contact) n'est ni générée ni affichée dans le menu.
- Les champs légaux manquants s'affichent « en cours de validation », jamais inventés.

## Identité visuelle

Bleu nuit `#16233d`, blanc, rouge mesuré `#9b262c` (filets, repères de source). Titres en Source Serif 4, texte en Atkinson Hyperlegible Next (conçue pour la lisibilité), cotes et références en IBM Plex Mono. Polices hébergées localement, thème sombre automatique, contrastes ≥ 6,5:1.
