import "server-only";
import { PROMPT_IMPORT_CARTE } from "../carte/prompt";
import { creerClientAnthropic, MODELE_VISION } from "./client";
import type { MediaTypeVision } from "./extraireFacture";

export async function appellerImportCarte(
  imageBase64: string,
  mediaType: MediaTypeVision,
  messageCorrection?: string,
): Promise<string> {
  const client = creerClientAnthropic();

  const texteInstruction = messageCorrection
    ? `${PROMPT_IMPORT_CARTE}\n\n${messageCorrection}`
    : PROMPT_IMPORT_CARTE;

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
