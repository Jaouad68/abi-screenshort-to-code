# Décodeur de courrier : prompt et contrat de sortie

Utilisé par l'Edge Function `decode-letter` (US10). Règles liées : RG08, RG09, RG12.

## Chaîne de traitement

1. **Appareil** : photo (1 à 4 pages) → OCR local → pseudonymisation (RG08). La photo ne quitte jamais le téléphone.
2. **Edge Function** :
   1. vérifie l'utilisateur (JWT) puis appelle `consume_letter_quota(uid)` ; si `false`, réponse `402 LIMITE_GRATUITE_COURRIERS` ;
   2. refuse les textes de moins de 80 ou de plus de 12 000 caractères ;
   3. appelle le modèle avec le prompt système ci-dessous, en sortie JSON contrainte (schéma plus bas) ;
   4. valide le JSON ; en cas d'échec, une seule nouvelle tentative, puis erreur « Nous n'avons pas pu lire ce courrier » ;
   5. **calcule la date limite par le code** (RG09) à partir de `date_limite_brute` ;
   6. si `hors_champ` est vrai : ne stocke rien et renvoie le message de refus ;
   7. sinon, insère dans `decoded_letters` (sans le texte du courrier) et renvoie le résultat.
3. **Journaux** : seulement `user_id`, durée, statut, nombre de caractères. Jamais le texte ni la réponse.

## Prompt système

```text
Tu aides des personnes âgées ou peu à l'aise avec l'administration française à comprendre un courrier qu'elles ont reçu.
Tu reçois le texte d'un courrier, obtenu par reconnaissance de caractères. Il peut contenir des erreurs de lecture.
Certaines données ont été masquées et remplacées par [NIR], [IBAN], [NUMERO], [EMAIL] ou [TEL] : ne cherche jamais à les deviner.

Ta mission :
1. Identifier l'organisme qui écrit (ex. : CAF, caisse de retraite, impôts, mairie, ANTS, France Travail, Assurance maladie).
2. Résumer le courrier en 3 phrases au maximum, en français simple : phrases courtes, pas de sigle sans l'expliquer, pas de jargon.
3. Lister les actions concrètes que la personne doit faire, dans l'ordre, chacune en une phrase qui commence par un verbe.
   S'il n'y a rien à faire, renvoie une liste vide et dis-le dans le résumé.
4. Recopier MOT POUR MOT le passage qui indique une date limite ou un délai, s'il existe. Ne calcule jamais de date toi-même.
5. Recopier la date du courrier telle qu'elle est écrite, si elle figure.

Règles impératives :
- Tu expliques ce que dit le courrier. Tu ne donnes pas de conseil juridique ou fiscal personnalisé, tu ne dis pas si l'administration a raison ou tort.
- Si le courrier évoque un montant à payer, un trop-perçu, une sanction ou une radiation, dis-le clairement et calmement, et ajoute l'action « Si vous n'êtes pas d'accord, vous pouvez contacter l'organisme ou vous faire aider gratuitement dans un espace France Services. »
- Si une information est illisible ou incertaine, dis-le plutôt que de l'inventer.
- Si le texte n'est pas un courrier administratif, ou s'il s'agit d'un document médical (ordonnance, résultat d'analyse, compte rendu médical), mets "hors_champ" à true et laisse les autres champs vides.
- Si le courrier ressemble à une arnaque (demande de paiement par lien, carte cadeau, coordonnées bancaires, urgence anormale), mets "alerte_arnaque" à true et ajoute l'action « Ne payez rien et ne cliquez sur aucun lien avant d'avoir vérifié auprès de l'organisme par son site officiel ou son numéro habituel. »
- Réponds uniquement avec le JSON demandé.
```

## Schéma de sortie du modèle

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["hors_champ", "alerte_arnaque", "organisme", "resume", "actions", "date_courrier_brute", "date_limite_brute", "points_incertains"],
  "properties": {
    "hors_champ":          { "type": "boolean" },
    "alerte_arnaque":      { "type": "boolean" },
    "organisme":           { "type": ["string", "null"], "maxLength": 120 },
    "resume":              { "type": "string", "maxLength": 600 },
    "actions":             { "type": "array", "maxItems": 6, "items": { "type": "string", "maxLength": 200 } },
    "date_courrier_brute": { "type": ["string", "null"], "maxLength": 60 },
    "date_limite_brute":   { "type": ["string", "null"], "maxLength": 300 },
    "points_incertains":   { "type": "array", "maxItems": 3, "items": { "type": "string", "maxLength": 200 } }
  }
}
```

## Calcul de la date limite (code, RG09)

À faire en TypeScript dans l'Edge Function, couvert par des tests unitaires :

| Cas | Exemple de `date_limite_brute` | Résultat |
|---|---|---|
| Date écrite et présente telle quelle dans le texte OCR | « avant le 15 novembre 2026 » | `deadline = 2026-11-15`, `explicite` |
| Délai relatif + date du courrier lisible | « dans un délai de 30 jours à compter de la date du présent courrier » + `date_courrier_brute` = « 2 octobre 2026 » | `deadline = 2026-11-01`, `calculee` |
| Délai en mois | « sous deux mois » | ajout calendaire de mois, `calculee` |
| Délai relatif sans date de départ fiable (« à réception ») | « dans les 15 jours suivant la réception » | `deadline = null`, `incertaine`, afficher « Délai de 15 jours à partir de la réception : notez la date à laquelle vous l'avez reçu » |
| Passage absent du texte OCR (le modèle l'a inventé) | n'importe quoi | ignoré, `aucune` |
| Rien | `null` | `aucune` |

Vérification anti-invention : `date_limite_brute` doit se retrouver dans le texte OCR (comparaison sans accents, espaces ni casse). Sinon elle est ignorée.

## Jeu d'évaluation à constituer avant la bêta

30 courriers réels anonymisés (10 CAF, 10 retraite, 10 impôts), plus 5 hors champ et 3 arnaques. Seuils de mise en production :
- organisme correct ≥ 95 % ;
- date limite correcte ou marquée `incertaine` = 100 % (aucune date fausse affichée comme certaine) ;
- 100 % des courriers médicaux refusés ;
- résumé jugé compréhensible par 3 relecteurs seniors ≥ 90 %.
