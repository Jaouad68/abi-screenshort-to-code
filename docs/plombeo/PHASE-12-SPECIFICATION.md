# PLOMBÉO — Phase 12 : Hors-ligne avancé — Spécification

> Produite selon la méthode §70 (étapes 1 à 10).

Phase : **12 — Résolution des conflits, mode dégradé**
Dépendances : Phase 3
Difficulté : moyenne — **le risque est la perte silencieuse de travail**

---

## 1. Objectif

Faire en sorte que deux appareils, ou un appareil revenu du hors-ligne, ne se marchent jamais dessus sans que l'artisan le sache.

**Critère de réussite global** : aucun texte saisi ne disparaît jamais en silence. Soit il est enregistré, soit l'écran montre les deux versions et demande à l'artisan de trancher.

---

## 2. Le vrai problème, et pourquoi il est plus petit qu'il n'en a l'air

La Phase 3 a livré une file hors-ligne **idempotente** : chaque mutation porte un identifiant généré sur l'appareil, et rejouer la file ne crée pas de doublon. C'est ce qui empêche qu'un aller-retour réseau ajoute deux fois la même heure de travail.

Ce qu'elle ne traite pas : **deux sources qui modifient la même chose**.

### 2.1 La plupart des données ne peuvent PAS entrer en conflit

C'est le constat qui dimensionne toute la phase. La saisie de chantier de la Phase 3 est **en ajout** :

| Donnée | Nature | Conflit possible ? |
|---|---|---|
| Temps passé | Ajout de lignes | **Non** — deux ajouts fusionnent |
| Fournitures posées | Ajout de lignes | **Non** |
| Tâches | Ajout de lignes | **Non** |
| Photos | Ajout de fichiers | **Non** |
| Compte rendu, problème, diagnostic | **Champs texte remplacés** | **Oui** |
| Statut de l'intervention | Machine à états | Traité par la machine |

Ce n'était pas un hasard : le modèle a été conçu en ajout dès la Phase 3, précisément parce que retrofitter la fusion coûte cher. Le conflit se réduit donc à **trois champs texte**.

Construire un mécanisme général de fusion — vecteurs de versions, CRDT — pour trois champs serait exactement la sur-ingénierie que la Phase 8 a appris à éviter.

### 2.2 « Dernier écrit gagne » est la seule option à exclure

Aujourd'hui, `enregistrerCompteRendu` écrit sans regarder. Deux appareils sur la même intervention, et le second **efface le premier sans que personne ne le sache**. Sur un compte rendu rédigé dans un local technique après une heure de travail, c'est la perte la plus coûteuse que l'application puisse infliger.

**Retenu** : **concurrence optimiste**. Le formulaire emporte la date de dernière modification qu'il a lue ; l'écriture n'est appliquée que si elle n'a pas bougé. Sinon, rien n'est écrasé et **les deux versions sont montrées**.

Écarté : le verrouillage. Un artisan hors réseau ne peut ni poser ni libérer un verrou ; un verrou oublié bloquerait le chantier suivant.

### 2.3 Le conflit se résout à l'écran, jamais automatiquement

Fusionner deux textes automatiquement produirait une phrase que personne n'a écrite, sur un document qui peut être remis au client. **Plombéo montre les deux et laisse choisir** : garder le sien, garder l'autre, ou composer à la main à partir des deux.

---

## 3. Mode dégradé du devis

La Phase 0 mentionnait le « mode dégradé pour le devis complexe ». Après examen : **il n'y a rien à livrer**, et c'est un résultat, pas un renoncement.

Un devis suppose le catalogue, les taux de TVA, les compteurs de numérotation atomiques — autant de données serveur. Un devis rédigé hors ligne devrait soit embarquer tout le catalogue, soit accepter des numéros provisoires, ce qui heurte la continuité de numérotation exigée en Phase 4 **[À VÉRIFIER — SOURCE OFFICIELLE]**.

**Retenu** : le devis reste en ligne, et l'interface **le dit quand la connexion manque** au lieu de laisser l'artisan saisir dans le vide. Ce qui compte hors ligne — le temps, les fournitures, les photos, le compte rendu — l'est déjà depuis la Phase 3.

---

## 4. User stories

| # | En tant que | Je veux | Afin de | Priorité |
|---|---|---|---|---|
| US-1 | plombier | ne jamais perdre un compte rendu écrit | ne pas retaper une heure de travail | Doit |
| US-2 | plombier | voir les deux versions en cas de conflit | choisir en connaissance de cause | Doit |
| US-3 | plombier | composer un texte à partir des deux | ne pas avoir à sacrifier l'un | Devrait |
| US-4 | plombier | savoir qu'un écran n'est pas utilisable hors ligne | ne pas saisir dans le vide | Doit |

---

## 5. Tables

**Aucune nouvelle.** `Intervention.updatedAt`, déjà présent, sert de jeton de version.

Ajouter une colonne `version` n'apporterait rien qu'`updatedAt` ne donne déjà, et créerait une seconde source de vérité à maintenir.

---

## 6. Server Actions

`enregistrerCompteRendu` reçoit un champ `vuLe`. Trois issues :

1. `vuLe` correspond → écriture appliquée ;
2. `vuLe` a été dépassé → **rien n'est écrit**, les deux versions sont retournées ;
3. `vuLe` absent → refus explicite, plutôt qu'un retour silencieux au comportement d'avant.

Le troisième point compte : une action qui accepte l'absence du jeton de version rouvrirait la faille au premier appel qui l'oublie.

---

## 7. Tests

| Type | Test |
|---|---|
| Unitaire | Comparaison de versions à la milliseconde |
| **Intégration** | **Une écriture concurrente n'écrase rien et signale le conflit** |
| Intégration | Sans jeton de version, l'écriture est refusée |
| Intégration | Les ajouts (temps, fournitures) ne produisent jamais de conflit |
| Navigateur | Deux onglets : le second voit le conflit et peut composer |

---

## 8. Écarts et état de livraison

**Livré** : concurrence optimiste sur le compte rendu (les trois champs texte), affichage
des deux versions en cas de conflit, refus explicite d'une écriture sans jeton de version.

| Point | État |
|---|---|
| Vérification navigateur à deux onglets | **Non faite** — la session a été interrompue avant. Les tests d'intégration couvrent le mécanisme ; la vérification visuelle reste à passer |
| Mode dégradé du devis | **Rien à livrer**, et c'est un résultat : un devis suppose catalogue, taux et compteurs atomiques. Le rendre disponible hors ligne exigerait des numéros provisoires, ce qui heurte la continuité de numérotation **[À VÉRIFIER — SOURCE OFFICIELLE]**. L'interface signale déjà l'absence de réseau |

## 9. Un test vacueux corrigé

Le test « refuse une écriture sans jeton » passait **avec et sans** la garde : sans elle,
l'écriture tombait dans le chemin « conflit », qui renvoie aussi une erreur. Assertion
resserrée sur le **message** — « rechargez la page » plutôt qu'une comparaison de
versions — ce qui distingue réellement les deux comportements.

---

**Phase 12 livrée côté serveur et interface.** Vérification navigateur à repasser.
