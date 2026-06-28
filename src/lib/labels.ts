// Libellés lisibles + formatage FR partagés (UI et PDF).

export const TYPE_EQUIPEMENT_LABEL: Record<string, string> = {
  FRIGO_POSITIF: "Frigo positif",
  CONGELATEUR: "Congélateur",
  VITRINE: "Vitrine réfrigérée",
  MAINTIEN_CHAUD: "Maintien au chaud",
};

export const FREQUENCE_LABEL: Record<string, string> = {
  QUOTIDIENNE: "Quotidienne",
  HEBDOMADAIRE: "Hebdomadaire",
  MENSUELLE: "Mensuelle",
};

export const STATUT_PRODUIT_LABEL: Record<string, string> = {
  OUVERT: "Ouvert",
  CONSOMME: "Consommé",
  JETE: "Jeté",
};

export const STATUT_NC_LABEL: Record<string, string> = {
  OUVERT: "Ouvert",
  RESOLU: "Résolu",
};

export const ROLE_LABEL: Record<string, string> = {
  GERANT: "Gérant",
  EMPLOYE: "Employé",
};

const dateFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dateTimeFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const timeFmt = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
});

export const formatDate = (d: Date | string) => dateFmt.format(new Date(d));
export const formatDateTime = (d: Date | string) => dateTimeFmt.format(new Date(d));
export const formatTime = (d: Date | string) => timeFmt.format(new Date(d));

export const formatTemp = (v: number) =>
  `${v.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} °C`;
