/**
 * Diagnostic des refus d'envoi Resend, pour afficher une consigne exploitable
 * plutôt qu'un « échec » générique. Module pur (sans "server-only") : testable.
 */
export const RAISONS_ECHEC = [
  "cle",
  "domaine",
  "test",
  "expediteur",
  "destinataire",
  "quota",
  "reseau",
  "autre",
] as const;

export type RaisonEchec = (typeof RAISONS_ECHEC)[number];

export function estRaisonEchec(v: unknown): v is RaisonEchec {
  return typeof v === "string" && (RAISONS_ECHEC as readonly string[]).includes(v);
}

/** Classe une réponse d'erreur de l'API Resend (statut HTTP + corps brut). */
export function diagnostiquerResend(status: number, corps: string): RaisonEchec {
  let nom = "";
  let message = corps;
  try {
    const json = JSON.parse(corps) as { name?: unknown; message?: unknown };
    if (typeof json.name === "string") nom = json.name;
    if (typeof json.message === "string") message = json.message;
  } catch {
    // Corps non JSON : on analyse le texte brut.
  }
  const texte = `${nom} ${message}`.toLowerCase();

  if (texte.includes("testing emails") || texte.includes("your own email")) return "test";
  if (texte.includes("not verified") || texte.includes("verify a domain")) return "domaine";
  if (/(invalid|missing|restricted)_api_key/.test(texte) || texte.includes("api key")) return "cle";
  if (texte.includes("invalid_from_address") || texte.includes("`from`")) return "expediteur";
  if (texte.includes("`to`") || texte.includes("invalid_to")) return "destinataire";
  if (status === 429 || texte.includes("quota") || texte.includes("rate_limit")) return "quota";
  if (status === 401) return "cle";
  return "autre";
}

/** Retire espaces et guillemets parasites d'une variable d'environnement collée. */
export function nettoyerVariable(valeur: string | undefined): string | undefined {
  const v = valeur?.trim().replace(/^(["'])(.*)\1$/, "$2").trim();
  return v || undefined;
}

/** Consigne affichée à l'utilisateur pour chaque cause d'échec. */
export const MESSAGES_ECHEC: Record<RaisonEchec, string> = {
  cle:
    "Clé Resend refusée : vérifiez RESEND_API_KEY dans Vercel (Settings → Environment Variables), sans guillemets ni espace, puis redéployez.",
  domaine:
    "Le domaine de l'adresse d'expédition (EMAIL_FROM) n'est pas vérifié chez Resend. Vérifiez-le sur resend.com/domains (enregistrements DNS), ou utilisez une adresse d'un domaine déjà vérifié.",
  test:
    "Compte Resend en mode test : sans domaine vérifié, Resend n'envoie qu'à l'adresse du titulaire du compte. Vérifiez votre domaine sur resend.com/domains puis mettez à jour EMAIL_FROM.",
  expediteur:
    "Adresse d'expédition invalide : EMAIL_FROM doit être de la forme « MELLADO Électricité <devis@votre-domaine.fr> ».",
  destinataire: "L'adresse email du client est invalide. Corrigez-la dans sa fiche.",
  quota: "Quota d'envoi Resend atteint. Réessayez plus tard ou passez à une offre supérieure.",
  reseau: "Le service d'email est injoignable. Réessayez dans quelques instants.",
  autre: "L'envoi de l'email a échoué (détail dans les journaux Vercel). Réessayez.",
};
