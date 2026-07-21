import { construireMessageCorrection, retirerBalisesCode } from "../llm/nettoyage";
import {
  propositionFicheTechniqueSchema,
  type PropositionFicheTechnique,
} from "./schema";

/**
 * Pipeline de génération assistée de fiche technique. Même discipline que
 * les autres pipelines LLM : validation Zod stricte, une seule relance
 * avec message de correction, puis bascule en saisie manuelle depuis une
 * fiche vide (jamais de composition inventée sans validation humaine —
 * cette proposition reste de toute façon soumise à correction à l'écran
 * suivant).
 */

export type ResultatParsingFiche =
  | { type: "proposition"; donnees: PropositionFicheTechnique }
  | { type: "echec"; messageCorrection: string };

export function parserReponseFicheTechnique(
  texteBrut: string,
): ResultatParsingFiche {
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

  const resultat = propositionFicheTechniqueSchema.safeParse(json);
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

  return { type: "proposition", donnees: resultat.data };
}

export type ResultatGenerationFiche =
  | { type: "proposition"; donnees: PropositionFicheTechnique }
  | { type: "echec_definitif" };

export async function genererFicheTechniqueAvecRetry(
  appelerLLM: (messageCorrection?: string) => Promise<string>,
): Promise<ResultatGenerationFiche> {
  const premiereReponse = await appelerLLM();
  const premierResultat = parserReponseFicheTechnique(premiereReponse);
  if (premierResultat.type === "proposition") {
    return premierResultat;
  }

  const deuxiemeReponse = await appelerLLM(premierResultat.messageCorrection);
  const deuxiemeResultat = parserReponseFicheTechnique(deuxiemeReponse);
  if (deuxiemeResultat.type === "proposition") {
    return deuxiemeResultat;
  }

  return { type: "echec_definitif" };
}
