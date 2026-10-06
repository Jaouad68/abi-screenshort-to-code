/**
 * Modèle de données de Dar Tanja, partagé entre le serveur et le navigateur.
 * Les noms reprennent ceux des tables Supabase (voir supabase/schema.sql).
 */

/** Statut juridique du terrain d'un programme. */
export type StatutTf = "tf_individuel" | "tf_mere" | "en_cours" | "non_communique";

/** Niveau de preuve d'une information. */
export type Confiance = "verifie" | "declaratif" | "inconnu";

export type VueMer = "aucune" | "partielle" | "degagee";

export interface Promoteur {
  id: string;
  nom: string;
  anneeCreation: number | null;
  projetsLivres: number;
  /** Part des projets livrés dont les titres individuels ont été remis à temps (0 à 100). */
  tfRemisATemps: number | null;
  whatsapp: string | null;
  siteWeb: string | null;
  /** Note sur 10, saisie par l'administrateur au MVP. */
  scoreFiabilite: number | null;
}

export interface Programme {
  id: string;
  promoteurId: string;
  nom: string;
  quartier: string;
  adresse: string;
  lat: number;
  lng: number;
  /** AAAA-MM-JJ, ou null si déjà livré. */
  livraisonPrevue: string | null;
  livre: boolean;
  avancementChantier: number;
  statutTf: StatutTf;
  numeroTf: string | null;
  conservationFonciere: string | null;
  confianceTf: Confiance;
  /** Date du dernier contrôle d'un justificatif foncier (AAAA-MM-JJ). */
  dateVerificationTf: string | null;
  sourceTf: string | null;
  /** Le promoteur indique que le programme relève du dispositif d'aide. */
  eligibleDispositif: boolean;
  confianceAide: Confiance;
  autorisationConstruire: Confiance;
  garantieAchevement: Confiance;
  photos: string[];
  description: string;
  /** Données fictives de démonstration. */
  exemple: boolean;
  misAJourLe: string;
}

export interface Lot {
  id: string;
  programmeId: string;
  prixTtc: number;
  surface: number;
  chambres: number;
  etage: number;
  ascenseur: boolean;
  vueMer: VueMer;
  parking: boolean;
  disponible: boolean;
  misAJourLe: string;
}

export interface TrancheAide {
  /** Prix TTC maximal inclus pour cette tranche, en MAD. */
  prixMax: number;
  aide: number;
}

/** Barème de l'aide de l'État, modifiable sans republier l'app. */
export interface RegleAide {
  version: string;
  dateEffet: string;
  /** Dernier jour pour bénéficier du programme (AAAA-MM-JJ), ou null si inconnu. */
  dateFin: string | null;
  tranches: TrancheAide[];
  lienOfficiel: string;
  verifieLe: string;
}

export interface Catalogue {
  mode: "supabase" | "demo";
  promoteurs: Promoteur[];
  programmes: Programme[];
  lots: Lot[];
  regle: RegleAide;
  /** Combien de dirhams pour une unité de chaque devise. */
  taux: { EUR: number; USD: number; CAD: number; date: string; source: string };
  genereLe: string;
}

/** Réponses au questionnaire d'éligibilité. null = pas encore répondu. */
export interface ProfilAcheteur {
  mre: boolean | null;
  possedeBienAuMaroc: boolean | null;
  aideDejaPercue: boolean | null;
  heritageEnCours: boolean | null;
}

export const PROFIL_VIDE: ProfilAcheteur = {
  mre: null,
  possedeBienAuMaroc: null,
  aideDejaPercue: null,
  heritageEnCours: null,
};

export type Devise = "EUR" | "USD" | "CAD";
