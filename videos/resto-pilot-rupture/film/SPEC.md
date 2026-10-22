# SPEC , Resto Pilot , le saumon ne manquera pas

Source of the story: `../STORYBOARD.md` (approved). Truth source: `../../../resto-pilot.html`.

```text
GOAL:    the restaurant owner leaves relieved: Resto Pilot flagged the salmon on Thursday,
         so Friday night's slate still reads « Pavé de saumon ».
OUTPUT:  HyperFrames, 1920 x 1080, 30 fps
TIME:    50 s x 30 = 1500 frames; 120 BPM, 15 frames per beat, 60 frames per bar.
         Cuts land on beats: 2.0, 3.5, 14.0 (stall), 19.5, 24.5, 29.5, 34.5, 39.0, 43.0.
LOOK:    one medium per world, three worlds:
         - the slate: #1F2B27 board, chalk #EDE6D8 in Caveat 600 (68–96 px), a 28 px oak frame #7A5236,
           chalk dust = 6 % opacity smudges, no gradients except one 12 % vignette baked in the board;
         - the kitchen ticket: printer body #222A27, thermal paper #FBF7EF with a 40 px #F1EADC curl at the
           mouth, ink #18211F in JetBrains Mono 700 at 40 px, the only red is #D94A3D for the salmon block;
           ground #16241F (the app's sidebar green) with a 1.5 % paper-fibre noise;
         - the product: the app's own tokens (#F4F1EC ground, #FBFAF7 cards, 14 px radius,
           Inter 600/500, alert card red rule 8 px), shown at 1.8x real size.
         Brand orange #D9743F → amber #E8A53D only on the mark tile, the « Commander → » button and the lockup.
         Shadows: 0 30px 60px rgba(8,14,12,.45) for objects, 0 18px 40px rgba(24,33,31,.18) for UI.
OBJECTS: the slate in its oak frame with a chalk ledge; a thermal printer seen from above its mouth
         with a red LED; the paper strip with dotted leaders and a zig-zag tear edge; a kitchen scale dial
         (cream face, ink rim 10 px, needle with a hub); a steel ticket rail with spring clips;
         the real alert card; a large black cursor (5 % of frame height).
MOTION:  enter = expo.out / power4.out (0.4–0.6 s); camera = power2.inOut; exit/zoom-through = power3.in;
         print = steps(1) feed, 0.09 s linear head scan per line; chalk = power2.inOut stroke draw;
         needle = power3.out then a closed-form spring of damping 0.7 (two visible overshoots);
         marker = power1.inOut; clip onto rail = back.out(1.4) on position only; no opacity bounce.
         Stagger: printed lines one per beat (15 f); words of the tagline 0.08 s apart.
SHOTS:
  1   f0–60     slate, chalk strike across « Pavé de saumon » left→right (f18–48); « Vendredi, 21 h » held.
  2   f60–105   strike un-draws right→left (f60–78), board desaturates 40 %, « Jeudi 19/06 » rolls in;
                hold-frame f96–105, hard cut on the beat.
  3   f105–165  printer fills 80 % width; LED snaps on f105; mark + « RESTO PILOT » wipe in f108–126;
                push-through into the slot f147–165 (scale 1 → 2.4, power3.in, 12 px vertical blur).
  4   f165–420  ticket world; header prints f180–225, stock lines one per beat from f240:
                bœuf 14 kg OK, pommes de terre 28 kg OK, magret 8,4 kg !, crème fraîche 1,8 kg !.
  5   f420–585  f420 « SAUMON FRAIS … 2,1 KG » prints red; the feed freezes 2 bars (f420–480, silence);
                f480 « VEN. SOIR : +24 % D'AFFLUENCE », f495 « COMMANDER AVANT 16 H »;
                slow push toward the red block f495–585 (scale 1 → 1.18, sine.inOut).
  6   f585–735  focal iris opens from the red « 2,1 KG » (f585–600); scale dial fills 70 % of height;
                needle swings from 0 to 2,1 kg f603–660 and settles; band « VEN. SOIR +24 % » sits far right
                of the needle; f705–735 the band brightens (its arc is the next shot's marker loop).
  7   f735–885  ticket close-up on the salmon block; marker loop draws clockwise f738–768;
                hard stop f810, the ticket tears along the zig-zag f810–822 (rotate −4°, y −20, power3.out);
                carry: the torn piece leaves right f855–885 (x +1100, scale 0.6, power3.in).
  8   f885–1035 steel rail top-down; prep ticket « QUANTITÉS À PRÉPARER » already clipped; the torn piece
                enters from the left and clips f885–903; other prep lines dim to 30 % f915–933;
                cursor enters bottom-right f1005, travels to the salmon line f1005–1035.
  9   f1035–1170 the real alert card at 1.8x; cursor glides to « Commander → » f1035–1062; press f1068
                (button scale 0.96 for 3 f); toast « Action « Commander » lancée » rises f1071–1083;
                clock-wipe f1146–1170 reveals the next world.
  10  f1170–1290 the slate again, intact; « Pavé de saumon » rewritten left→right f1176–1206;
                « Vendredi, 21 h » held; f1272–1290 the board colour floods to #16241F.
  11  f1290–1500 lockup on #16241F: mark tile 132 px lands f1296–1311 (scale 1.12 → 1, power4.out),
                « Resto Pilot » Fraunces 600 104 px wipes in f1305–1323, tagline per word f1335–1360,
                « Données de démonstration » 22 px f1380; held to f1500.
BANNED:  black or navy void; glow, bloom, particles (the LED gets a 6 px soft shadow, nothing else);
         gradients other than the brand tile; three cards in a row; KPI grids; a title over a dimmed
         screenshot; the logo docked in a corner; text moving while read; fade-and-slide-up as an entrance;
         click rings; bounce on UI; pure #000 or #fff; text-transform; any number not in resto-pilot.html;
         any shot implying an order was sent to a supplier.
QA:      f45 strike across the dish · f100 « Jeudi 19/06 » · f125 mark on printer · f400 four stock lines ·
         f470 red salmon line, nothing moving · f650 needle at 2,1 kg · f800 loop around salmon ·
         f925 torn piece clipped on rail · f1100 toast visible · f1250 intact slate · f1450 lockup.
```
