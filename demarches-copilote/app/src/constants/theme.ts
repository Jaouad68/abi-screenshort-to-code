// Palette volontairement éloignée de la charte de l'État (pas de bleu-blanc-rouge, pas de Marianne).
// Contrastes vérifiés AA sur le fond crème.
export const Couleurs = {
  fond: '#FBF8F3',
  surface: '#FFFFFF',
  texte: '#1C1B19',
  texteSecondaire: '#57534E',
  principal: '#1F5E4A',
  principalAppuye: '#174636',
  surPrincipal: '#FFFFFF',
  principalLeger: '#E3EFEA',
  bordure: '#D6D3CE',
  avertissementFond: '#FFF4D6',
  avertissementTexte: '#5C4400',
  erreur: '#A4262C',
  erreurFond: '#FBEAEA',
} as const;

/** Tailles de base à 100 %, multipliées par la taille choisie par l'usager (US03). */
export const Typo = {
  titre: { fontSize: 28, lineHeight: 36, fontWeight: '700' },
  sousTitre: { fontSize: 22, lineHeight: 30, fontWeight: '600' },
  corps: { fontSize: 18, lineHeight: 26, fontWeight: '400' },
  corpsGras: { fontSize: 18, lineHeight: 26, fontWeight: '600' },
  petit: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
} as const;

export type VarianteTexte = keyof typeof Typo;

export const TAILLES_TEXTE = [1, 1.25, 1.5, 2] as const;
export type TailleTexte = (typeof TAILLES_TEXTE)[number];

/** Cible tactile minimale (points), US03. */
export const CIBLE_MIN = 56;

export const Espace = { xs: 4, s: 8, m: 16, l: 24, xl: 32 } as const;
