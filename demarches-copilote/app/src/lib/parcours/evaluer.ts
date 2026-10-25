import type { Answers, Condition, Outcome, Piece, ProcedureContent, Question } from './types';

export function matches(when: Condition | undefined, answers: Answers): boolean {
  if (!when) return true;
  return Object.entries(when).every(([key, value]) => answers[key] === value);
}

/** Questions à poser, dans l'ordre, compte tenu des réponses déjà données. */
export function visibleQuestions(content: ProcedureContent, answers: Answers): Question[] {
  return content.questions.filter((q) => matches(q.show_if, answers));
}

/**
 * Retire les réponses aux questions devenues invisibles.
 * Ex. : passer de « mineur » à « moi » efface l'âge de l'enfant.
 */
export function pruneAnswers(content: ProcedureContent, answers: Answers): Answers {
  let current = answers;
  // Une suppression peut en masquer d'autres : on itère jusqu'à stabilité.
  for (;;) {
    const visible = new Set(visibleQuestions(content, current).map((q) => q.id));
    const next = Object.fromEntries(Object.entries(current).filter(([id]) => visible.has(id)));
    if (Object.keys(next).length === Object.keys(current).length) return next;
    current = next;
  }
}

/** Première question visible sans réponse, ou null si le diagnostic est complet. */
export function nextQuestion(content: ProcedureContent, answers: Answers): Question | null {
  return visibleQuestions(content, answers).find((q) => answers[q.id] === undefined) ?? null;
}

/** Premier résultat dont toutes les conditions correspondent (SPECS-MVP.md, section 5). */
export function selectOutcome(content: ProcedureContent, answers: Answers): Outcome | null {
  return content.outcomes.find((o) => matches(o.when, answers)) ?? null;
}

export function piecesFor(content: ProcedureContent, outcome: Outcome, answers: Answers): string[] {
  const pieces = [...outcome.pieces];
  for (const rule of content.pieces_conditionnelles ?? []) {
    if (!matches(rule.when, answers)) continue;
    for (const key of rule.ajouter ?? []) if (!pieces.includes(key)) pieces.push(key);
    for (const key of rule.retirer ?? []) {
      const i = pieces.indexOf(key);
      if (i !== -1) pieces.splice(i, 1);
    }
  }
  return pieces;
}

export type Resultat =
  | { kind: 'non_couvert' }
  | {
      kind: 'demarche';
      outcome: Outcome;
      gratuit: boolean;
      cout: string;
      pieces: (Piece & { key: string })[];
      etapes: { key: string; label: string; aide: string; url?: string }[];
    };

export function formatEuros(montant: number): string {
  return `${montant.toLocaleString('fr-FR')} €`;
}

/** Résultat affiché sur l'écran E05. */
export function resultat(content: ProcedureContent, answers: Answers): Resultat {
  const outcome = selectOutcome(content, answers);
  if (!outcome) return { kind: 'non_couvert' };
  const gratuit = outcome.cout_eur === 0;
  return {
    kind: 'demarche',
    outcome,
    gratuit,
    cout: gratuit ? 'Gratuit' : (outcome.cout_label ?? formatEuros(outcome.cout_eur)),
    pieces: piecesFor(content, outcome, answers).map((key) => ({ key, ...content.pieces[key] })),
    etapes: outcome.etapes.map((key) => ({ key, ...content.etapes[key] })),
  };
}
