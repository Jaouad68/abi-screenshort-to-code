import type { Plan } from "@/generated/prisma/enums";

export type DefinitionPlan = {
  plan: Plan;
  nom: string;
  prixCents: number;
  /** null = SMS "illimité raisonnable" (no monthly cap), per README §11. */
  quotaSms: number | null;
};

export const PLANS: DefinitionPlan[] = [
  { plan: "ESSENTIEL", nom: "Essentiel", prixCents: 2900, quotaSms: 100 },
  { plan: "SERENITE", nom: "Sérénité", prixCents: 4900, quotaSms: null },
  { plan: "PREMIUM", nom: "Premium", prixCents: 7900, quotaSms: null },
];

export function definitionPlan(plan: Plan): DefinitionPlan {
  const trouve = PLANS.find((p) => p.plan === plan);
  if (!trouve) throw new Error(`Plan inconnu : ${plan}`);
  return trouve;
}
