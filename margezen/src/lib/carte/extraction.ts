import { construireMessageCorrection, retirerBalisesCode } from "../llm/nettoyage";
import { carteExtraiteSchema, type CarteExtraite } from "./schema";

/**
 * Pipeline d'import de carte par photo. Même discipline que l'extraction
 * de facture (lib/factures/extraction.ts) : validation Zod stricte, une
 * seule relance avec message de correction, puis bascule en saisie
 * manuelle des plats.
 */

export type ResultatParsingCarte =
  | { type: "carte"; donnees: CarteExtraite }
  | { type: "echec"; messageCorrection: string };

export function parserReponseCarte(texteBrut: string): ResultatParsingCarte {
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

  const resultat = carteExtraiteSchema.safeParse(json);
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

  return { type: "carte", donnees: resultat.data };
}

export type ResultatImportCarte =
  | { type: "carte"; donnees: CarteExtraite }
  | { type: "echec_definitif" };

export async function importerCarteAvecRetry(
  appelerLLM: (messageCorrection?: string) => Promise<string>,
): Promise<ResultatImportCarte> {
  const premiereReponse = await appelerLLM();
  const premierResultat = parserReponseCarte(premiereReponse);
  if (premierResultat.type === "carte") {
    return premierResultat;
  }

  const deuxiemeReponse = await appelerLLM(premierResultat.messageCorrection);
  const deuxiemeResultat = parserReponseCarte(deuxiemeReponse);
  if (deuxiemeResultat.type === "carte") {
    return deuxiemeResultat;
  }

  return { type: "echec_definitif" };
}
