import type { Catalogue, Lot, Programme, Promoteur, RegleAide, VueMer } from "@/lib/domain";

/**
 * Catalogue de démonstration.
 *
 * TOUTES CES DONNÉES SONT FICTIVES : promoteurs, programmes, numéros de titre
 * foncier et prix sont inventés pour montrer le fonctionnement de l'app. Elles
 * sont utilisées tant que Supabase n'est pas configuré.
 */

/** Barème de lancement du programme d'aide (2024), à revérifier sur le portail officiel. */
export const REGLE_AIDE_LANCEMENT: RegleAide = {
  version: "2024-lancement",
  dateEffet: "2024-01-01",
  dateFin: "2028-12-31",
  tranches: [
    { prixMax: 300_000, aide: 100_000 },
    { prixMax: 700_000, aide: 70_000 },
  ],
  lienOfficiel: "https://daamsakane.ma",
  verifieLe: "2024-01-01",
};

const PROMOTEURS: Promoteur[] = [
  { id: "pr-bayt", nom: "Bayt Tanja Immobilier", anneeCreation: 2004, projetsLivres: 23, tfRemisATemps: 91, whatsapp: null, siteWeb: null, scoreFiabilite: 8.6 },
  { id: "pr-riviera", nom: "Riviera Détroit", anneeCreation: 2011, projetsLivres: 9, tfRemisATemps: 78, whatsapp: null, siteWeb: null, scoreFiabilite: 7.4 },
  { id: "pr-atlas", nom: "Atlas Habitat Nord", anneeCreation: 1998, projetsLivres: 41, tfRemisATemps: 95, whatsapp: null, siteWeb: null, scoreFiabilite: 9.1 },
  { id: "pr-corniche", nom: "Corniche Développement", anneeCreation: 2016, projetsLivres: 4, tfRemisATemps: 50, whatsapp: null, siteWeb: null, scoreFiabilite: 6.2 },
  { id: "pr-rif", nom: "Rif Promotion", anneeCreation: 2019, projetsLivres: 1, tfRemisATemps: null, whatsapp: null, siteWeb: null, scoreFiabilite: null },
];

type ProgrammeDemo = Omit<Programme, "photos" | "exemple" | "misAJourLe">;

