# Faire vivre le site — guide d'administration

## En bref

- Les **textes, articles, événements, fiches et documents** sont dans `content/` (fichiers Markdown et `site.json`).
- On les modifie **sans toucher au code** depuis l'espace d'administration `/admin/` (Decap CMS, gratuit et libre).
- Chaque modification est enregistrée dans le dépôt GitHub : historique complet, retour arrière possible, sauvegarde automatique.
- Le site public est **statique** : aucune base de données, aucun compte visiteur, rien à mettre à jour côté serveur.

## Tâches courantes (depuis `/admin/`)

| Je veux… | Collection | À savoir |
|---|---|---|
| Publier un événement | *Événements et commémorations* → Nouveau | Date, lieu, heure de début obligatoires. Mettre le statut sur « Validé et publié ». Il passe tout seul dans « Événements passés » après la date. |
| Écrire un article | *Articles d'histoire locale* | Au moins une source, sinon l'article reste hors ligne. Dans le texte, `[[1]]` renvoie à la 1re source. Choisir « Fait local » uniquement si une source établit le lien avec Châteaudun. |
| Ajouter une photographie | *Archives et photographies* | Date (préciser si estimée), lieu (« Non précisé » si inconnu), provenance, droits, lien vers la notice d'origine et description pour les personnes aveugles : tous obligatoires. |
| Créer une fiche de combattant | *Fiches de combattants* | Le lien avec Châteaudun et au moins une référence sont obligatoires. N'écrire que ce que les documents établissent. |
| Modifier un texte de page | *Textes des pages* | Accueil, projet, guide de recherche, pages légales. |
| Renseigner l'identité, le contact, le formulaire | *Réglages et identité* | Cocher « Identité confirmée » seulement après vérification des statuts. Les rubriques Contact et Participer apparaissent dès qu'elles sont renseignées. |

**Brouillons** : le mode « flux éditorial » est activé. Un contenu passe par *Brouillon → En relecture → Prêt* ; il n'est publié qu'au clic sur « Publier ». Un statut « Brouillon » dans le contenu le garde aussi hors ligne.

**Contributions des visiteurs** : il n'existe aucun dépôt direct sur le site. Les propositions arrivent par le formulaire ou par courriel ; un membre les vérifie, puis les saisit dans l'administration. Rien n'est publié sans cette relecture.

## Sauvegarde et export

- Le dépôt GitHub est la sauvegarde principale (historique de chaque version).
- `npm run export` produit `export/sauvegarde-AAAA-MM-JJ/` : un fichier `contenus.json` lisible par un tableur ou un autre outil, et une copie du dossier `content/` avec les images d'origine.

## Mise en service (à faire une fois)

1. **Choisir l'hébergement.** Le site actuel est servi par la plateforme ChatGPT (`…chatgpt.site`). Je n'ai pas d'accès à cette plateforme : si elle permet de déposer un dossier de fichiers statiques, il suffit d'y publier le contenu de `dist/`. Sinon, un hébergeur statique gratuit convient (Netlify, Cloudflare Pages ; GitHub Pages si le dépôt est public). L'ancienne adresse peut alors renvoyer vers la nouvelle.
2. **Brancher l'authentification de l'administration.** Decap CMS se connecte avec un compte GitHub.
   - Sur Netlify : activer le fournisseur OAuth GitHub dans les réglages du site (gratuit).
   - Ailleurs : déployer un petit service OAuth (par exemple sur Cloudflare Workers, offre gratuite) et renseigner son adresse dans `static/admin/config.yml` (`base_url`).
   - Donner un accès en écriture au dépôt uniquement aux personnes autorisées. **GitHub vérifie ces droits côté serveur** : sans accès, aucune modification n'est possible, même en connaissant l'adresse `/admin/`.
   - Remplacer `branch:` par la branche de production dans `static/admin/config.yml`.
3. **Régénérer le site à chaque modification.** Brancher l'hébergeur sur le dépôt avec la commande `cd memoire-dunoise && npm ci && npm run build` et le dossier de publication `memoire-dunoise/dist`. La vérification automatique (`.github/workflows/memoire-dunoise.yml`) teste déjà chaque modification.
4. **Formulaire de contact** (facultatif) : créer un formulaire chez un service de réception (Formspree, Web3Forms, Basin…), puis coller son adresse de réception dans *Réglages → Contact → Formulaire* et cocher « Activer ». La page Confidentialité se met à jour automatiquement. Le formulaire comprend un champ piège, un délai minimal et une limite d'un envoi par minute ; le filtrage antispam du service complète ces protections.
5. Passer `previsualisation` à `false` dans les réglages pour retirer le bandeau.

## Limites et coûts

- **Aucun coût obligatoire** : générateur, administration, polices et hébergement statique ont des offres gratuites suffisantes pour un site associatif.
- **Formulaire** : les services de réception ont une offre gratuite limitée en nombre de messages par mois. Vérifier le tarif en vigueur avant d'en choisir un ; rien n'a été souscrit.
- **Nom de domaine propre** (facultatif) : quelques euros à une vingtaine d'euros par an selon l'extension et le registraire.
- Les personnes qui administrent le site ont besoin d'un **compte GitHub** (gratuit).
- Pas de paiement en ligne, de newsletter ni de statistiques : à ajouter seulement sur décision de l'association, après information sur les coûts et les obligations (consentement pour les traceurs, éligibilité au reçu fiscal pour les dons).

## Commandes utiles (pour la personne technique)

```bash
cd memoire-dunoise
npm ci                 # installer
npm run build          # générer dist/ (affiche les contenus refusés et les informations à fournir)
npm run serve          # voir le site sur http://localhost:4173/
npm test               # tests du générateur et du formulaire
npm run test:e2e       # parcours dans Chromium (petit écran, clavier, formulaire)
npm run export         # sauvegarde des contenus
```
