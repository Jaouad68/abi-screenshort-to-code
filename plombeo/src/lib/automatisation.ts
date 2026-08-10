import type { DeclencheurAutomatisation } from "@/generated/prisma/enums";

/**
 * MOTEUR D'AUTOMATISATION — logique pure (Phase 7).
 *
 * Volontairement sans base ni réseau : c'est ici que vivent les garanties du
 * §84 (« automatisations mal calibrées qui dégradent la relation client »), et
 * une garantie qu'on ne peut pas tester exhaustivement n'en est pas une.
 *
 * Deux invariants portés par ce module :
 *  1. une relance part **une seule fois** — clé d'idempotence déterministe ;
 *  2. une relance ne part **jamais au mauvais moment ni trop souvent** —
 *     garde-fous non désactivables.
 */

/* -------------------------------------------------------------------------- */
/* Idempotence                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Clé d'idempotence d'une exécution.
 *
 * Déterministe : mêmes entrées, même clé. C'est la contrainte d'unicité en base
 * sur cette valeur qui empêche la double relance, pas un test applicatif — deux
 * balayages concurrents liraient tous deux « pas encore envoyé ».
 *
 * L'occurrence distingue les échéances successives d'un même échéancier :
 * `FACTURE_ECHUE:cmxyz:7` et `FACTURE_ECHUE:cmxyz:14` sont deux relances
 * légitimes de la même facture.
 */
export function cleIdempotence(
  declencheur: DeclencheurAutomatisation,
  entiteId: string,
  occurrence: number,
): string {
  return `${declencheur}:${entiteId}:${occurrence}`;
}

/* -------------------------------------------------------------------------- */
/* Garde-fous (§84)                                                           */
/* -------------------------------------------------------------------------- */

/** Au-delà, ce n'est plus une relance : c'est au téléphone que ça se règle. */
export const MAX_RELANCES = 3;

/** Empêche une cascade si plusieurs règles visent la même facture. */
export const DELAI_MIN_ENTRE_RELANCES_JOURS = 7;

/** Bornes d'envoi, heures locales. */
export const HEURE_MIN = 8;
export const HEURE_MAX = 20;

const JOUR_MS = 24 * 60 * 60 * 1000;

/**
 * L'instant est-il acceptable pour écrire à un client ?
 *
 * Un e-mail de relance un dimanche à 6 h abîme la relation que l'artisan a mis
 * des années à construire. Le balayage attend plutôt que d'envoyer.
 */
export function dansFenetreEnvoi(date: Date): boolean {
  const jour = date.getDay();
  if (jour === 0 || jour === 6) return false;
  const heure = date.getHours();
  return heure >= HEURE_MIN && heure < HEURE_MAX;
}

/** Nombre de jours entiers écoulés entre deux instants. */
export function joursEcoules(depuis: Date, jusqua: Date): number {
  return Math.floor((jusqua.getTime() - depuis.getTime()) / JOUR_MS);
}

export type Eligibilite = { eligible: true } | { eligible: false; motif: string };

/**
 * Une relance peut-elle partir pour cette facture, maintenant ?
 *
 * Chaque refus porte un motif en français : il sera affiché à l'artisan. Une
 * automatisation qui ne fait rien sans dire pourquoi est indiscernable d'une
 * automatisation en panne.
 */
