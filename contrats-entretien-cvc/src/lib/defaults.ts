/** Checklist standard appliquée à la création d'une intervention d'entretien
 * (modifiable ensuite : le technicien peut cocher, ajouter ou retirer des lignes). */
export const CHECKLIST_ENTRETIEN_DEFAUT = [
  "Contrôle visuel de l'appareil et de son environnement",
  "Vérification de l'étanchéité (raccords, circuits)",
  "Nettoyage des filtres / échangeurs",
  "Contrôle de la combustion / des paramètres de fonctionnement",
  "Mesure des émissions (analyse de combustion si applicable)",
  "Vérification des sécurités (pression, évacuation, ventilation)",
  "Test de fonctionnement en fin d'intervention",
  "Remise de l'attestation d'entretien au client",
];

/** Types d'équipements suggérés (liste libre : le champ reste un texte). */
export const TYPES_EQUIPEMENT_SUGGERES = [
  "Chaudière gaz",
  "Chaudière fioul",
  "Pompe à chaleur air/eau",
  "Pompe à chaleur air/air",
  "Climatisation split",
  "Climatisation gainable",
  "Chauffe-eau thermodynamique",
  "VMC",
];

/** Types de contrats suggérés. */
export const TYPES_CONTRAT_SUGGERES = [
  "Entretien annuel chaudière",
  "Entretien annuel PAC",
  "Entretien climatisation",
  "Contrat maintenance multi-équipements",
  "Dépannage prioritaire",
];
