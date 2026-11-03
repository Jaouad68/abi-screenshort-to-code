# Châteaudun

Site vitrine de la ville de Châteaudun (Eure-et-Loir), en HTML, CSS et JavaScript, sans
build ni backend. Design « starlit violet cosmos » : fond #030014, accent lavande #9382ff,
surfaces séparées par des lueurs internes, titres en graisse 500.

## Sections

- Navigation en pilule flottante, menu repliable sur mobile
- Accueil avec panneau « Châteaudun aujourd'hui » : silhouette du château sur le Loir,
  fil d'infos et calendrier relié à l'agenda
- Démarches (8 services), patrimoine (château, grottes du Foulon, musée, vieille ville,
  bords du Loir), chiffres clés, frise historique
- Agenda filtrable (culture, marchés, sport, famille), actualités, mairie et lettre
  d'information

## À compléter avant mise en ligne

Les contenus sont une maquette : agenda, actualités, téléphone et horaires de la mairie
sont à fournir par les services municipaux. Le formulaire de lettre d'information valide
l'adresse mais ne l'envoie nulle part ; il faut le brancher sur l'outil d'e-mailing de la ville.

## Lancer en local

```bash
cd chateaudun
python3 -m http.server 8080
```

Puis ouvrir http://localhost:8080. Déploiement Vercel : dossier racine `chateaudun`.
