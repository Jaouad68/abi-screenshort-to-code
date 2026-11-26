# Build log

| ID | date | état | ce qui manque | plus dur que prévu |
| --- | --- | --- | --- | --- |
| S01 | 2026-11-26 | fait | inscription et paiement (hors scope, les boutons affichent un message de démo), sélecteur de pays décoratif, liens Connexion et pied de page vides | rien de notable ; le mot animé du titre est doublé d'un texte pour lecteurs d'écran et s'arrête si « réduire les animations » est actif |
| S02 | 2026-11-26 | fait | — | ancre `#formules`, plus une ancre par formule (`#formule-solo`…) avec mise en avant depuis le menu |

Stack : HTML, CSS et JavaScript sans dépendance ni build, dans `sillon/`.
Vérifié : 1440 px et 390 px sans défilement horizontal, thème clair et sombre,
navigation au clavier, aucune erreur console, balayage `sweep.py` propre.
Captures pour replica-diff : `replica/clone-screens/S01.png` et `S01-mobile.png`.
| S03 lecteur | 2026-11-26 | fait | synchronisation entre appareils (pas de comptes), hors connexion pour le catalogue, accès au lecteur non réservé aux abonnés (démo) | la limite de débit de l'API Openverse (100/min, 1 000/jour par IP sans clé) : requêtes en série, nouvelle tentative et cache de 12 h |

Lecteur (`sillon/ecouter.html`, `player.js`, `player.css`) : fichiers de l'utilisateur
stockés dans IndexedDB et titres Creative Commons d'Openverse filtrés sur les licences
compatibles avec un usage commercial, avec licence, source et crédit sur chaque titre.
Vérifié : import de deux fichiers, lecture, suivant, pause, favori, playlist, persistance
après rechargement, Découvrir (48 titres), 1440 px et 390 px sans défilement horizontal.
Non vérifié : lecture d'un titre du catalogue et recherche, le quota journalier anonyme
d'Openverse étant épuisé pour l'adresse IP du conteneur de test.
