import { describe, expect, it } from "vitest";
import {
  estTerminal,
  transitionInterventionAutorisee,
  transitionLeadAutorisee,
  transitionRendezVousAutorisee,
} from "@/lib/etats";
import type {
  AppointmentStatut,
  InterventionStatut,
  LeadStatut,
} from "@/generated/prisma/enums";

/*
 * Les transitions INTERDITES comptent autant que les autorisées : c'est un état
 * incohérent en base qu'on cherche à rendre impossible, pas seulement à masquer
 * dans l'interface.
 */

const LEADS: LeadStatut[] = ["NOUVEAU", "QUALIFIE", "CONVERTI", "ABANDONNE"];
const RDV: AppointmentStatut[] = ["PLANIFIE", "CONFIRME", "EN_COURS", "TERMINE", "ANNULE"];
const INTERVENTIONS: InterventionStatut[] = [
  "PLANIFIEE",
  "EN_COURS",
  "TERMINEE",
  "CLOTUREE",
  "ANNULEE",
];

describe("machine à états — demande", () => {
  it("suit le chemin nominal", () => {
    expect(transitionLeadAutorisee("NOUVEAU", "QUALIFIE")).toBe(true);
    expect(transitionLeadAutorisee("QUALIFIE", "CONVERTI")).toBe(true);
  });

  it("permet d'abandonner tant que la demande n'est pas traitée", () => {
    expect(transitionLeadAutorisee("NOUVEAU", "ABANDONNE")).toBe(true);
    expect(transitionLeadAutorisee("QUALIFIE", "ABANDONNE")).toBe(true);
  });

  /*
   * Planifier un rendez-vous depuis une demande la convertit directement, sans
   * passage explicite par QUALIFIE : l'artisan qui planifie a de fait qualifié.
   * L'interdire faisait échouer la conversion en silence.
   */
  it("permet de convertir directement une demande nouvelle", () => {
    expect(transitionLeadAutorisee("NOUVEAU", "CONVERTI")).toBe(true);
  });

  it("interdit de revenir en arrière", () => {
    expect(transitionLeadAutorisee("QUALIFIE", "NOUVEAU")).toBe(false);
    expect(transitionLeadAutorisee("CONVERTI", "QUALIFIE")).toBe(false);
  });

  it("fige les états terminaux", () => {
    for (const vers of LEADS) {
      expect(transitionLeadAutorisee("CONVERTI", vers)).toBe(false);
      expect(transitionLeadAutorisee("ABANDONNE", vers)).toBe(false);
    }
    expect(estTerminal("lead", "CONVERTI")).toBe(true);
    expect(estTerminal("lead", "NOUVEAU")).toBe(false);
  });
});

describe("machine à états — rendez-vous", () => {
  it("suit le chemin nominal", () => {
    expect(transitionRendezVousAutorisee("PLANIFIE", "CONFIRME")).toBe(true);
    expect(transitionRendezVousAutorisee("CONFIRME", "EN_COURS")).toBe(true);
    expect(transitionRendezVousAutorisee("EN_COURS", "TERMINE")).toBe(true);
  });

  // Un artisan démarre souvent sans être passé par « confirmé ».
  it("permet de démarrer directement depuis PLANIFIE", () => {
    expect(transitionRendezVousAutorisee("PLANIFIE", "EN_COURS")).toBe(true);
  });

  it("permet d'annuler tant que ce n'est pas terminé", () => {
    expect(transitionRendezVousAutorisee("PLANIFIE", "ANNULE")).toBe(true);
    expect(transitionRendezVousAutorisee("EN_COURS", "ANNULE")).toBe(true);
    expect(transitionRendezVousAutorisee("TERMINE", "ANNULE")).toBe(false);
  });

  it("fige les états terminaux", () => {
    for (const vers of RDV) {
      expect(transitionRendezVousAutorisee("TERMINE", vers)).toBe(false);
      expect(transitionRendezVousAutorisee("ANNULE", vers)).toBe(false);
    }
  });
});

describe("machine à états — intervention", () => {
  it("suit le chemin nominal jusqu'à la clôture", () => {
    expect(transitionInterventionAutorisee("PLANIFIEE", "EN_COURS")).toBe(true);
    expect(transitionInterventionAutorisee("EN_COURS", "TERMINEE")).toBe(true);
    expect(transitionInterventionAutorisee("TERMINEE", "CLOTUREE")).toBe(true);
  });

  // Un compte rendu se corrige tant qu'il n'est pas validé.
  it("permet de rouvrir une intervention terminée mais non clôturée", () => {
    expect(transitionInterventionAutorisee("TERMINEE", "EN_COURS")).toBe(true);
  });

  /*
   * Point critique : une intervention clôturée sert de base à la facturation
   * (Phase 5). La rouvrir permettrait de modifier après coup ce qui a été
   * facturé — le §14 l'interdit, une correction passe par un avoir.
   */
  it("ne rouvre JAMAIS une intervention clôturée", () => {
    for (const vers of INTERVENTIONS) {
      expect(transitionInterventionAutorisee("CLOTUREE", vers)).toBe(false);
    }
    expect(estTerminal("intervention", "CLOTUREE")).toBe(true);
  });

  it("interdit de clôturer sans être passé par TERMINEE", () => {
    expect(transitionInterventionAutorisee("PLANIFIEE", "CLOTUREE")).toBe(false);
    expect(transitionInterventionAutorisee("EN_COURS", "CLOTUREE")).toBe(false);
  });

  it("interdit toute transition depuis une intervention annulée", () => {
    for (const vers of INTERVENTIONS) {
      expect(transitionInterventionAutorisee("ANNULEE", vers)).toBe(false);
    }
  });

  // Garde-fou : aucune machine ne doit autoriser une transition vers soi-même,
  // qui masquerait un bug d'appel répété.
  it("n'autorise aucune transition d'un état vers lui-même", () => {
    for (const e of LEADS) expect(transitionLeadAutorisee(e, e)).toBe(false);
    for (const e of RDV) expect(transitionRendezVousAutorisee(e, e)).toBe(false);
    for (const e of INTERVENTIONS) expect(transitionInterventionAutorisee(e, e)).toBe(false);
  });
});
