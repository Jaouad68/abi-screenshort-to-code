import type { ProcedureContent } from './types';

/**
 * Vérifie qu'un contenu venu du catalogue est cohérent avant de l'afficher.
 * Renvoie la liste des problèmes (vide si tout va bien).
 */
export function validateContent(content: unknown): string[] {
  const errors: string[] = [];
  const c = content as Partial<ProcedureContent> | null;
  if (!c || typeof c !== 'object') return ['contenu absent'];
  if (!Array.isArray(c.questions) || c.questions.length === 0) errors.push('aucune question');
  if (!Array.isArray(c.outcomes) || c.outcomes.length === 0) errors.push('aucun résultat');
  if (!c.pieces || typeof c.pieces !== 'object') errors.push('pièces absentes');
  if (!c.etapes || typeof c.etapes !== 'object') errors.push('étapes absentes');
  if (errors.length) return errors;

  const content_ = c as ProcedureContent;
  const questionIds = new Set<string>();
  for (const q of content_.questions) {
    if (questionIds.has(q.id)) errors.push(`question en double : ${q.id}`);
    questionIds.add(q.id);
    if (!q.choices?.length || q.choices.length > 4) errors.push(`question ${q.id} : 1 à 4 réponses attendues`);
  }
  const checkCondition = (where: string, cond: Record<string, string> | undefined) => {
    for (const key of Object.keys(cond ?? {})) {
      if (!questionIds.has(key)) errors.push(`${where} : question inconnue ${key}`);
    }
  };
  content_.questions.forEach((q) => checkCondition(`question ${q.id}`, q.show_if));
  for (const o of content_.outcomes) {
    checkCondition(`résultat ${o.id}`, o.when);
    if (!(o.cout_eur >= 0)) errors.push(`résultat ${o.id} : coût invalide`);
    for (const p of o.pieces) if (!content_.pieces[p]) errors.push(`résultat ${o.id} : pièce inconnue ${p}`);
    for (const e of o.etapes) if (!content_.etapes[e]) errors.push(`résultat ${o.id} : étape inconnue ${e}`);
  }
  for (const [i, rule] of (content_.pieces_conditionnelles ?? []).entries()) {
    checkCondition(`règle de pièces ${i}`, rule.when);
    for (const p of [...(rule.ajouter ?? []), ...(rule.retirer ?? [])]) {
      if (!content_.pieces[p]) errors.push(`règle de pièces ${i} : pièce inconnue ${p}`);
    }
  }
  return errors;
}
