# Appli mobile Copilote démarches

Expo SDK 58, Expo Router, TypeScript. Spécification : [`../SPECS-MVP.md`](../SPECS-MVP.md).

## Écrans livrés

| Écran | Fichier | Stories |
|---|---|---|
| E01 Onboarding (taille du texte, promesse, avertissement) | `src/app/onboarding.tsx` | US01, US03 |
| E02 Connexion par code e-mail | `src/app/connexion.tsx` | US02 |
| E03 Accueil (démarches en cours, 4 tuiles, recherche) | `src/app/index.tsx` | US04 |
| E04 Diagnostic, une question par écran | `src/app/demarche/[slug]/index.tsx` | US05 |
| E05 Résultat : coût, étapes, pièces, lien officiel | `src/app/demarche/[slug]/resultat.tsx` | US05, RG01, RG03 |
| E17 (partiel) Réglages d'affichage et déconnexion | `src/app/reglages.tsx` | US03 |

Retraite, Impôts et Lire un courrier ouvrent un écran « bientôt disponible » avec le lien officiel.

## Lancer

```bash
npm install
npx expo start          # puis Expo Go ou un simulateur
```

Sans fichier `.env`, l'appli démarre en **mode démonstration** : pas de compte, contenu embarqué
(`../content/cni-passeport.v1.json`), rien n'est enregistré. Pour brancher Supabase, copiez
`.env.example` en `.env` et renseignez l'URL et la clé publique du projet.

### Réglages Supabase nécessaires (tableau de bord)

1. Appliquer `../supabase/migrations/0001_init.sql`.
2. Authentication > Email : longueur du code OTP = 6, expiration = 600 secondes.
3. Authentication > Email Templates > Magic Link : afficher le code avec `{{ .Token }}` (sinon l'e-mail contient un lien et pas de code).
4. Insérer le contenu du parcours dans `procedures_catalog` (`slug = 'cni-passeport'`, `version = 1`, `content` = le JSON sans `_meta`, `is_published = true`). Sans cette ligne, l'appli utilise la version embarquée.

## Vérifier

```bash
npm run typecheck
npm run lint
npm test                # évaluateur de parcours, RG04, recherche par mots
```

## Choix techniques

- **Taille du texte** : composant `Texte` (`src/components/ui.tsx`) qui multiplie les tailles par le réglage de l'usager, en plus du réglage système. Les titres grossissent deux fois moins vite pour ne pas couper les mots à 200 %.
- **Typographie française** : `Texte` insère les espaces insécables avant `? ! : ; » % €`.
- **Sites officiels** : ouverts dans le navigateur du système (`Linking.openURL`), jamais dans une WebView (US07).
- **Contenu des parcours** : lu dans `procedures_catalog`, validé par `validateContent`, avec repli sur la version embarquée. Metro voit `../content` grâce à `metro.config.js`.
- **Limite gratuite** : appliquée par le déclencheur SQL ; l'appli traduit l'erreur `LIMITE_GRATUITE_DEMARCHES` en message clair.

## Pas encore fait

- Connexion Apple et Google (US02) : demande `expo-apple-authentication`, les identifiants OAuth et un build de développement.
- Micro intégré à l'accueil : pour l'instant, la dictée passe par le micro du clavier.
- Bouton « Poser une question » sur E05 (arrive avec l'assistant, US14).
- Mode sombre.
