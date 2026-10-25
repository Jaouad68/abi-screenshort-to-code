import { describe, expect, it } from 'vitest';

import cniJson from '../../../../content/cni-passeport.v1.json';
import { nextQuestion, pruneAnswers, resultat, selectOutcome } from '../parcours/evaluer';
import type { ProcedureContent } from '../parcours/types';
import { validateContent } from '../parcours/valider';

const cni = cniJson as unknown as ProcedureContent;

function piecesOf(answers: Record<string, string>) {
  const r = resultat(cni, answers);
  if (r.kind !== 'demarche') throw new Error('résultat attendu');
  return r.pieces.map((p) => p.key);
}

describe('contenu CNI / passeport', () => {
  it('est cohérent', () => {
    expect(validateContent(cni)).toEqual([]);
  });
});

describe('questions', () => {
  it('pose l’âge de l’enfant seulement pour un mineur', () => {
    expect(nextQuestion(cni, { titre: 'passeport', pour_qui: 'moi' })?.id).toBe('motif');
    expect(nextQuestion(cni, { titre: 'passeport', pour_qui: 'mineur' })?.id).toBe('age_mineur');
  });

  it('demande perte ou vol seulement si le titre est perdu ou volé', () => {
    expect(nextQuestion(cni, { titre: 'cni', pour_qui: 'moi', motif: 'perte_vol' })?.id).toBe('vol_ou_perte');
    expect(nextQuestion(cni, { titre: 'cni', pour_qui: 'moi', motif: 'renouvellement' })).toBeNull();
  });

  it('efface les réponses devenues inutiles', () => {
    const answers = { titre: 'passeport', pour_qui: 'moi', age_mineur: '15_17', motif: 'premiere' };
    expect(pruneAnswers(cni, answers)).toEqual({ titre: 'passeport', pour_qui: 'moi', motif: 'premiere' });
  });
});

describe('résultats et coûts (RG01, RG03)', () => {
  it.each([
    [{ titre: 'cni', pour_qui: 'moi', motif: 'renouvellement' }, 'cni', 0],
    [{ titre: 'cni', pour_qui: 'moi', motif: 'perte_vol', vol_ou_perte: 'vol' }, 'cni_perte_vol', 25],
    [{ titre: 'passeport', pour_qui: 'moi', motif: 'premiere' }, 'passeport_majeur', 86],
    [{ titre: 'passeport', pour_qui: 'mineur', age_mineur: '15_17', motif: 'premiere' }, 'passeport_15_17', 42],
    [{ titre: 'passeport', pour_qui: 'mineur', age_mineur: 'moins_15', motif: 'premiere' }, 'passeport_moins_15', 17],
  ])('%o → %s (%d €)', (answers, id, cout) => {
    const outcome = selectOutcome(cni, answers);
    expect(outcome?.id).toBe(id);
    expect(outcome?.cout_eur).toBe(cout);
  });

  it('marque la CNI comme gratuite', () => {
    const r = resultat(cni, { titre: 'cni', pour_qui: 'moi', motif: 'renouvellement' });
    expect(r.kind === 'demarche' && r.gratuit && r.cout).toBe('Gratuit');
  });

  it('renvoie « non couvert » quand aucun résultat ne correspond', () => {
    expect(resultat(cni, { titre: 'permis' }).kind).toBe('non_couvert');
  });
});

describe('pièces à fournir', () => {
  it('ne demande pas d’ancien titre pour une première demande', () => {
    expect(piecesOf({ titre: 'cni', pour_qui: 'moi', motif: 'premiere' })).not.toContain('ancien_titre');
  });

  it('ajoute la déclaration de perte ou de vol', () => {
    const pieces = piecesOf({ titre: 'passeport', pour_qui: 'moi', motif: 'perte_vol', vol_ou_perte: 'perte' });
    expect(pieces).toContain('declaration_perte_vol');
    expect(pieces).not.toContain('ancien_titre');
  });

  it('ajoute la pièce d’identité du parent pour un mineur, sans doublon', () => {
    const pieces = piecesOf({ titre: 'cni', pour_qui: 'mineur', age_mineur: 'moins_15', motif: 'renouvellement' });
    expect(pieces.filter((p) => p === 'identite_parent')).toHaveLength(1);
  });
});

describe('validateContent', () => {
  it('signale une pièce inconnue et une condition sur une question inconnue', () => {
    const broken = structuredClone(cni);
    broken.outcomes[0].pieces.push('fantome');
    broken.outcomes[0].when = { inexistante: 'x' };
    expect(validateContent(broken)).toEqual([
      'résultat cni_perte_vol : question inconnue inexistante',
      'résultat cni_perte_vol : pièce inconnue fantome',
    ]);
  });

  it('refuse un contenu vide', () => {
    expect(validateContent(null)).toEqual(['contenu absent']);
  });
});
