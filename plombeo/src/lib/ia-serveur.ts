import "server-only";
import { CONSIGNES, IA_NON_CONFIGUREE, caviarder, iaDisponible } from "@/lib/ia";

/**
 * ADAPTATEUR IA (Phase 11).
 *
 * Même règle qu'aux Phases 6 et 7 : **réel ou refusé, jamais simulé** (§76).
 * Sans fournisseur configuré, l'assistant est indisponible et le dit. Aucune
 * réponse fabriquée, aucun mode démonstration — une réponse inventée serait
 * indiscernable d'une vraie et se retrouverait sur un document client.
 *
 * La décision N°9 de la Phase 0 (fournisseur + DPA) reste ouverte : elle engage
 * un contrat de sous-traitance sur des données personnelles et ne peut pas être
 * tranchée par le code.
 */

export type ReponseIA = { ok: true; texte: string } | { ok: false; erreur: string };

/**
 * Appelle le fournisseur configuré.
 *
 * Le texte est CAVIARDÉ avant l'envoi, et c'est la version caviardée qui est
 * tracée : la base ne doit pas conserver ce qui n'a pas été transmis.
 */
export async function demanderIA(
  type: keyof typeof CONSIGNES,
  texteBrut: string,
): Promise<{ reponse: ReponseIA; envoye: string }> {
  const envoye = caviarder(texteBrut).slice(0, 8000);

  if (!iaDisponible()) {
    return { reponse: { ok: false, erreur: IA_NON_CONFIGUREE }, envoye };
  }

  const consigne = CONSIGNES[type];
  if (!consigne) {
    return { reponse: { ok: false, erreur: "Type de demande inconnu." }, envoye };
  }

  const fournisseur = process.env["IA_FOURNISSEUR"] ?? "";
  const base = process.env["IA_URL"] ?? "";
  if (!base) {
    return {
      reponse: {
        ok: false,
        erreur:
          `Le fournisseur « ${fournisseur} » est déclaré mais son adresse (IA_URL) ` +
          "n'est pas renseignée. Aucun appel n'a été tenté.",
      },
      envoye,
    };
  }

  try {
    // Format « messages » commun aux principales API compatibles. Le fournisseur
    // n'est pas retenu : l'adaptateur reste volontairement générique.
    const reponse = await fetch(base, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env["IA_CLE_API"]}`,
      },
      body: JSON.stringify({
        model: process.env["IA_MODELE"],
        max_tokens: 1500,
        system: consigne,
        messages: [{ role: "user", content: envoye }],
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!reponse.ok) {
      return {
        reponse: { ok: false, erreur: `Le fournisseur a répondu ${reponse.status}.` },
        envoye,
      };
    }

    const donnees = (await reponse.json()) as Record<string, unknown>;
    const texte = extraireTexte(donnees);
    if (!texte) {
      return { reponse: { ok: false, erreur: "Réponse illisible du fournisseur." }, envoye };
    }

    return { reponse: { ok: true, texte }, envoye };
  } catch (erreur) {
    const message = erreur instanceof Error ? erreur.message : "Erreur inconnue";
    return { reponse: { ok: false, erreur: message.slice(0, 300) }, envoye };
  }
}

/** Extraction tolérante : les formats de réponse diffèrent d'un fournisseur à l'autre. */
function extraireTexte(donnees: Record<string, unknown>): string {
  const contenu = donnees["content"];
  if (Array.isArray(contenu)) {
    const premier = contenu[0] as Record<string, unknown> | undefined;
    if (premier && typeof premier["text"] === "string") return premier["text"];
  }
  const choix = donnees["choices"];
  if (Array.isArray(choix)) {
    const message = (choix[0] as Record<string, unknown> | undefined)?.["message"] as
      | Record<string, unknown>
      | undefined;
    if (message && typeof message["content"] === "string") return message["content"];
  }
  return "";
}
