/**
 * Données pré-remplies pour MELLADO Électricité, appliquées à la création du
 * compte : coordonnées de l'entreprise (en-tête PDF) + bibliothèque de prestations.
 */

export const COMPANY_DEFAULT = {
  nom: "MELLADO Électricité",
  adresse: "20 rue Comblais",
  codePostal: "28200",
  ville: "Châteaudun",
  telephone: "02 37 45 12 89",
  email: "contact@mellado-electricite.fr",
  siret: "412 398 754 00023",
  tvaIntra: "FR76412398754",
  assurance: "MAAF Pro — Police n° 78-432-991",
  iban: "",
  prefixeDevis: "DEV",
  tauxTvaDefaut: 20,
  dureeValidite: 30,
  mentionsLegales:
    "Devis valable 30 jours à compter de sa date d'émission. " +
    "TVA acquittée sur les débits. Règlement à réception de facture. " +
    "Assurance décennale : MAAF Pro — Police n° 78-432-991.",
};

export const PRESTATIONS_DEFAULT = [
  { libelle: "Pose de prise de courant", unite: "u", prixUnitaireCents: 3500, tauxTva: 20 },
  { libelle: "Pose d'interrupteur", unite: "u", prixUnitaireCents: 2800, tauxTva: 20 },
  { libelle: "Installation tableau électrique", unite: "u", prixUnitaireCents: 45000, tauxTva: 20 },
  { libelle: "Câblage au mètre linéaire", unite: "ml", prixUnitaireCents: 1200, tauxTva: 20 },
  { libelle: "Mise aux normes NF C 15-100", unite: "forfait", prixUnitaireCents: 85000, tauxTva: 10 },
  { libelle: "Pose de luminaire", unite: "u", prixUnitaireCents: 5500, tauxTva: 20 },
  { libelle: "Installation VMC", unite: "u", prixUnitaireCents: 32000, tauxTva: 20 },
];
