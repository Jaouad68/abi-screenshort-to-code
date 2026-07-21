import "server-only";
import { construirePromptFicheTechnique, type PlatPourPrompt } from "../fiches/prompt";
import { creerClientAnthropic, MODELE_VISION } from "./client";

/**
 * Appelle Claude (texte seul, pas de vision ici) pour proposer une fiche
 * technique. La proposition n'est jamais persistée telle quelle : elle
 * est présentée à l'écran de correction (Sprint 3, étape 3) où le
 * restaurateur ajuste chaque grammage avant validation.
 */
export async function appellerGenerationFicheTechnique(
  plat: PlatPourPrompt,
  typeCuisine: string,
  messageCorrection?: string,
): Promise<string> {
  const client = creerClientAnthropic();

  const promptBase = construirePromptFicheTechnique(plat, typeCuisine);
  const texteInstruction = messageCorrection
    ? `${promptBase}\n\n${messageCorrection}`
    : promptBase;

  const reponse = await client.messages.create({
    model: MODELE_VISION,
    max_tokens: 2048,
    messages: [{ role: "user", content: texteInstruction }],
  });

  const blocTexte = reponse.content.find((bloc) => bloc.type === "text");
  if (!blocTexte || blocTexte.type !== "text") {
    throw new Error("La réponse d'Anthropic ne contient aucun bloc texte.");
  }

  return blocTexte.text;
}
