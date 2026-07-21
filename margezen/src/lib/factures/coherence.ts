/**
 * Contrôle de cohérence entre le total déclaré sur la facture et la somme
 * des lignes extraites. Un écart supérieur à 2 % signale une extraction
 * suspecte : la facture est marquée à valider avec un avertissement
 * explicite plutôt que d'être acceptée silencieusement.
 */

const SEUIL_ECART_PCT = 2;

export interface LigneCoherence {
  totalHtCts: number | null;
}

export interface ResultatCoherence {
  coherent: boolean;
  totalLignesCts: number;
  ecartPct: number | null;
  avertissement: string | null;
}

export function verifierCoherence(
  totalDeclareCts: number | null,
  lignes: readonly LigneCoherence[],
): ResultatCoherence {
  const totalLignesCts = lignes.reduce(
    (somme, ligne) => somme + (ligne.totalHtCts ?? 0),
    0,
  );

  if (totalDeclareCts === null || totalDeclareCts === 0) {
    return {
      coherent: true,
      totalLignesCts,
      ecartPct: null,
      avertissement: null,
    };
  }

  const ecartPct =
    (Math.abs(totalLignesCts - totalDeclareCts) / totalDeclareCts) * 100;
  const ecartArrondi = Math.round(ecartPct * 100) / 100;
  const coherent = ecartArrondi <= SEUIL_ECART_PCT;

  return {
    coherent,
    totalLignesCts,
    ecartPct: ecartArrondi,
    avertissement: coherent
      ? null
      : `Le total des lignes (${(totalLignesCts / 100).toFixed(2)} €) s'écarte de ` +
        `${ecartArrondi.toFixed(1)} % du total déclaré ` +
        `(${(totalDeclareCts / 100).toFixed(2)} €). Facture soumise à validation.`,
  };
}
