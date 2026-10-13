# Ebook vers livre audio

Convertit un ebook **PDF ou Word (.docx)** en **livre audio** : un MP3 par chapitre et un fichier **M4B avec chapitres**. L'application est pensée pour le français : romans, essais, ebooks littéraires.

* Import PDF/DOCX, nettoyage automatique (numéros de page, en-têtes, pieds de page, notes, césures)
* Détection des chapitres, que vous pouvez corriger (renommer, exclure, fusionner, modifier le texte)
* Choix du moteur, de la voix, de la vitesse, du ton et de la longueur des pauses, avec écoute d'un extrait
* Export MP3 (128 à 256 kbps) et M4B (chapitres, pochette, métadonnées)
* Barre de progression avec temps restant, reprise après coupure, livres de plus de 300 pages
* Utilisable sur l'ordinateur et sur le téléphone (même Wi-Fi), 100 % gratuit

---

## 1. Recommandation : moteur TTS et stack technique

### Comparaison des moteurs de synthèse vocale

Pour un livre de 300 pages, comptez environ **550 000 caractères** et **9 à 10 heures d'audio**.

| Moteur | Coût pour un livre de 300 pages | Qualité en français | Hors ligne | Remarques |
|---|---|---|---|---|
| **Edge TTS** (voix neuronales Microsoft) | **Gratuit** | ★★★★½ très naturel (Henri, Denise, Vivienne, Rémy…) | Non | Pas de compte ni de clé. Service non officiel : il peut changer ou être limité. |
| **Piper** | **Gratuit** | ★★★ correct, un peu monotone | **Oui** | Rapide sur processeur (10 à 30× le temps réel), aucune dépendance externe. |
| XTTS-v2 (Coqui) | Gratuit | ★★★★ très expressif | Oui | Il faut une carte graphique NVIDIA : sur processeur, comptez plusieurs jours par livre. Licence non commerciale. |
| Kokoro | Gratuit | ★★★ (une seule voix française) | Oui | Choix de voix trop limité en français. |
| Google Cloud TTS (Neural2/WaveNet) | Gratuit dans la limite d'environ 1 M caractères/mois, ensuite environ 16 $ par million | ★★★★ | Non | Carte bancaire obligatoire, quota juste suffisant pour un livre par mois. |
| Azure Speech (offre officielle) | Environ 0,5 M caractères/mois gratuits, puis environ 15 $ par million | ★★★★½ (mêmes voix qu'Edge) | Non | Un livre dépasse le quota gratuit. |
| OpenAI TTS | Environ 8 à 15 $ par livre | ★★★★ | Non | Payant dès le premier caractère. |
| ElevenLabs | Environ 50 à 100 $ par livre | ★★★★★ la plus expressive | Non | Le quota gratuit (environ 10 000 caractères/mois) ne couvre que quelques pages. |

*Les tarifs des services payants changent souvent : ce sont des ordres de grandeur à vérifier sur leurs sites.*

**Choix retenu : Edge TTS par défaut, Piper en secours hors ligne.**

* Edge TTS offre de loin la meilleure qualité **gratuite** en français, sans compte ni carte bancaire.
* Piper prend le relais sans Internet, ou si Microsoft modifie son service. Les deux moteurs partagent la même interface (`app/tts/base.py`) : ajouter XTTS plus tard, sur une machine avec GPU, se fait en une seule classe.

### Stack technique

| Besoin | Choix | Pourquoi |
|---|---|---|
| Langage du moteur de traitement | **Python 3.10 à 3.13** | Meilleures bibliothèques PDF et TTS |
| Lecture PDF | **PyMuPDF** | Rapide, donne la position et la taille de chaque ligne (nécessaire pour retirer en-têtes, pieds de page et notes), lit les signets |
| Lecture Word | **python-docx** | Styles de titres, exposants ; en-têtes et notes sont stockés à part dans le fichier |
| Audio | **FFmpeg** (fourni par `imageio-ffmpeg`) | Normalisation du volume, MP3 (LAME), AAC, M4B avec chapitres. Rien à installer à la main |
| Serveur | **FastAPI + Uvicorn** | API asynchrone, idéale pour paralléliser les appels à Edge TTS |
| Interface | **HTML/CSS/JS sans framework, en PWA** | Aucune compilation, fonctionne sur ordinateur et téléphone |

### Les trois plateformes avec un seul code

* **Bureau (Windows/macOS/Linux)** : `Lancer.bat` ouvre l'application dans une fenêtre sans barre d'onglets (mode « application » d'Edge ou de Chrome).
* **Web** : la même interface dans n'importe quel navigateur.
* **Mobile** : `Lancer-telephone.bat` rend l'application accessible au téléphone sur le même Wi-Fi. Vous scannez un QR code, puis « Ajouter à l'écran d'accueil ». **Le PC fait la conversion**, le téléphone sert de télécommande et télécharge les fichiers. Une conversion entièrement sur le téléphone donnerait une qualité bien inférieure et prendrait des heures de batterie.

---

## 2. Architecture

```
┌────────────── Téléphone / navigateur / fenêtre bureau ──────────────┐
│  static/  index.html · app.js · style.css · sw.js (PWA)             │
└───────────────────────────────┬──────────────────────────────────────┘
                                │ HTTP (jeton secret si accès réseau)
┌───────────────────────────────▼──────────────────────────────────────┐
│ app/server.py   API FastAPI : livres, chapitres, voix, conversions   │
├──────────────────────────────────────────────────────────────────────┤
│ IMPORT (une fois par livre)                                          │
│  pdf_extract.py / docx_extract.py → blocs (titre, paragraphe, scène)  │
│  cleaning.py   → ligatures, césures, lignes de sommaire              │
│  chapters.py   → chapitres (styles, signets, « Chapitre 3 »…)        │
│  library.py    → data/books/<id>/book.json (modifiable dans l'UI)    │
├──────────────────────────────────────────────────────────────────────┤
│ CONVERSION (jobs.py, une tâche à la fois, en arrière-plan)           │
│  segment.py + normalize.py → segments de texte « parlé » + pauses     │
│  tts/edge.py | tts/piper_engine.py → 1 fichier audio par segment     │
│        (cache disque, 3 requêtes en parallèle, 5 essais par segment)  │
│  audio.py  → chapitre WAV (silences) → loudnorm → MP3 + AAC           │
│           → M4B (concaténation sans réencodage + chapitres + pochette)│
└──────────────────────────────────────────────────────────────────────┘
```

**Robustesse sur les gros livres**

* Tout est traité **segment par segment** (un paragraphe, ou un morceau de 1 500 caractères au plus). La mémoire reste constante, que le livre fasse 50 ou 1 000 pages.
* Chaque segment est **mis en cache** sur disque. Si le PC s'éteint ou si Internet coupe, « Reprendre » repart exactement où la conversion s'était arrêtée. Les chapitres déjà encodés ne sont pas refaits.
* Au bout de 5 échecs sur le même segment (attente de 2, 4, 8 puis 16 s entre deux essais), la tâche passe en « Erreur » et reste reprenable.
* Le texte est **figé** au lancement : modifier le livre pendant une conversion ne la perturbe pas.

**Prononciation naturelle** (`normalize.py`, `segment.py`)

* Abréviations : « M. » → Monsieur, « Mme » → Madame, « Dr », « St- », « etc. », « c.-à-d. », « n° »…
* Nombres : « XIXe siècle » → dix-neuvième siècle, « Louis XIV » → Louis quatorze, « François Ier » → François premier, « 1er » → premier, « 14h30 » → 14 heures 30.
* Dialogues : le tiret de dialogue n'est pas lu, les incises « , dit-il, » deviennent des pauses, et les répliques s'enchaînent un peu plus vite que la narration.
* Pauses maîtrisées : après le titre (1,4 s), entre paragraphes (0,65 s), entre répliques (0,45 s), au changement de scène « * * * » (1,8 s), en fin de chapitre (2,5 s). Le réglage « Pauses » les multiplie par 0,7 ou 1,35.
* Volume homogène entre chapitres : normalisation à -18 LUFS, la norme des livres audio.

**Qualité audio** : MP3 LAME et AAC à 128 kbps minimum (jusqu'à 256), 44,1 kHz, mono. Le mono est la norme pour la voix seule : à débit égal, il donne une meilleure qualité que la stéréo. Les voix Edge sont produites en 24 kHz et Piper en 22 kHz : un débit plus élevé n'apportera donc pas de gain audible au-delà de 128 kbps.

### Fichiers

| Fichier | Rôle |
|---|---|
| `run.py` | Lanceur : `--app` (fenêtre), `--lan` (téléphone), `--port` |
| `app/config.py` | Chemins et réglages (surchargeables par variables `AUDIOBOOK_*`) |
| `app/models.py` | Structures de données : `Block`, `Chapter`, `Book` |
| `app/pdf_extract.py` | PDF : lignes, en-têtes et pieds de page, notes, titres, paragraphes, lettrines, signets |
| `app/docx_extract.py` | Word : styles de titre, exposants, pochette |
| `app/cleaning.py` | Nettoyage commun : caractères, césures (arbitrées avec le vocabulaire du livre), sommaire |
| `app/chapters.py` | Détection et découpage des chapitres, exclusion des mentions légales |
| `app/normalize.py` | Réécriture du texte pour la lecture à voix haute |
| `app/segment.py` | Découpage en segments TTS et calcul des pauses |
| `app/tts/` | Moteurs : interface commune, Edge TTS, Piper, préréglages de ton |
| `app/audio.py` | FFmpeg : assemblage, normalisation, MP3/AAC, M4B |
| `app/jobs.py` | File de conversions, progression, temps restant, reprise |
| `app/library.py` | Stockage des livres importés |
| `app/server.py` | API REST, sécurité réseau, service de l'interface |
| `app/netinfo.py` | Adresse IP locale et QR code |
| `static/` | Interface web/PWA |
| `scripts/download_voices.py` | Téléchargement des voix Piper françaises |
| `tests/` | Tests automatiques (extraction, normalisation, conversion complète, API) |

---

## 3. Installation et lancement (Windows, pas à pas)

### Étape 1 : installer Python (une seule fois)

1. Téléchargez **Python 3.12** sur <https://www.python.org/downloads/windows/> (« Windows installer (64-bit) »).
2. Lancez l'installateur et **cochez « Add python.exe to PATH »**, puis « Install Now ».

FFmpeg n'est pas à installer : il est fourni automatiquement.

### Étape 2 : récupérer l'application

Copiez le dossier `ebook-audiobook` où vous voulez, par exemple `C:\LivresAudio\ebook-audiobook`.
(Avec Git : `git clone` du dépôt, puis ouvrez le sous-dossier `ebook-audiobook`.)

### Étape 3 : installer

Double-cliquez sur **`Installer.bat`**. En 3 à 5 minutes, il :

* crée un environnement Python isolé (`.venv`), sans toucher au reste de votre PC ;
* installe les dépendances ;
* télécharge 3 voix Piper françaises pour le mode hors ligne (environ 180 Mo).

Si Windows affiche « Windows a protégé votre ordinateur », cliquez sur « Informations complémentaires », puis « Exécuter quand même ».

### Étape 4 : lancer

* **`Lancer.bat`** : l'application s'ouvre dans sa propre fenêtre.
* **`Lancer-telephone.bat`** : idem, et elle devient accessible au téléphone. Au premier lancement, Windows demande l'autorisation du pare-feu : acceptez pour les **réseaux privés**.

La fenêtre noire (console) doit rester ouverte : la fermer arrête l'application.

### Étape 5 : convertir un livre

1. Glissez votre PDF ou DOCX dans la zone « Importer un ebook ».
2. Vérifiez les chapitres : décochez ce qui ne doit pas être lu, renommez, fusionnez, ou corrigez un passage avec l'icône crayon.
3. Choisissez la voix (essayez **Henri** ou **Denise** en premier), la vitesse et le ton, puis cliquez sur « Écouter un extrait ».
4. Cliquez sur « Lancer la conversion ». Pour un livre de 300 pages avec Edge TTS, comptez environ 30 à 60 minutes selon votre connexion.
5. Téléchargez le **M4B** (pour Apple Livres, Smart AudioBook Player, BookPlayer, VLC…) ou le **ZIP des MP3**.

Les fichiers sont aussi dans `data\jobs\<identifiant>\output\`.

### Sur le téléphone

1. Lancez `Lancer-telephone.bat` sur le PC.
2. Dans l'application, cliquez sur **« Sur le téléphone »** et scannez le QR code.
3. Dans le navigateur du téléphone, choisissez « Ajouter à l'écran d'accueil » (Chrome sur Android, Safari sur iPhone).

Le lien contient une clé secrète, mémorisée par le téléphone : vous ne scannerez le QR code qu'une fois. Pour révoquer l'accès, supprimez `data\lan_token.txt`.

> Astuce : pour utiliser l'application hors de chez vous, installez **Tailscale** (gratuit) sur le PC et le téléphone, puis utilisez l'adresse Tailscale du PC.

### Sans ordinateur : conversion par GitHub Actions (gratuite)

Tout se fait depuis le téléphone, avec votre compte GitHub :

1. Déposez le livre (PDF ou DOCX) dans le dossier `a-convertir/` de la branche `claude/ebook-to-audiobook-gypowe` :
   <https://github.com/Jaouad68/abi-screenshort-to-code/upload/claude/ebook-to-audiobook-gypowe/a-convertir>
2. La conversion démarre seule. Suivi dans l'onglet **Actions** (« Ebook vers livre audio, conversion »). Comptez environ 30 à 60 minutes pour 300 pages.
3. Le livre audio est publié dans l'onglet **Releases** : le fichier **.m4b** se télécharge directement, et le **ZIP** contient un MP3 par chapitre.

Les réglages (voix, vitesse, ton, pauses, débit, formats) sont dans `a-convertir/reglages.txt`, modifiable depuis GitHub (icône crayon).

À savoir :

* le plan gratuit de GitHub offre 2 000 minutes de calcul par mois pour un dépôt privé, soit plusieurs dizaines de livres ;
* il n'y a pas d'étape de vérification des chapitres : les sommaires et mentions légales sont exclus automatiquement, et le journal de l'exécution liste les chapitres convertis ;
* en cas de coupure du service Microsoft, la conversion reprend automatiquement jusqu'à 3 fois.

Une image Docker (`Dockerfile`) est aussi fournie pour héberger l'application complète, avec son interface, chez n'importe quel hébergeur Docker.

### macOS / Linux

```bash
cd ebook-audiobook
./start.sh          # ordinateur seul
./start.sh --lan    # accessible au téléphone
```

### Lancer les tests (facultatif)

```bash
.venv\Scripts\python -m pip install -r requirements-dev.txt
.venv\Scripts\python -m pytest
```

---

## Dépannage

| Problème | Solution |
|---|---|
| « Ce PDF ne contient presque pas de texte » | Le PDF est un scan (images). Passez-le dans un logiciel d'OCR (par exemple OCRmyPDF), puis réimportez-le. |
| Erreurs répétées avec Edge TTS | Vérifiez Internet, puis mettez à jour : `.venv\Scripts\python -m pip install -U edge-tts`. Sinon, choisissez Piper et cliquez sur « Reprendre ». |
| Piper grisé dans la liste | Lancez `.venv\Scripts\python scripts\download_voices.py`. |
| Le téléphone n'ouvre pas la page | Même Wi-Fi ? Pare-feu autorisé pour les réseaux privés ? Le Wi-Fi « invité » isole souvent les appareils. |
| Un chapitre mal découpé | Icône de fusion (flèche) pour le rattacher au précédent, ou crayon pour corriger le texte. |
| Un en-tête ou un numéro est encore lu | Corrigez le passage avec le crayon avant de lancer la conversion. |

Variables d'environnement utiles : `AUDIOBOOK_EDGE_CONCURRENCY` (requêtes parallèles, 3 par défaut), `AUDIOBOOK_EDGE_PROXY`, `AUDIOBOOK_LUFS` (-18 par défaut), `AUDIOBOOK_DATA_DIR`.

## Limites connues

* Les PDF scannés demandent une OCR préalable.
* La mise en page PDF sur plusieurs colonnes (magazines) n'est pas gérée : l'application vise les livres.
* Edge TTS est un service non officiel de Microsoft : il peut évoluer sans préavis. Piper reste disponible hors ligne.
* Sur le téléphone, l'accès se fait en HTTP local : l'icône d'écran d'accueil fonctionne, mais le mode PWA complet (cache hors ligne) n'est actif que sur l'ordinateur (localhost) ou en HTTPS (par exemple via Tailscale).
* Usage personnel : respectez les droits d'auteur des livres que vous convertissez.
