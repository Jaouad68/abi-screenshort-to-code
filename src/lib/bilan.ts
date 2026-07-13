export type AppointmentPourBilan = {
  debutAt: Date;
  finAt: Date;
  statut: "RESERVE" | "CONFIRME" | "ANNULE" | "HONORE" | "NON_VENU";
  source: "EN_LIGNE" | "TELEPHONE";
  acompteCents: number;
  acompteStatut: "AUCUN" | "DEMANDE" | "REGLE" | "CONSERVE" | "REMBOURSE";
  prixCents: number;
};

export type BilanMensuel = {
  recupereCents: number;
  acomptesConservesCents: number;
  acomptesConservesCount: number;
  creneauxRepriseCents: number;
  creneauxRepriseCount: number;
  creneauxNonReprisCount: number;
  /** Share of concluded appointments (Honoré/Non venu) that were no-shows, 0..1. */
  tauxNonVenue: number;
  /** Share of non-cancelled appointments booked online, 0..1. */
  pourcentageEnLigne: number;
};

function seChevauchent(a: AppointmentPourBilan, b: AppointmentPourBilan): boolean {
  return a.debutAt < b.finAt && b.debutAt < a.finAt;
}

/**
 * Computes the "honest" monthly report from README §7.4: only money that is
 * provably recovered counts — deposits actually kept, and freed slots that were
 * genuinely rebooked (detected as another still-active appointment overlapping
 * the cancelled one's time window). Freed slots nobody took are reported but
 * counted as zero.
 */
export function calculerBilan(appointments: AppointmentPourBilan[]): BilanMensuel {
  const annules = appointments.filter((a) => a.statut === "ANNULE");
  const actifsRestants = appointments.filter((a) => a.statut !== "ANNULE");

  let creneauxRepriseCents = 0;
  let creneauxRepriseCount = 0;
  let creneauxNonReprisCount = 0;

  for (const annule of annules) {
    const index = actifsRestants.findIndex((a) => seChevauchent(annule, a));
    if (index === -1) {
      creneauxNonReprisCount += 1;
      continue;
    }
    const [remplacant] = actifsRestants.splice(index, 1);
    creneauxRepriseCents += remplacant.prixCents;
    creneauxRepriseCount += 1;
  }

  const acomptesConserves = appointments.filter((a) => a.acompteStatut === "CONSERVE");
  const acomptesConservesCents = acomptesConserves.reduce((somme, a) => somme + a.acompteCents, 0);
  const acomptesConservesCount = acomptesConserves.length;

  const conclus = appointments.filter((a) => a.statut === "HONORE" || a.statut === "NON_VENU");
  const tauxNonVenue =
    conclus.length === 0
      ? 0
      : conclus.filter((a) => a.statut === "NON_VENU").length / conclus.length;

  const nonAnnules = appointments.filter((a) => a.statut !== "ANNULE");
  const pourcentageEnLigne =
    nonAnnules.length === 0
      ? 0
      : nonAnnules.filter((a) => a.source === "EN_LIGNE").length / nonAnnules.length;

  return {
    recupereCents: acomptesConservesCents + creneauxRepriseCents,
    acomptesConservesCents,
    acomptesConservesCount,
    creneauxRepriseCents,
    creneauxRepriseCount,
    creneauxNonReprisCount,
    tauxNonVenue,
    pourcentageEnLigne,
  };
}