const PROGRAMMES: ProgrammeDemo[] = [
  {
    id: "al-bahr", promoteurId: "pr-bayt", nom: "Résidence Al Bahr", quartier: "Boukhalef", adresse: "Route de l'aéroport",
    lat: 35.7352, lng: -5.8862, livraisonPrevue: "2027-06-30", livre: false, avancementChantier: 65,
    statutTf: "tf_mere", numeroTf: "12345/06", conservationFonciere: "Tanger", confianceTf: "verifie", dateVerificationTf: "2026-09-28",
    sourceTf: "Certificat de propriété", eligibleDispositif: true, confianceAide: "verifie", autorisationConstruire: "verifie", garantieAchevement: "declaratif",
    description: "Résidence fermée de 4 étages avec piscine, à 10 minutes de la plage de Sidi Kacem.",
  },
  {
    id: "jardins-achakar", promoteurId: "pr-atlas", nom: "Les Jardins d'Achakar", quartier: "Achakar", adresse: "Route de Cap Spartel",
    lat: 35.7641, lng: -5.9318, livraisonPrevue: null, livre: true, avancementChantier: 100,
    statutTf: "tf_individuel", numeroTf: "23456/06", conservationFonciere: "Tanger", confianceTf: "verifie", dateVerificationTf: "2026-09-15",
    sourceTf: "Certificat de propriété", eligibleDispositif: true, confianceAide: "verifie", autorisationConstruire: "verifie", garantieAchevement: "verifie",
    description: "Petite résidence livrée, jardins paysagers, proche des grottes d'Hercule.",
  },
  {
    id: "corniche-malabata", promoteurId: "pr-riviera", nom: "Corniche Malabata", quartier: "Malabata", adresse: "Avenue Mohammed VI",
    lat: 35.7801, lng: -5.7779, livraisonPrevue: "2027-12-31", livre: false, avancementChantier: 40,
    statutTf: "tf_mere", numeroTf: "34567/06", conservationFonciere: "Tanger", confianceTf: "verifie", dateVerificationTf: "2026-08-20",
    sourceTf: "Certificat de propriété", eligibleDispositif: false, confianceAide: "verifie", autorisationConstruire: "verifie", garantieAchevement: "verifie",
    description: "Front de mer, vue dégagée sur la baie et le détroit. Standing élevé.",
  },
  {
    id: "terrasses-marshan", promoteurId: "pr-atlas", nom: "Les Terrasses du Marshan", quartier: "Marshan", adresse: "Rue de la Kasbah",
    lat: 35.7889, lng: -5.8176, livraisonPrevue: "2027-03-31", livre: false, avancementChantier: 80,
    statutTf: "tf_mere", numeroTf: "45678/06", conservationFonciere: "Tanger", confianceTf: "verifie", dateVerificationTf: "2026-07-30",
    sourceTf: "Certificat de propriété", eligibleDispositif: true, confianceAide: "declaratif", autorisationConstruire: "verifie", garantieAchevement: "verifie",
    description: "Quartier historique et calme, terrasses avec vue partielle sur le détroit.",
  },
  {
    id: "patio-iberia", promoteurId: "pr-bayt", nom: "Le Patio d'Iberia", quartier: "Iberia", adresse: "Boulevard Mohammed V",
    lat: 35.7776, lng: -5.8238, livraisonPrevue: null, livre: true, avancementChantier: 100,
    statutTf: "tf_individuel", numeroTf: "56789/06", conservationFonciere: "Tanger", confianceTf: "verifie", dateVerificationTf: "2026-09-02",
    sourceTf: "Certificat de propriété", eligibleDispositif: true, confianceAide: "verifie", autorisationConstruire: "verifie", garantieAchevement: "verifie",
    description: "En centre-ville, à pied des commerces, de la clinique et du boulevard.",
  },
  {
    id: "residence-mesnana", promoteurId: "pr-corniche", nom: "Résidence Mesnana Parc", quartier: "Mesnana", adresse: "Route de Rabat",
    lat: 35.7469, lng: -5.8441, livraisonPrevue: "2027-09-30", livre: false, avancementChantier: 30,
    statutTf: "tf_mere", numeroTf: "67890/06", conservationFonciere: "Tanger", confianceTf: "verifie", dateVerificationTf: "2026-05-10",
    sourceTf: "Certificat de propriété", eligibleDispositif: true, confianceAide: "verifie", autorisationConstruire: "declaratif", garantieAchevement: "inconnu",
    description: "Grand parc arboré, écoles et hôpital à proximité. Vérification foncière à renouveler.",
  },
  {
    id: "tanja-balia-view", promoteurId: "pr-riviera", nom: "Tanja Balia View", quartier: "Tanja Balia", adresse: "Route de Malabata",
    lat: 35.7562, lng: -5.7688, livraisonPrevue: "2028-03-31", livre: false, avancementChantier: 15,
    statutTf: "en_cours", numeroTf: null, conservationFonciere: "Tanger", confianceTf: "declaratif", dateVerificationTf: null,
    sourceTf: "Déclaration du promoteur", eligibleDispositif: true, confianceAide: "declaratif", autorisationConstruire: "declaratif", garantieAchevement: "inconnu",
    description: "Programme sur plan, immatriculation du terrain annoncée en cours.",
  },
  {
    id: "cap-spartel-hills", promoteurId: "pr-rif", nom: "Cap Spartel Hills", quartier: "Cap Spartel", adresse: "Route du phare",
    lat: 35.7889, lng: -5.9182, livraisonPrevue: "2028-06-30", livre: false, avancementChantier: 5,
    statutTf: "non_communique", numeroTf: null, conservationFonciere: null, confianceTf: "inconnu", dateVerificationTf: null,
    sourceTf: null, eligibleDispositif: false, confianceAide: "inconnu", autorisationConstruire: "inconnu", garantieAchevement: "inconnu",
    description: "Annonce sans information foncière : exemple de bien masqué par le filtre de sécurité.",
  },
  {
    id: "val-fleuri", promoteurId: "pr-atlas", nom: "Résidence Val Fleuri", quartier: "Val Fleuri", adresse: "Rue Ibn Khaldoun",
    lat: 35.7668, lng: -5.8161, livraisonPrevue: "2027-02-28", livre: false, avancementChantier: 85,
    statutTf: "tf_mere", numeroTf: "78901/06", conservationFonciere: "Tanger", confianceTf: "verifie", dateVerificationTf: "2026-09-25",
    sourceTf: "Certificat de propriété", eligibleDispositif: true, confianceAide: "verifie", autorisationConstruire: "verifie", garantieAchevement: "verifie",
    description: "Quartier résidentiel calme, pharmacies et marché à pied, ascenseurs dans chaque bloc.",
  },
  {
    id: "branes-horizon", promoteurId: "pr-bayt", nom: "Branes Horizon", quartier: "Branes", adresse: "Avenue Moulay Rachid",
    lat: 35.7612, lng: -5.8379, livraisonPrevue: "2027-11-30", livre: false, avancementChantier: 50,
    statutTf: "tf_mere", numeroTf: "89012/06", conservationFonciere: "Tanger", confianceTf: "verifie", dateVerificationTf: "2026-09-10",
    sourceTf: "Certificat de propriété", eligibleDispositif: true, confianceAide: "verifie", autorisationConstruire: "verifie", garantieAchevement: "declaratif",
    description: "Sur les hauteurs, vue dégagée sur la ville, prix maîtrisés.",
  },
];

