const JOURS_SANS_ACCENT = [
  "dimanche",
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
];

const MOIS_SANS_ACCENT = [
  "janvier",
  "fevrier",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "aout",
  "septembre",
  "octobre",
  "novembre",
  "decembre",
];

/** French date, spelled out without accents so the message stays GSM 7-bit. */
export function formatDateSmsFr(dateISO: string): string {
  const d = new Date(`${dateISO}T00:00:00.000Z`);
  const jour = JOURS_SANS_ACCENT[d.getUTCDay()];
  const numero = d.getUTCDate();
  const mois = MOIS_SANS_ACCENT[d.getUTCMonth()];
  return `${jour} ${numero} ${mois}`;
}

export function formatHeureSms(heure: string): string {
  return heure.replace(":", "h");
}

type InfosRdv = {
  salonNom: string;
  clientPrenom: string;
  serviceNom: string;
  dateISO: string;
  heure: string;
  lien: string;
};

export function smsConfirmationClient(infos: Pick<InfosRdv, "salonNom" | "dateISO" | "heure" | "lien">): string {
  return `Salon ${infos.salonNom} : RDV confirme ${formatDateSmsFr(infos.dateISO)} a ${formatHeureSms(infos.heure)}. Annuler/deplacer : ${infos.lien}`;
}

export function smsRappelJ2(infos: Pick<InfosRdv, "salonNom" | "dateISO" | "heure" | "lien">): string {
  return `Salon ${infos.salonNom} : RDV ${formatDateSmsFr(infos.dateISO)} a ${formatHeureSms(infos.heure)}. Confirmez ou annulez ici : ${infos.lien}`;
}

export function smsAccuseAnnulationClient(
  infos: Pick<InfosRdv, "salonNom" | "dateISO" | "heure">
): string {
  return `Salon ${infos.salonNom} : votre RDV du ${formatDateSmsFr(infos.dateISO)} a ${formatHeureSms(infos.heure)} est annule. A bientot.`;
}

export function smsNotifGerantNouveauRdv(
  infos: Pick<InfosRdv, "clientPrenom" | "dateISO" | "heure" | "serviceNom">
): string {
  return `RESAZEN : nouveau RDV ${infos.clientPrenom} ${formatDateSmsFr(infos.dateISO)} a ${formatHeureSms(infos.heure)} (${infos.serviceNom}).`;
}

export function smsNotifGerantCreneauLibere(
  infos: Pick<InfosRdv, "clientPrenom" | "dateISO" | "heure">
): string {
  return `RESAZEN : ${infos.clientPrenom} a annule son RDV du ${formatDateSmsFr(infos.dateISO)} a ${formatHeureSms(infos.heure)}. Creneau libere.`;
}
