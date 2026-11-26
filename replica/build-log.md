# Build log

| ID | date | état | ce qui manque | plus dur que prévu |
| --- | --- | --- | --- | --- |
| S01 | 2026-11-26 | fait | inscription et paiement (hors scope, les boutons affichent un message de démo), sélecteur de pays décoratif, liens Connexion et pied de page vides | rien de notable ; le mot animé du titre est doublé d'un texte pour lecteurs d'écran et s'arrête si « réduire les animations » est actif |
| S02 | 2026-11-26 | fait | — | ancre `#formules`, plus une ancre par formule (`#formule-solo`…) avec mise en avant depuis le menu |

Stack : HTML, CSS et JavaScript sans dépendance ni build, dans `sillon/`.
Vérifié : 1440 px et 390 px sans défilement horizontal, thème clair et sombre,
navigation au clavier, aucune erreur console, balayage `sweep.py` propre.
Captures pour replica-diff : `replica/clone-screens/S01.png` et `S01-mobile.png`.
