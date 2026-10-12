import { parseCsv, toCsv } from "@/lib/csv";
import type { Periodicite } from "@/generated/prisma/client";

/**
 * Import CSV clients / équipements / contrats — une ligne du fichier peut
 * décrire un client seul, ou un client avec son équipement et son contrat
 * en une fois (colonnes optionnelles). Tolérant aux variantes d'en-têtes
 * (accents, casse, espaces) les plus courantes vues dans des exports Excel.
 */

export const CHAMPS_CANONIQUES = [
  "nom",
  "adresse",
  "codePostal",
  "ville",
  "telephone",
  "email",
  "notes",
  "equipementType",
  "equipementMarque",
  "equipementModele",
  "equipementNumeroSerie",
  "equipementLocalisation",
  "contratType",
  "contratPeriodicite",
  "contratMontant",
  "contratDateDebut",
  "contratDateEcheance",
] as const;

export type ChampCanonique = (typeof CHAMPS_CANONIQUES)[number];

const ALIAS: Record<ChampCanonique, string[]> = {
  nom: ["nom", "client", "nomclient", "raisonsociale", "nomduclient"],
  adresse: ["adresse", "adresseclient", "rue"],
  codePostal: ["codepostal", "cp"],
  ville: ["ville"],
  telephone: ["telephone", "tel", "portable", "mobile", "numerodetelephone"],
  email: ["email", "mail", "courriel", "adressemail"],
  notes: ["notes", "commentaire", "commentaires", "remarque", "remarques"],
  equipementType: ["equipement", "typeequipement", "materiel", "typemateriel"],
  equipementMarque: ["marque"],
  equipementModele: ["modele"],
  equipementNumeroSerie: ["numeroserie", "nserie", "ns", "numserie"],
  equipementLocalisation: ["localisation", "emplacement"],
  contratType: ["typecontrat", "contrat", "typedecontrat"],
  contratPeriodicite: ["periodicite", "frequence"],
  contratMontant: ["montant", "montantcontrat", "prix", "montantannuel"],
  contratDateDebut: ["datedebut", "debut", "datedecontrat", "datededebut"],
  contratDateEcheance: [
    "dateecheance",
    "datedecheance",
    "echeance",
    "dateexpiration",
    "expiration",
    "dateanniversaire",
  ],
};

function normaliser(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function trouverChamp(entete: string): ChampCanonique | null {
  const n = normaliser(entete);
  for (const champ of CHAMPS_CANONIQUES) {
    if (ALIAS[champ].includes(n)) return champ;
  }
  return null;
}

export type LigneImport = {
  index: number;
  valeurs: Partial<Record<ChampCanonique, string>>;
  erreurs: string[];
  /** Clé de rapprochement pour repérer les doublons dans le fichier lui-même
   * (email si présent, sinon nom+téléphone). */
  cleDoublon: string;
};

export type ResultatParseCsv = {
  lignes: LigneImport[];
  entetesInconnues: string[];
};

export function cleDoublonPour(nom: string, email: string, telephone: string): string {
  const e = email.trim().toLowerCase();
  if (e) return `email:${e}`;
  const t = telephone.replace(/\D/g, "");
  return `nomtel:${normaliser(nom)}|${t}`;
}

export function parseClientsCsv(text: string): ResultatParseCsv {
  const table = parseCsv(text);
  if (table.length === 0) return { lignes: [], entetesInconnues: [] };

  const [entetes, ...corps] = table;
  const mapping: (ChampCanonique | null)[] = entetes.map(trouverChamp);
  const entetesInconnues = entetes.filter((_, i) => mapping[i] === null && entetes[i].trim() !== "");

  const lignes: LigneImport[] = corps.map((cells, i) => {
    const valeurs: Partial<Record<ChampCanonique, string>> = {};
    mapping.forEach((champ, col) => {
      if (champ && cells[col] !== undefined) {
        const v = cells[col].trim();
        if (v !== "") valeurs[champ] = v;
      }
    });

    const erreurs: string[] = [];
    if (!valeurs.nom) erreurs.push("Nom du client manquant.");
    if (valeurs.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valeurs.email)) {
      erreurs.push("E-mail invalide.");
    }
    if (valeurs.contratMontant && Number.isNaN(Number(valeurs.contratMontant.replace(",", ".")))) {
      erreurs.push("Montant du contrat invalide.");
    }
    if (valeurs.contratDateEcheance && !parseDateFlexible(valeurs.contratDateEcheance)) {
      erreurs.push("Date d'échéance illisible (attendu jj/mm/aaaa).");
    }
    if (valeurs.contratDateDebut && !parseDateFlexible(valeurs.contratDateDebut)) {
      erreurs.push("Date de début illisible (attendu jj/mm/aaaa).");
    }

    return {
      index: i,
      valeurs,
      erreurs,
      cleDoublon: cleDoublonPour(valeurs.nom ?? "", valeurs.email ?? "", valeurs.telephone ?? ""),
    };
  });

  return { lignes, entetesInconnues };
}

/** Accepte "jj/mm/aaaa", "jj-mm-aaaa" ou "aaaa-mm-jj". */
export function parseDateFlexible(s: string): Date | null {
  const v = s.trim();
  let m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(v);
  if (m) {
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), 12, 0, 0);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

const PERIODICITE_PAR_LABEL: Record<string, Periodicite> = {
  mensuelle: "MENSUELLE",
  mensuel: "MENSUELLE",
  trimestrielle: "TRIMESTRIELLE",
  trimestriel: "TRIMESTRIELLE",
  semestrielle: "SEMESTRIELLE",
  semestriel: "SEMESTRIELLE",
  annuelle: "ANNUELLE",
  annuel: "ANNUELLE",
  biennale: "BIENNALE",
  biennal: "BIENNALE",
  autre: "AUTRE",
};

/** Reconnaît une périodicité en texte libre ; retombe sur ANNUELLE si le
 * texte n'est pas reconnu (import volontairement tolérant). */
export function parsePeriodicite(s: string | undefined): Periodicite {
  if (!s) return "ANNUELLE";
  return PERIODICITE_PAR_LABEL[normaliser(s)] ?? "ANNUELLE";
}

/** Modèle de fichier CSV téléchargeable depuis la page d'import. */
export function modeleCsv(): string {
  return toCsv([
    [
      "Nom",
      "Adresse",
      "Code postal",
      "Ville",
      "Téléphone",
      "Email",
      "Équipement",
      "Marque",
      "Modèle",
      "N° série",
      "Type de contrat",
      "Périodicité",
      "Montant",
      "Date de début",
      "Date d'échéance",
      "Notes",
    ],
    [
      "Dupont Jean",
      "12 rue des Lilas",
      "75012",
      "Paris",
      "0601020304",
      "jean.dupont@email.fr",
      "Chaudière gaz",
      "Chappée",
      "Serelia",
      "SN123456",
      "Entretien annuel chaudière",
      "Annuelle",
      "150,00",
      "01/03/2025",
      "01/03/2026",
      "Digicode 1234",
    ],
  ]);
}
