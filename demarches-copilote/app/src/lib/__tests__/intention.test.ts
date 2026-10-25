import { describe, expect, it } from 'vitest';

import { matchDemarches, nomDuSite } from '../intention';

describe('matchDemarches', () => {
  it.each([
    ['Je dois refaire ma carte d’identité', 'cni-passeport'],
    ['PASSEPORT pour mon fils', 'cni-passeport'],
    ['ma pension de réversion', 'retraite'],
    ['déclarer mes revenus', 'impots'],
    ["j'ai reçu une lettre de la CAF", 'courrier'],
  ])('« %s » → %s', (phrase, attendu) => {
    expect(matchDemarches(phrase)[0]).toBe(attendu);
  });

  it('ne trouve rien pour une phrase hors sujet', () => {
    expect(matchDemarches('quel temps fait-il')).toEqual([]);
  });

  it('ne confond pas un mot contenu dans un autre', () => {
    expect(matchDemarches('ma cnil')).toEqual([]);
  });
});

describe('nomDuSite', () => {
  it.each([
    ['https://ants.gouv.fr', 'ants.gouv.fr'],
    ['https://www.info-retraite.fr/portail', 'info-retraite.fr'],
    ['https://www.impots.gouv.fr?x=1', 'impots.gouv.fr'],
  ])('%s → %s', (url, nom) => {
    expect(nomDuSite(url)).toBe(nom);
  });
});
