import { describe, expect, it } from 'vitest';

import { isRecentEnough, subtractMonths } from '../validite';

describe('subtractMonths', () => {
  it('recule de mois calendaires', () => {
    expect(subtractMonths('2026-10-25', 12)).toBe('2025-10-25');
    expect(subtractMonths('2026-03-15', 6)).toBe('2025-09-15');
  });

  it('ramène au dernier jour du mois si besoin', () => {
    expect(subtractMonths('2026-08-31', 6)).toBe('2026-02-28');
    expect(subtractMonths('2028-08-31', 6)).toBe('2028-02-29');
  });
});

describe('RG04 : justificatif de moins de 12 mois', () => {
  const today = '2026-10-25';

  it('accepte un document daté d’il y a exactement 12 mois', () => {
    expect(isRecentEnough('2025-10-25', 12, today)).toBe(true);
  });

  it('refuse un document daté de 12 mois et un jour', () => {
    expect(isRecentEnough('2025-10-24', 12, today)).toBe(false);
  });

  it('refuse une photo de plus de 6 mois', () => {
    expect(isRecentEnough('2026-04-24', 6, today)).toBe(false);
    expect(isRecentEnough('2026-04-25', 6, today)).toBe(true);
  });
});
