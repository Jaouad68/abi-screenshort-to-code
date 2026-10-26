# Bibliothèque de prompts RésaZen

Prompts prêts à copier dans Claude (ou un autre assistant) pour développer,
vendre et faire tourner RésaZen. Ils sont adaptés de
[prompts.chat](https://prompts.chat) (dépôt
[f/awesome-chatgpt-prompts](https://github.com/f/awesome-chatgpt-prompts),
licence CC0), traduits en français et réécrits pour des salons de coiffure,
barbiers et instituts de beauté.

Les variables s'écrivent `${nom}` ou `${nom:valeur par défaut}` : remplace-les
avant d'envoyer le prompt.

| Fichier | Usage | Prompt d'origine |
| --- | --- | --- |
| [01-developpement-reservation.md](01-developpement-reservation.md) | Faire évoluer l'appli de réservation | Tattoo Studio Booking Web App Development |
| [02-assistant-support.md](02-assistant-support.md) | Trier et traiter les demandes des gérants | AI Customer Support Specialist |
| [03-reponse-support.md](03-reponse-support.md) | Rédiger une réponse de support | Customer Support Reply Drafter (Empathy + Policy) |
| [04-reponse-reclamation.md](04-reponse-reclamation.md) | Répondre à une réclamation ou un avis négatif | Customer Complaint Reply System |
| [05-faq.md](05-faq.md) | Construire la FAQ à partir des demandes reçues | Customer FAQ Builder |
| [06-landing-page.md](06-landing-page.md) | Écrire la page d'accueil ou une page de campagne | Landing page copywriting |
| [07-emailing.md](07-emailing.md) | Monter une séquence d'e-mails | Email Marketing |
| [08-seo-conseil.md](08-seo-conseil.md) | Poser des questions SEO | SEO specialist |
| [09-seo-contenus-manquants.md](09-seo-contenus-manquants.md) | Trouver les sujets que les concurrents couvrent et pas nous | SEO Content Gap Finder |
| [10-titres-google-ads.md](10-titres-google-ads.md) | Écrire des titres d'annonces Google Ads | Google Ads Title Copywriter |
| [11-prospection-salons.md](11-prospection-salons.md) | Proposer une démo à des salons | Professional Real Estate Appointment Setter |

## Base complète

`source/prompts.csv` contient les 2 992 prompts de prompts.chat, en anglais,
tels que publiés dans le dépôt GitHub le 26 octobre 2026 (2 623 textes,
348 structurés, 21 pour générer des images). Colonnes : `act` (titre),
`prompt` (texte), `for_devs`, `type`, `contributor`. Les prompts sont dans le
domaine public (CC0 1.0, voir `source/LICENSE` et `source/LICENSE-CC0`).

Pour mettre à jour :

```
curl -sSfL -o prompts/source/prompts.csv https://raw.githubusercontent.com/f/awesome-chatgpt-prompts/main/prompts.csv
```
