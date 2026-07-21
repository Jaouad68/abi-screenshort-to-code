import {
  documentNonReconnuSchema,
  factureExtraiteSchema,
  type FactureExtraite,
} from "./schema";

/**
 * Pipeline d'extraction de facture par vision. Le LLM n'entre jamais en
 * base directement : sa réponse est nettoyée, parsée en JSON, puis validée
 * par le schéma Zod. En cas d'échec, une seule relance est tentée avec un
 * message de correction ; au-delà, on bascule en saisie manuelle — jamais
 * de crash, jamais de donnée corrompue.
 */

export type ReponseExtraction =
  | { type: "facture"; donnees: FactureExtraite }
  | { type: "document_non_reconnu" };

export interface EchecParsing {
  type: "echec";
  messageCorrection: string;
}

export type ResultatParsing = ReponseExtraction | EchecParsing;

/**
 * Retire les balises de code markdown (```json ... ``` ou ``` ... ```)
 * que le modèle ajoute parfois malgré la consigne de ne pas en mettre.
 * Simple nettoyage défensif, pas une tentative de correction.
 */
function retirerBalisesCode(texte: string): string {
  const nettoye = texte.trim();
  const correspondance = nettoye.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return correspondance ? correspondance[1]!.trim() : nettoye;
}

function construireMessageCorrection(details: string): string {
  return (
    "Ta réponse précédente n'a pas pu être traitée : " +
    details +
    " Retourne UNIQUEMENT l'objet JSON demandé, sans préambule, sans " +
    "commentaire, sans balises de code."
  );
}

export function parserReponseExtraction(texteBrut: string): ResultatParsing {
  const nettoye = retirerBalisesCode(texteBrut);

  let json: unknown;
  try {
    json = JSON.parse(nettoye);
  } catch (erreur) {
    return {
      type: "echec",
      messageCorrection: construireMessageCorrection(
        `le texte reçu n'est pas un JSON valide (${(erreur as Error).message}).`,
      ),
    };
  }

  const resultatErreur = documentNonReconnuSchema.safeParse(json);
  if (resultatErreur.success) {
    return { type: "document_non_reconnu" };
  }

  const resultat = factureExtraiteSchema.safeParse(json);
  if (!resultat.success) {
    return {
      type: "echec",
      messageCorrection: construireMessageCorrection(
        `le JSON ne correspond pas au schéma attendu (${resultat.error.issues
          .map((probleme) => `${probleme.path.join(".")}: ${probleme.message}`)
          .join("; ")}).`,
      ),
    };
  }

  return { type: "facture", donnees: resultat.data };
}

export type ResultatExtractionFinal =
  | ReponseExtraction
  | { type: "echec_definitif" };

/**
 * Orchestre l'appel LLM avec une seule relance en cas d'échec de parsing.
 * `appelerLLM` reçoit `undefined` au premier appel, puis le message de
 * correction en cas de relance — il porte l'appel réseau réel (Anthropic),
 * ce qui garde cette fonction testable sans réseau.
 */
export async function extraireFactureAvecRetry(
  appelerLLM: (messageCorrection?: string) => Promise<string>,
): Promise<ResultatExtractionFinal> {
  const premiereReponse = await appelerLLM();
  const premierResultat = parserReponseExtraction(premiereReponse);
  if (premierResultat.type !== "echec") {
    return premierResultat;
  }

  const deuxiemeReponse = await appelerLLM(premierResultat.messageCorrection);
  const deuxiemeResultat = parserReponseExtraction(deuxiemeReponse);
  if (deuxiemeResultat.type !== "echec") {
    return deuxiemeResultat;
  }

  return { type: "echec_definitif" };
}
