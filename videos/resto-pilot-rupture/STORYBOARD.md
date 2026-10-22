# Storyboard , Resto Pilot , le saumon ne manquera pas

Theme: 012 Thermal Receipt (« Ticket de cuisine ») · Format: 1920x1080 · Length: 50 s · Sound: music

## Message & tone
- **Sentence:** I want to say "Resto Pilot vous prévient avant qu'un plat manque en plein service" in a trustworthy tone, so the viewer feels relieved, like a chef who knows the walk-in is covered.
- **Tone arc:** urgent → mysterious → bold → technical → trustworthy → warm
- accent: red
- **Motif:** l'ardoise du bistrot ouvre le film avec « Pavé de saumon » rayé à la craie, et revient à la fin, intacte (même cadre, même craie, sans le trait).

## Ledger

| # | start | dur | beat | tone | entrance | transition_out | ease | direction | palette | camera | components | new_component | sfx | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0:00 | 2.0 | hook | urgent | motif:chalk-write | freeze-rewind-scrub | power2.inOut | left-to-right | slate+chalk | locked | ardoise | | chalk-scratch | la craie raye « Pavé de saumon » ; seul texte : « Vendredi, 21 h » |
| 2 | 0:02 | 1.5 | hook | mysterious | scrub-back | beat-cut-hold | power2.in | right-to-left | slate+chalk | locked | ardoise, clock-numerals | | tape-rewind | surprise: the strike-through un-draws backwards and the clock spins to « Jeudi 19/06 » |
| 3 | 0:03.5 | 2.0 | reveal | bold | print-header | push-through | expo.out | center | green+orange | push-in | printer, brand-mark | | printer-wake | reveal on the drop: the printer LED wakes, the Resto Pilot mark sits on the printer lid |
| 4 | 0:05.5 | 8.5 | proof | technical | print-head-scan | motif:cut | steps(1) | top-down | paper+ink+green | locked | ticket-strip, stock-lines | | printer-feed | one line per 16th note: bœuf OK, pommes de terre OK, magret !, crème ! |
| 5 | 0:14 | 5.5 | proof | technical | feed-stall | focal-iris | power4.out | hold | paper+red | slow-push-in | ticket-strip, saumon-line | | silence | surprise: the feed freezes for one full bar on SAUMON FRAIS 2,1 KG printed in red, music cuts to silence |
| 6 | 0:19.5 | 5.0 | proof | technical | needle-swing | match-cut-shape | power3.out | radial | ink+paper+red | macro | kitchen-scale-gauge | balance-jauge | needle-tick | the iris opens from the red « 2,1 KG » onto a kitchen scale; the needle settles short of the band « VEN. SOIR +24 % » |
| 7 | 0:24.5 | 5.0 | proof | trustworthy | marker-draw | object-carry | power1.inOut | clockwise | paper+red+ink | locked | ticket-strip, marker-loop | | marker-squeak | the red arc of the gauge becomes the marker loop around the saumon block; surprise: hard stop, the ticket tears off along its zig-zag edge |
| 8 | 0:29.5 | 5.0 | proof | trustworthy | pin-drop | cursor-carry | back.out(1.4) | from-right | paper+ink+green | top-down | ticket-rail, prep-line | rail-a-bons | rail-clip | the torn ticket is clipped onto the kitchen rail next to the prep list; only « SAUMON FRAIS · 9 KG À COMMANDER » stays lit |
| 9 | 0:34.5 | 4.5 | proof | trustworthy | cursor-press | time-lapse-tick | power2.out | center | green+orange+paper | locked | commander-button, toast | | confirm-ding | the human decides: the cursor presses « Commander → », toast « Action « Commander » lancée » |
| 10 | 0:39 | 4.0 | cta | warm | motif:chalk-write | graphic-match-color | sine.inOut | left-to-right | slate+chalk | slow-push-in | ardoise | | room-tone | surprise: the clock ticks to « Vendredi, 21 h » and the same ardoise is back, « Pavé de saumon » unbroken |
| 11 | 0:43 | 7.0 | cta | warm | type-set | | power3.inOut | center | green+chalk+orange | locked | brand-mark, lockup | | warm-chord | lockup: mark + « Resto Pilot » + « Le copilote IA de votre restaurant. » + « Données de démonstration » |

## The seven questions (answer before you build)
1. **Message and tone:** la phrase ci-dessus. La douleur est urgente, la preuve est fiable, la fin est chaleureuse.
2. **Repetition:** l'ardoise et l'écriture à la craie sont un motif voulu (2 apparitions, la seconde intacte). Le reste est vérifié par l'audit.
3. **Meaning of each transition:**
   - 1→2 *freeze & rewind* : « et si on revenait la veille ? »
   - 2→3 *beat cut with hold* : le temps s'arrête, le produit arrive sur le temps fort.
   - 3→4 *push-through* : on entre dans l'imprimante, donc dans le produit.
   - 4→5 *cut* : coupe sèche, le flux continue jusqu'à la ligne qui cloche.
   - 5→6 *focal iris* : on ouvre depuis le « 2,1 KG », c'est lui la cause.
   - 6→7 *match cut shape* : l'arc rouge de la jauge devient le cercle au feutre, même idée, nouveau sens.
   - 7→8 *object carry* : le ticket arraché va sur le rail, l'alerte devient un bon.
   - 8→9 *cursor carry* : le curseur passe de la ligne « 9 kg » au bouton, cause et effet.
   - 9→10 *time-lapse tick* : jeudi devient vendredi soir.
   - 10→11 *graphic match colour* : le vert de l'ardoise devient le vert de la marque.
