# Relance automatique des devis avec n8n

Workflow n8n prêt à importer : `relance-devis.json`. Chaque jour à 9 h (lundi au samedi),
il relance les clients qui n'ont pas répondu à un devis « Envoyé » :

| Étape | Quand | Client | Artisan |
|-------|-------|--------|---------|
| 1 | J+3 après l'envoi | Email « Avez-vous bien reçu le devis ? » | — |
| 2 | J+7 | Email « Des questions ? On peut ajuster » + SMS | — |
| 3 | J+15 | Email « Dernier rappel, valable jusqu'au… » + SMS | Email « À rappeler » avec le téléphone du client |

La séquence s'arrête d'elle-même dès que le devis passe en **Accepté** ou **Refusé**
dans l'application. Un client sans email ou sans téléphone reçoit seulement ce qui est
possible. Les textes se modifient dans le nœud **Préparer les messages**.

## Fonctionnement

```
Chaque jour à 9h → Configuration → GET /api/n8n/relances (devis dont une étape est due)
  → un item par devis → Préparer les messages → email → SMS (étapes 2-3)
  → alerte artisan (étape 3) → POST /api/n8n/relances/:id (enregistre la relance)
```

L'application reste la source de vérité : elle calcule l'étape due à partir de la date
d'envoi et de la dernière relance (`src/lib/relance.ts`, étapes à J+3, J+7 et J+15).
n8n rédige et envoie les messages. En cas d'échec d'envoi (adresse invalide…), le
workflow continue avec les autres devis et le devis est quand même marqué relancé,
pour ne pas renvoyer le même message chaque jour.

## Installation

### 1. Côté application (Vercel)

- `CRON_SECRET` : secret partagé (déjà utilisé par la route cron). Il protège aussi
  les routes `/api/n8n/relances`.
- `RELANCES_N8N=1` : coupe la relance email intégrée (`/api/cron/relances`) pour que
  le client ne soit pas relancé deux fois.

### 2. Côté n8n

1. **Workflows → Import from File** → `relance-devis.json`.
2. Nœud **Configuration** : renseignez l'URL de l'application, l'expéditeur des emails
   et le nom d'expéditeur SMS (11 caractères max, sans espace).
3. Créez les identifiants (**Credentials**) :
   - **Header Auth « App devis »**. Name : `Authorization`, Value : `Bearer <CRON_SECRET>`.
     À sélectionner dans les nœuds *Devis à relancer* et *Marquer comme relancé*.
   - **Header Auth « Brevo SMS »**. Name : `api-key`, Value : votre clé API Brevo.
     À sélectionner dans *Relance SMS (Brevo)*. Crédit SMS à acheter sur Brevo.
   - **SMTP** : la boîte d'envoi (Gmail, OVH, Brevo SMTP…). À sélectionner dans
     *Relance email* et *Alerter l'artisan*.
4. Testez avec **Execute workflow**, puis activez le workflow.

> Pas de compte SMS ? Désactivez simplement le nœud *Relance SMS (Brevo)* : les
> relances partent alors uniquement par email.

Un SMS de plus de 160 caractères est facturé comme 2 SMS : les textes fournis font
environ 160 caractères, selon la longueur du nom de l'entreprise et du numéro de devis.