/** [prixTtc, surface, chambres, etage, vueMer, parking] : l'ascenseur est présent dès le 1er étage. */
type LotCourt = [number, number, number, number, VueMer, boolean];

const LOTS: Record<string, LotCourt[]> = {
  "al-bahr": [[540_000, 68, 2, 1, "aucune", false], [640_000, 82, 2, 3, "partielle", true], [695_000, 90, 3, 2, "partielle", true]],
  "jardins-achakar": [[690_000, 92, 2, 0, "aucune", true], [760_000, 105, 3, 1, "partielle", true]],
  "corniche-malabata": [[1_150_000, 95, 2, 4, "degagee", true], [1_480_000, 120, 3, 6, "degagee", true]],
  "terrasses-marshan": [[655_000, 78, 2, 2, "partielle", false], [820_000, 96, 3, 3, "degagee", true]],
  "patio-iberia": [[610_000, 75, 2, 1, "aucune", false], [700_000, 88, 2, 4, "aucune", true]],
  "residence-mesnana": [[480_000, 70, 2, 1, "aucune", true], [560_000, 85, 3, 2, "aucune", true]],
  "tanja-balia-view": [[590_000, 80, 2, 2, "partielle", true]],
  "cap-spartel-hills": [[650_000, 90, 2, 1, "degagee", true]],
  "val-fleuri": [[575_000, 76, 2, 2, "aucune", true], [668_000, 94, 3, 5, "aucune", true]],
  "branes-horizon": [[520_000, 72, 2, 3, "aucune", false], [615_000, 86, 2, 6, "partielle", true]],
};

export function catalogueDemo(maintenant = new Date()): Catalogue {
  const misAJourLe = maintenant.toISOString();
  const programmes: Programme[] = PROGRAMMES.map((p) => ({ ...p, photos: [], exemple: true, misAJourLe }));
  const lots: Lot[] = Object.entries(LOTS).flatMap(([programmeId, liste]) =>
    liste.map(([prixTtc, surface, chambres, etage, vueMer, parking], i) => ({
      id: `${programmeId}-${i + 1}`,
      programmeId,
      prixTtc,
      surface,
      chambres,
      etage,
      ascenseur: etage > 0,
      vueMer,
      parking,
      disponible: true,
      misAJourLe,
    })),
  );
  return {
    mode: "demo",
    promoteurs: PROMOTEURS,
    programmes,
    lots,
    regle: REGLE_AIDE_LANCEMENT,
    taux: { EUR: 10.8, USD: 9.9, CAD: 7.2, date: misAJourLe.slice(0, 10), source: "valeurs par défaut" },
    genereLe: misAJourLe,
  };
}
