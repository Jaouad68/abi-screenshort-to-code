import "server-only";
import { creerClientAnthropic, MODELE_VISION } from "./client";
import { PROMPT_EXTRACTION_FACTURE } from "../factures/prompt";

/**
 * Formats d'image acceptés par l'API vision Anthropic. HEIC/HEIF (format
 * par défaut des iPhone) n'en fait pas partie : la conversion vers JPEG a
 * lieu côté client, avant l'envoi (voir lib/images/compression.ts).
 */
export type MediaTypeVision = "image/jpeg" | "image/png";

/**
 * Appelle Claude en vision sur l'image d'une facture. Isolé dans sa
 * propre fonction pour rester injectable dans `extraireFactureAvecRetry`
 * (lib/factures/extraction.ts), qui, elle, est testée sans appel réseau.
 */
export async function appellerExtractionFacture(
  imageBase64: string,
  mediaType: MediaTypeVision,
  messageCorrection?: string,
): Promise<string> {
  const client = creerClientAnthropic();

  const texteInstruction = messageCorrection
    ? `${PROMPT_EXTRACTION_FACTURE}\n\n${messageCorrection}`
    : PROMPT_EXTRACTION_FACTURE;

  const reponse = await client.messages.create({
    model: MODELE_VISION,
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: imageBase64,
            },
          },
          { type: "text", text: texteInstruction },
        ],
      },
    ],
  });

  const blocTexte = reponse.content.find((bloc) => bloc.type === "text");
  if (!blocTexte || blocTexte.type !== "text") {
    throw new Error("La réponse d'Anthropic ne contient aucun bloc texte.");
  }

  return blocTexte.text;
}
