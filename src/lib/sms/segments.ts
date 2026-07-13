// GSM 03.38 default alphabet (basic + extension table). Used to decide whether a
// message can be sent as a cheap GSM 7-bit SMS or must fall back to Unicode (UCS-2).
const GSM_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ ÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
// Extension characters are escaped in GSM 7-bit and take up two septets each.
const GSM_EXTENDED = "^{}\\[~]|€";

function isGsm7Compatible(texte: string): boolean {
  return [...texte].every((ch) => GSM_BASIC.includes(ch) || GSM_EXTENDED.includes(ch));
}

function longueurGsm7(texte: string): number {
  let longueur = 0;
  for (const ch of texte) {
    longueur += GSM_EXTENDED.includes(ch) ? 2 : 1;
  }
  return longueur;
}

export type SmsEncodage = "GSM7" | "UCS2";

export type SmsAnalyse = {
  encodage: SmsEncodage;
  longueur: number;
  segments: number;
};

/**
 * Determines the encoding (GSM 7-bit vs Unicode), character length, and number of
 * SMS segments for a message. Single-segment limits are 160 chars (GSM7) / 70 (UCS2);
 * once a message needs to be split, each extra segment carries a user-data header,
 * dropping the per-segment budget to 153 (GSM7) / 67 (UCS2).
 */
export function analyserSms(texte: string): SmsAnalyse {
  const gsm7 = isGsm7Compatible(texte);
  const encodage: SmsEncodage = gsm7 ? "GSM7" : "UCS2";
  const longueur = gsm7 ? longueurGsm7(texte) : [...texte].length;

  const limiteSegmentUnique = gsm7 ? 160 : 70;
  const limiteSegmentsMultiples = gsm7 ? 153 : 67;

  const segments =
    longueur === 0
      ? 0
      : longueur <= limiteSegmentUnique
        ? 1
        : Math.ceil(longueur / limiteSegmentsMultiples);

  return { encodage, longueur, segments };
}
