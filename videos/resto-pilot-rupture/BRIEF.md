---
workflow: hyperframes          # vendored skill, URL-free: the truth source is a local file
format: 1920x1080
duration: 50s
audio: music
loop: false
theme: "012 Thermal Receipt"   # adapté : « Ticket de cuisine »
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

**Components** (étape 2, captures dans `capture/`)

Note sur 8 : actuel / calme / conforme à la marque / montre la preuve (0 à 2 chacun).

| # | Component | Score | Real or imaginary | Texte exact (source) | Traitement |
|---|---|---|---|---|---|
| 1 | **Preuve** : carte d'alerte « Rupture imminente — Saumon frais » | 2/1/2/2 = 7 | real, isolée | « Stock à 2,1 kg. Vendredi soir prévu à +24 % d'affluence. Commande conseillée avant 16 h. » · « Il y a 12 min » · bouton « Commander → » (`alerts[0]`) | Reconstruite en HTML, seule à l'écran, filet rouge à gauche. Les 4 autres alertes sont retirées. |
| 2 | Ligne de stock « Saumon frais » | 2/1/2/2 = 7 | real, simplifiée | Poisson · 2,1 kg · barre de niveau rouge · DLC 21/06 · badge « Commander » (`stock.items`) | 3 lignes seulement (saumon, magret, bœuf haché) pour le contraste rouge, ambre, vert. |
| 3 | Toast de confirmation | 2/2/2/1 = 7 | real | « Action « Commander » lancée » (`data-toast`) | C'est tout ce que fait le bouton aujourd'hui : **le film ne montre pas de commande envoyée au fournisseur**. |
| 4 | Liste de préparation, ligne saumon | 2/1/2/1 = 6 | real, simplifiée | « Saumon frais · 9 kg à commander · Rupture prévue » (`forecast.prep`) | Une seule ligne mise en avant, les autres estompées. |
| 5 | En-tête de marque | 2/2/2/0 = 6 | real | Pictogramme couverts dans le carré dégradé, « Resto Pilot », « La Table d'Olivier » | Pour l'arrivée de la marque au temps 4. Pictogramme Font Awesome repris tel quel. |
| 6 | Ardoise du jour en salle | — | imaginary (décor) | « Pavé de saumon » rayé à la craie | Raconte la douleur sans chiffre ni fonction inventée. Aucun logo dessus. |

Hors film : les KPI du tableau de bord (CA, ticket moyen…), les facteurs météo et match (ils concernent le samedi, pas le vendredi), le budget « ~410 € » de l'assistant IA.

Chronologie fidèle à la démo : l'application est datée du jeudi 19 juin ; l'alerte arrive le jeudi, la commande est à passer avant 16 h, et le service menacé est celui du vendredi soir.

**Brand:** pas de fichier logo : la marque est le pictogramme couverts (Font Awesome `fa-utensils`) dans un carré arrondi dégradé accent → ambre, plus le nom « Resto Pilot » en Fraunces 600. On le reprend tel quel, sans le redessiner. · couleurs `--sidebar #16241F` · `--ink #18211F` · `--bg #F4F1EC` · `--accent #D9743F` · `--amber #E8A53D` · `--red #D94A3D` · `--green #2E9E6B` · polices Fraunces (titres) et Inter (interface), à embarquer en local avec le sous-ensemble `latin-ext`.

**Do / Don't:**
- Tout en français. Majuscules écrites à la main, jamais `text-transform`.
- Aucun chiffre, client ou fonction absent de `resto-pilot.html`. Pas de « +X % de CA », pas de témoignage.
- Les données sont fictives : mention discrète « Données de démonstration » sur les plans d'interface (à confirmer).
- Peu de texte à l'écran. Pas de barre de progression, pas de texte en dégradé, pas de noir ou blanc purs, pas d'easing élastique.

**Deliverables:** `resto-pilot-rupture-1920x1080.mp4` (master 4K réduit), environ 50 s, musique libre de droits.
