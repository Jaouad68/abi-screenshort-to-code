// US04 : retrouver une démarche à partir d'une phrase (tapée ou dictée au clavier).

export type DemarcheId = 'cni-passeport' | 'retraite' | 'impots' | 'courrier';

const KEYWORDS: Record<DemarcheId, string[]> = {
  'cni-passeport': ['carte d identite', 'carte identite', 'cni', 'passeport', 'papiers d identite'],
  retraite: ['retraite', 'reversion', 'pension', 'releve de carriere'],
  impots: ['impot', 'impots', 'declaration de revenus', 'declarer mes revenus', 'fiscal'],
  courrier: ['courrier', 'lettre', 'recu une lettre', 'comprends pas'],
};

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Démarches correspondantes, la plus pertinente en premier (mot-clé le plus long trouvé). */
export function matchDemarches(text: string): DemarcheId[] {
  const padded = ` ${normalize(text)} `;
  const scored: [DemarcheId, number][] = [];
  for (const [id, words] of Object.entries(KEYWORDS) as [DemarcheId, string[]][]) {
    const best = Math.max(0, ...words.filter((w) => padded.includes(` ${w} `)).map((w) => w.length));
    if (best > 0) scored.push([id, best]);
  }
  return scored.sort((a, b) => b[1] - a[1]).map(([id]) => id);
}

/** « https://www.ants.gouv.fr/x » → « ants.gouv.fr ». Évite `URL.hostname`, incomplet selon les moteurs JS. */
export function nomDuSite(url: string): string {
  return url.replace(/^[a-z]+:\/\//i, '').replace(/^www\./i, '').split(/[/?#]/)[0];
}
