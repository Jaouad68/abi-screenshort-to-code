import type {
  ClientType,
  ConsentType,
  EquipmentCategory,
  PropertyType,
} from "@/generated/prisma/enums";

/**
 * Libellés affichés à l'artisan.
 *
 * Centralisés ici pour deux raisons : ne jamais laisser fuiter un nom technique
 * d'énumération dans l'interface (§3 : pas de jargon informatique), et garder un
 * point unique si une traduction devient nécessaire — sans construire dès
 * maintenant une infrastructure multilingue que le cahier des charges exclut
 * explicitement en V1 (§53).
 */

export const LIBELLE_TYPE_CLIENT: Record<ClientType, string> = {
  PARTICULIER: "Particulier",
  PROFESSIONNEL: "Professionnel",
};

export const LIBELLE_TYPE_LOGEMENT: Record<PropertyType, string> = {
  MAISON: "Maison",
  APPARTEMENT: "Appartement",
  LOCAL_COMMERCIAL: "Local commercial",
  IMMEUBLE: "Immeuble",
  AUTRE: "Autre",
};

export const LIBELLE_CATEGORIE_EQUIPEMENT: Record<EquipmentCategory, string> = {
  CHAUDIERE: "Chaudière",
  CHAUFFE_EAU: "Chauffe-eau",
  POMPE_A_CHALEUR: "Pompe à chaleur",
  CLIMATISATION: "Climatisation",
  ADOUCISSEUR: "Adoucisseur",
  VMC: "VMC",
  SANITAIRE: "Sanitaire",
  ROBINETTERIE: "Robinetterie",
  CANALISATION: "Canalisation",
  AUTRE: "Autre",
};

export const LIBELLE_CONSENTEMENT: Record<ConsentType, string> = {
  EMAIL_COMMERCIAL: "E-mails commerciaux",
  SMS_COMMERCIAL: "SMS commerciaux",
};

/** Options prêtes à l'emploi pour les listes déroulantes. */
export function versOptions<T extends string>(libelles: Record<T, string>) {
  return (Object.entries(libelles) as [T, string][]).map(([valeur, libelle]) => ({
    valeur,
    libelle,
  }));
}

const formatDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

export function formaterDate(date: Date | null | undefined): string {
  return date ? formatDate.format(date) : "—";
}

/** Adresse sur une ligne, en ignorant les parties non renseignées. */
export function adresseCourte(lieu: {
  adresse?: string;
  codePostal?: string;
  ville?: string;
}): string {
  const ligne2 = [lieu.codePostal, lieu.ville].filter(Boolean).join(" ").trim();
  return [lieu.adresse?.trim(), ligne2].filter(Boolean).join(", ");
}
