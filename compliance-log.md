# Journal de conformité AI Act (Règlement (UE) 2024/1689)

## Méthode

- **Date de l'audit :** 2026-10-18
- **Outil :** audit manuel. Le MCP Reguardian.eu n'était pas configuré dans la
  session ; aucun scan automatique n'a donc pu être lancé.
- **Vérification des correctifs :** rendu dans un navigateur (Chromium headless,
  1280 px et 390 px) et contrôle de la présence des mentions dans le DOM.
- **Statut :** tant qu'un scan Reguardian.eu n'a pas confirmé un correctif, il
  reste « à revoir », même s'il a été vérifié manuellement.

## Synthèse

| Gravité   | Nombre |
|-----------|--------|
| Critique  | 0      |
| Important | 0      |
| Mineur    | 1      |

Aucun projet du dépôt n'utilise de système d'IA au sens de l'article 3(1) :
aucun appel à un modèle ou à une API d'IA, aucune dépendance de machine learning.

## Périmètre analysé

| Projet | Constat | AI Act |
|--------|---------|--------|
| RésaZen (`src/`, `prisma/`) | Acompte déclenché par une règle fixe (`src/lib/acompte.ts` : `noShowCount >= seuilNoShow`). | Non applicable : une règle définie à la main n'est pas un système d'IA (art. 3(1), considérant 12). RGPD : déjà traité. |
| Resto Pilot (`index.html`, `assets/`, `resto-pilot.html`) | Présenté comme « copilote IA », mais toutes les réponses sont écrites à l'avance (`assets/js/data.js`). | Hors champ aujourd'hui ; voir problème n° 1. |
| `carte-de-voyages`, `cours-ou-pas-95`, `electricien-devis`, `mercredi`, `ondes` | Aucune fonctionnalité d'IA. | Non applicable. |

## Problèmes et correctifs

### 1. Mentions « IA » sur des réponses simulées (Resto Pilot)

- **Date :** 2026-10-18
- **Gravité :** mineur
- **Fichiers :** `index.html`, `assets/js/app.js`, `assets/css/resto.css`,
  `resto-pilot.html`
- **Règle :** pas une infraction à l'AI Act (pas de système d'IA, art. 3(1)).
  Si un vrai modèle est branché, l'art. 50(1) et 50(2) imposeront de dire à
  l'utilisateur qu'il échange avec une IA et de signaler les contenus générés.
  En l'état, le risque réel est une pratique commerciale trompeuse (Code de la
  consommation, art. L121-2), car le site est publié sur GitHub Pages et affiche
  « Réponse générée par l'IA » pour du texte écrit à l'avance.
- **Correctif appliqué :** le mot « IA » est conservé, avec une mention
  explicite de démonstration :
  - bandeau permanent en haut de l'application : « Démonstration : les données
    et les réponses de l'IA sont simulées, aucun modèle d'IA n'est utilisé. » ;
  - note dans l'assistant : « Démonstration, réponses simulées : l'assistant
    renvoie des réponses écrites à l'avance, aucun modèle d'IA n'est interrogé. » ;
  - libellé des réponses aux avis : « Réponse générée par l'IA · simulée
    (démonstration) ».
- **Vérification :** `index.html` : bandeau, note et les 3 libellés présents,
  sans erreur JS ni débordement horizontal, sur bureau et sur mobile.
  `resto-pilot.html` : bandeau présent ; la note et les libellés sont dans le
  code, mais pas affichés à cause d'un bug JS antérieur (voir remarques).
- **Statut :** à revoir (corrigé et vérifié manuellement ; à confirmer par un
  scan Reguardian.eu)

## Remarques hors AI Act

- `resto-pilot.html` lève l'erreur `Identifier '$' has already been declared` au
  chargement, ce qui bloque la navigation entre les pages. Ce bug existait avant
  cet audit et n'a pas été corrigé ici.
