---
workflow: hyperframes          # vendored skill, URL-free: the truth source is a local file
format: 1920x1080
duration: 50s
audio: music
loop: false
theme: ""                      # chosen at stage 3
---

# Resto Pilot , le saumon ne manquera pas

**One message:** Resto Pilot vous prévient avant qu'un plat manque en plein service.

**Audience & channel:** gérants de restaurant indépendants (bistrots, brasseries). Vidéo montrée en rendez-vous commercial, sur un ordinateur ou une tablette, son allumé mais pas indispensable : chaque plan doit se comprendre en muet.

**Truth source:** `resto-pilot.html` (racine du dépôt), données de démonstration du restaurant fictif « La Table d'Olivier » (bistrot français, 64 couverts). Claims and numbers come only from here.

**Proof moment:** l'alerte « Rupture imminente — Saumon frais » : stock à 2,1 kg, vendredi soir prévu à +24 % d'affluence, commande conseillée avant 16 h, bouton « Commander », puis la ligne de commande « Saumon frais · 9 kg à commander ».

**Story beats (4)**
1. **Douleur** : vendredi soir, plein service, le plat signature qu'on raye de l'ardoise. Pas de logo.
2. **Le signal** : 12 minutes plus tôt, Resto Pilot a vu le stock (2,1 kg) croiser la prévision (+24 %).
3. **Preuve** : l'alerte, le bouton « Commander », les 9 kg ajoutés à la commande.
4. **Résolution + marque** : le service se passe, le saumon est là. Resto Pilot, le copilote IA de votre restaurant.

**Components** (inventaire détaillé à l'étape 2)
| Component | Real or imaginary | Notes |
|---|---|---|
| Carte d'alerte « Rupture imminente — Saumon frais » | real | `alerts[0]`, niveau high, icône triangle |
| Ligne de stock « Saumon frais · 2,1 kg · niveau 11 % » | real | table des stocks, statut rouge |
| Prévision vendredi soir +24 % | real | texte de l'alerte |
| Ligne de commande « 9 kg à commander » | real | liste de commande suggérée |
| Ardoise du jour / ticket de cuisine | imaginary | décor de la douleur, aucun chiffre |

**Brand:** pas de fichier logo : la marque est le pictogramme couverts (Font Awesome `fa-utensils`) dans un carré arrondi dégradé accent → ambre, plus le nom « Resto Pilot » en Fraunces 600. On le reprend tel quel, sans le redessiner. · couleurs `--sidebar #16241F` · `--ink #18211F` · `--bg #F4F1EC` · `--accent #D9743F` · `--amber #E8A53D` · `--red #D94A3D` · `--green #2E9E6B` · polices Fraunces (titres) et Inter (interface), à embarquer en local avec le sous-ensemble `latin-ext`.

**Do / Don't:**
- Tout en français. Majuscules écrites à la main, jamais `text-transform`.
- Aucun chiffre, client ou fonction absent de `resto-pilot.html`. Pas de « +X % de CA », pas de témoignage.
- Les données sont fictives : mention discrète « Données de démonstration » sur les plans d'interface (à confirmer).
- Peu de texte à l'écran. Pas de barre de progression, pas de texte en dégradé, pas de noir ou blanc purs, pas d'easing élastique.

**Deliverables:** `resto-pilot-rupture-1920x1080.mp4` (master 4K réduit), environ 50 s, musique libre de droits.