export function relanceAutorisee(facture: {
  resteCents: number;
  dateEcheance: Date | null;
  clientRelancesDesactivees: boolean;
  clientEmail: string;
  relancesDejaEnvoyees: number;
  derniereRelanceLe: Date | null;
}, delaiJours: number, maintenant: Date): Eligibilite {
  // Le paiement arrête tout : la facture n'est plus en retard, la relance n'a
  // plus d'objet. Contrôle en tête, c'est le plus important.
  if (facture.resteCents <= 0) return { eligible: false, motif: "Facture soldée." };

  if (!facture.dateEcheance) {
    return { eligible: false, motif: "Aucune date d'échéance sur cette facture." };
  }

  if (facture.clientRelancesDesactivees) {
    return { eligible: false, motif: "Relances désactivées pour ce client." };
  }

  if (!facture.clientEmail.trim()) {
    return { eligible: false, motif: "Aucune adresse e-mail pour ce client." };
  }

  if (facture.relancesDejaEnvoyees >= MAX_RELANCES) {
    return {
      eligible: false,
      motif: `Plafond de ${MAX_RELANCES} relances atteint. À reprendre par téléphone.`,
    };
  }

  const retard = joursEcoules(facture.dateEcheance, maintenant);
  if (retard < delaiJours) {
    return { eligible: false, motif: `Échéance dépassée de ${retard} j, règle à ${delaiJours} j.` };
  }

  if (facture.derniereRelanceLe) {
    const depuis = joursEcoules(facture.derniereRelanceLe, maintenant);
    if (depuis < DELAI_MIN_ENTRE_RELANCES_JOURS) {
      return {
        eligible: false,
        motif: `Dernière relance il y a ${depuis} j, minimum ${DELAI_MIN_ENTRE_RELANCES_JOURS} j.`,
      };
    }
  }

  if (!dansFenetreEnvoi(maintenant)) {
    return { eligible: false, motif: "Hors plage d'envoi (8 h – 20 h, jours ouvrés)." };
  }

  return { eligible: true };
}

/* -------------------------------------------------------------------------- */
/* Modèles de message                                                         */
/* -------------------------------------------------------------------------- */

export type Variables = Record<string, string>;

/**
 * Substitue `{{variable}}` dans un modèle.
 *
 * Une variable inconnue est laissée TELLE QUELLE plutôt que remplacée par du
 * vide : un artisan qui se trompe de nom doit le voir dans son aperçu, pas
 * découvrir un trou dans l'e-mail reçu par son client.
 */
export function remplir(modele: string, variables: Variables): string {
  return modele.replace(/\{\{(\w+)\}\}/g, (entier, nom: string) =>
    Object.prototype.hasOwnProperty.call(variables, nom) ? variables[nom]! : entier,
  );
}

/**
 * Textes par défaut : FACTUELS.
 *
 * Aucune mention d'intérêts de retard, d'indemnité forfaitaire ni de mise en
 * demeure. Ce sont des notions au régime précis [À VÉRIFIER — SOURCE
 * OFFICIELLE], et un texte par défaut donnerait à l'artisan un faux sentiment
 * de couverture juridique (§15, §54). Une relance Plombéo constate un retard ;
 * elle ne met pas en demeure.
 */
export const MODELES_PAR_DEFAUT: Record<string, { sujet: string; corps: string }> = {
  relance_facture: {
    sujet: "Facture {{numero}} — {{entreprise}}",
    corps: [
      "Bonjour {{client}},",
      "",
      "Sauf erreur de notre part, la facture {{numero}} du {{dateFacture}},",
      "d'un montant de {{montant}}, reste due. Son échéance était fixée au {{echeance}}.",
      "",
      "Si le règlement a été effectué entre-temps, merci de ne pas tenir compte de ce message.",
      "Pour toute question, n'hésitez pas à nous contacter.",
      "",
      "Cordialement,",
      "{{entreprise}}",
    ].join("\n"),
  },
  envoi_devis: {
    sujet: "Votre devis {{numero}} — {{entreprise}}",
    corps: [
      "Bonjour {{client}},",
      "",
      "Vous trouverez ci-joint le devis {{numero}} d'un montant de {{montant}}.",
      "",
      "Nous restons à votre disposition pour toute précision.",
      "",
      "Cordialement,",
      "{{entreprise}}",
    ].join("\n"),
  },
  envoi_facture: {
    sujet: "Votre facture {{numero}} — {{entreprise}}",
    corps: [
      "Bonjour {{client}},",
      "",
      "Vous trouverez ci-joint la facture {{numero}} d'un montant de {{montant}},",
      "à régler pour le {{echeance}}.",
      "",
      "Cordialement,",
      "{{entreprise}}",
    ].join("\n"),
  },
};