4. **Colours over time:** vert ardoise et papier crème partout ; le rouge n'existe pas avant 0:14, puis il ne marque que le saumon (plans 5 à 7) ; l'orange de la marque n'arrive qu'au réveil de l'imprimante et revient sur « Commander » et la signature.
5. **New components:** *balance-jauge* (plan 6) et *rail-à-bons* (plan 8).
6. **Surprises:** 0:02 (rembobinage), 0:14 (silence, impression figée), 0:24.5 (le ticket s'arrache), 0:39 (retour de l'ardoise intacte).
7. **Last films:** aucun historique, c'est le premier film enregistré.

## Frames

### Plan 1 · Accroche, vendredi 21 h (0:00, 2 s)
- key visual : l'ardoise du bistrot en plein service ; la craie raye « Pavé de saumon ».
- moves first : le trait de craie, de gauche à droite.
- on-screen words : « Vendredi, 21 h ».
- beat hook : le trait finit sur le premier temps fort.

### Plan 2 · Rembobinage (0:02, 1,5 s)
- key visual : le trait se défait à l'envers, l'heure tourne jusqu'à « Jeudi 19/06 ».
- moves first : le trait, de droite à gauche.
- on-screen words : « Jeudi 19/06 ».

### Plan 3 · Arrivée de la marque (0:03.5, 2 s)
- key visual : l'imprimante à tickets s'allume, l'icône Resto Pilot sur le capot.
- moves first : la diode rouge, puis la poussée caméra dans la fente.
- on-screen words : « Resto Pilot ».

### Plan 4 · Le contrôle des stocks s'imprime (0:05.5, 8,5 s)
- key visual : le ticket sort ligne par ligne : « CONTRÔLE DES STOCKS · LA TABLE D'OLIVIER · JEU. 19/06 », bœuf haché 14 kg OK, pommes de terre 28 kg OK, magret 8,4 kg !, crème fraîche 1,8 kg !.
- moves first : la tête d'impression, de gauche à droite, une ligne par double croche.

### Plan 5 · Preuve, la ligne rouge (0:14, 5,5 s)
- key visual : « SAUMON FRAIS 2,1 KG » s'imprime en rouge ; le papier s'arrête une mesure entière ; puis « VEN. SOIR : +24 % D'AFFLUENCE » et « COMMANDER AVANT 16 H ».
- moves first : rien, c'est l'arrêt qui est le mouvement ; la musique coupe.

### Plan 6 · Preuve, la balance-jauge (0:19.5, 5 s)
- key visual : une balance de cuisine vue de face ; l'aiguille oscille puis s'arrête sur 2,1 kg, loin de la bande rouge « VEN. SOIR +24 % ».
- new component : **balance-jauge**. Verbe : *prévenir*. Métaphore : la balance de la cuisine. Primitive : une jauge. Twist : la bande rouge est la prévision d'affluence, pas un poids. Vérité : Resto Pilot compare bien le stock (2,1 kg) à la prévision (+24 %), et la jauge n'affiche aucun autre chiffre.
- moves first : l'aiguille, en arc, `power3.out` avec deux petites oscillations.

### Plan 7 · Preuve, le gérant entoure (0:24.5, 5 s)
- key visual : retour au ticket ; un trait de feutre rouge entoure le bloc saumon ; le ticket s'arrache sur son bord en dents de scie.
- moves first : le feutre, dans le sens des aiguilles d'une montre.

### Plan 8 · Le rail à bons (0:29.5, 5 s)
- key visual : vue de dessus du rail de la cuisine ; le ticket arraché est pincé à côté de la liste de préparation ; seule la ligne « SAUMON FRAIS · 9 KG À COMMANDER · RUPTURE PRÉVUE » reste allumée.
- new component : **rail-à-bons**, la liste de préparation réelle présentée comme des bons pincés au rail.
- moves first : le ticket qui glisse depuis la droite et se pince.

### Plan 9 · Le gérant décide (0:34.5, 4,5 s)
- key visual : le bouton orange « Commander → » de l'alerte, le curseur appuie, le message « Action « Commander » lancée » apparaît.
- moves first : le curseur, puis le message.
- règle d'honnêteté : rien ne montre une commande partie chez un fournisseur.

### Plan 10 · Vendredi 21 h, bis (0:39, 4 s)
- key visual : la même ardoise qu'au plan 1, « Pavé de saumon » écrit et intact.
- on-screen words : « Vendredi, 21 h ».

### Plan 11 · Signature (0:43, 7 s)
- key visual : l'icône couverts dans son carré, « Resto Pilot », « Le copilote IA de votre restaurant. »
- on-screen words : 7 mots, plus la mention « Données de démonstration ».
- loop note : pas de boucle.
