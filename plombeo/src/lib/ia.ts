/**
 * ASSISTANT IA — logique pure (Phase 11).
 *
 * Le §22 est ici une contrainte de CONCEPTION, pas une mention à afficher :
 * *« l'IA ne doit jamais se présenter comme remplaçant le diagnostic
 * professionnel du plombier »*. Un assistant qui écrit « il s'agit probablement
 * d'un joint défectueux » a franchi la ligne, quel que soit l'avertissement qui
 * l'entoure.
 *
 * D'où trois garanties portées par ce module, toutes testées :
 *  1. les consignes envoyées au fournisseur INTERDISENT explicitement le
 *     diagnostic et le prix ;
 *  2. les lignes proposées arrivent toujours à zéro euro ;
 *  3. le texte transmis est caviardé des identifiants directs évidents.
 */

/* -------------------------------------------------------------------------- */
/* Caviardage                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Retire les identifiants directs les plus évidents avant l'envoi.
 *
 * **Ne garantit AUCUN anonymat** : un texte libre peut toujours contenir un nom
 * de famille ou un détail identifiant. L'interface le dit plutôt que de le
 * laisser croire — promettre l'anonymat serait la fausse garantie que le §76
 * interdit.
 */
export function caviarder(texte: string): string {
  return texte
    // Téléphones français, avec ou sans séparateurs.
    .replace(/(?:\+33|0)\s*[1-9](?:[\s.-]*\d{2}){4}/g, "[téléphone]")
    .replace(/[\w.+-]+@[\w-]+\.[\w.]{2,}/g, "[e-mail]")
    // IBAN avant le code postal : un IBAN français contient des groupes de
    // chiffres qu'une règle plus large découperait mal.
    .replace(/\b[A-Z]{2}\d{2}(?:[\s]?[A-Z0-9]{4}){2,7}\b/g, "[IBAN]")
    .replace(/\b\d{5}\b/g, "[code postal]");
}

/* -------------------------------------------------------------------------- */
/* Consignes                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Interdictions communes à toutes les consignes.
 *
 * Exportées séparément pour qu'un test puisse vérifier qu'aucune consigne n'est
 * envoyée sans elles — c'est la garantie §22 rendue vérifiable.
 */
export const INTERDICTIONS = [
  "Tu ne proposes JAMAIS de diagnostic technique.",
  "Tu n'émets JAMAIS d'hypothèse sur la cause d'une panne.",
  "Tu ne proposes JAMAIS de prix, de tarif ni d'estimation de coût.",
  "Tu ne conclus JAMAIS sur l'état d'un équipement.",
  "Si le texte fourni ne contient pas l'information, tu ne l'inventes pas.",
].join("\n");

export const CONSIGNES: Record<string, string> = {
  MISE_AU_PROPRE: [
    "Tu mets au propre un compte rendu d'intervention rédigé par un plombier.",
    "Tu corriges l'orthographe et la grammaire, tu structures en phrases claires.",
    "Tu conserves STRICTEMENT les faits énoncés, sans en ajouter ni en retirer.",
    "",
    INTERDICTIONS,
  ].join("\n"),

  STRUCTURER_DEVIS: [
    "Tu transformes une description de travaux en lignes de devis.",
    "Chaque ligne comporte un libellé, une quantité et une unité.",
    "Les prix sont TOUJOURS laissés à zéro : c'est l'artisan qui les fixe.",
    "",
    INTERDICTIONS,
  ].join("\n"),
};

/* -------------------------------------------------------------------------- */
/* Lignes proposées                                                           */
/* -------------------------------------------------------------------------- */

export type LigneProposee = {
  libelle: string;
  quantiteMilli: number;
  unite: string;
  prixUnitaireCents: number;
};

/**
 * Normalise des lignes proposées.
 *
 * Le prix est FORCÉ à zéro, quoi que le fournisseur ait renvoyé. Une IA qui
 * propose un prix propose une décision commerciale : elle n'a ni le coût de
 * revient de l'artisan, ni son positionnement, ni son marché local. La garantie
 * est ici, dans le code, et non dans l'espoir que la consigne soit respectée.
 */
export function normaliserLignes(brut: unknown): LigneProposee[] {
  if (!Array.isArray(brut)) return [];

  return brut
    .filter((l): l is Record<string, unknown> => typeof l === "object" && l !== null)
    .map((l) => ({
      libelle: String(l["libelle"] ?? "").slice(0, 200).trim(),
      quantiteMilli: Number.isFinite(Number(l["quantiteMilli"]))
        ? Math.max(0, Math.round(Number(l["quantiteMilli"])))
        : 1000,
      unite: String(l["unite"] ?? "u").slice(0, 20) || "u",
      prixUnitaireCents: 0,
    }))
    .filter((l) => l.libelle.length > 0)
    .slice(0, 50);
}

/** Message affiché quand aucun fournisseur n'est configuré. */
export const IA_NON_CONFIGUREE =
  "L'assistant n'est pas disponible : aucun fournisseur d'intelligence artificielle " +
  "n'est configuré. Renseignez IA_FOURNISSEUR, IA_CLE_API et IA_MODELE.";

export function iaDisponible(): boolean {
  return Boolean(
    process.env["IA_FOURNISSEUR"] && process.env["IA_CLE_API"] && process.env["IA_MODELE"],
  );
}
