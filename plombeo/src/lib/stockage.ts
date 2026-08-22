import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * STOCKAGE DE FICHIERS (Phase 6).
 *
 * Deux implémentations, et **aucune implémentation « Null »** : un adaptateur
 * qui accepterait un fichier sans le conserver serait pire que l'absence de
 * fonctionnalité — l'artisan croirait ses preuves de chantier enregistrées.
 * Sans stockage configuré, l'envoi est REFUSÉ avec un message clair (§76).
 *
 *  - `disque`  : écrit réellement les fichiers. Développement, ou tout
 *                hébergement doté d'un disque persistant.
 *  - `s3`      : objet compatible S3, pour l'hébergement sans état. Activé par
 *                configuration ; non implémenté tant qu'aucun fournisseur n'est
 *                retenu — la fonction échoue explicitement plutôt que de
 *                prétendre stocker.
 *
 * Les fichiers ne sont JAMAIS servis directement : ils passent par une route
 * qui vérifie session, organisation et permission (voir /api/documents/[id]).
 * Aucun bucket public (§46).
 */

export type ResultatStockage = { ok: true; chemin: string } | { ok: false; erreur: string };

/** Types acceptés. Liste blanche stricte : tout le reste est refusé. */
const TYPES_AUTORISES = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/heic", "heic"],
  ["application/pdf", "pdf"],
]);

/** 10 Mo. Une photo de téléphone dépasse rarement 5 Mo. */
export const TAILLE_MAX_OCTETS = 10 * 1024 * 1024;

/**
 * Détecte le type réel à partir des PREMIERS OCTETS.
 *
 * Ni l'extension ni l'en-tête `Content-Type` déclaré ne sont dignes de
 * confiance : ils viennent du client. Un exécutable renommé en `.jpg`
 * passerait tous les contrôles déclaratifs.
 */
export function detecterTypeReel(octets: Uint8Array): string | null {
  const a = (i: number) => octets[i];

  // JPEG : FF D8 FF
  if (a(0) === 0xff && a(1) === 0xd8 && a(2) === 0xff) return "image/jpeg";

  // PNG : 89 50 4E 47 0D 0A 1A 0A
  if (
    a(0) === 0x89 && a(1) === 0x50 && a(2) === 0x4e && a(3) === 0x47 &&
    a(4) === 0x0d && a(5) === 0x0a && a(6) === 0x1a && a(7) === 0x0a
  ) {
    return "image/png";
  }

  // PDF : %PDF
  if (a(0) === 0x25 && a(1) === 0x50 && a(2) === 0x44 && a(3) === 0x46) {
    return "application/pdf";
  }

  // Conteneur ISO-BMFF (RIFF/WEBP et HEIC) : « ftyp » ou « WEBP » en position 8.
  const marque = new TextDecoder("latin1").decode(octets.slice(0, 16));
  if (marque.startsWith("RIFF") && marque.includes("WEBP")) return "image/webp";
  if (marque.slice(4, 8) === "ftyp" && /hei[cf]|mif1|msf1/.test(marque.slice(8, 16))) {
    return "image/heic";
  }

  return null;
}

export function typeAutorise(mimeType: string): boolean {
  return TYPES_AUTORISES.has(mimeType);
}

export function extensionPour(mimeType: string): string {
  return TYPES_AUTORISES.get(mimeType) ?? "bin";
}

/**
 * Produit une clé de stockage.
 *
 * Construite UNIQUEMENT à partir de l'organisation et d'octets aléatoires :
 * aucune donnée fournie par le client n'y entre, ce qui rend toute traversée
 * de répertoire impossible par construction plutôt que par filtrage.
 */
export function genererChemin(organizationId: string, mimeType: string): string {
  const aleatoire = randomBytes(16).toString("hex");
  return `${organizationId}/${aleatoire}.${extensionPour(mimeType)}`;
}

/* -------------------------------------------------------------------------- */
/* Implémentations                                                            */
/* -------------------------------------------------------------------------- */

type Fournisseur = "disque" | "s3" | "aucun";

function fournisseur(): Fournisseur {
  if (process.env["STOCKAGE_S3_BUCKET"]) return "s3";
  if (process.env["STOCKAGE_DISQUE_RACINE"]) return "disque";
  return "aucun";
}

/** Message affiché quand aucun stockage n'est configuré. Jamais de silence. */
export const STOCKAGE_NON_CONFIGURE =
  "Aucun espace de stockage n'est configuré : les fichiers ne peuvent pas être conservés. " +
  "Renseignez STOCKAGE_DISQUE_RACINE ou STOCKAGE_S3_BUCKET.";

export function stockageDisponible(): boolean {
  return fournisseur() !== "aucun";
}

function racineDisque(): string {
  return process.env["STOCKAGE_DISQUE_RACINE"] ?? "";
}

/** Chemin absolu, vérifié comme restant sous la racine. */
function cheminAbsolu(cle: string): string {
  const racine = path.resolve(racineDisque());
  const absolu = path.resolve(racine, cle);
  // Ceinture et bretelles : la clé est déjà générée par le serveur, mais on
  // refuse tout ce qui sortirait de la racine.
  if (!absolu.startsWith(racine + path.sep)) {
    throw new Error("Chemin de stockage hors racine");
  }
  return absolu;
}

export async function ecrire(cle: string, contenu: Uint8Array): Promise<ResultatStockage> {
  switch (fournisseur()) {
    case "disque": {
      const absolu = cheminAbsolu(cle);
      await mkdir(path.dirname(absolu), { recursive: true });
      await writeFile(absolu, contenu);
      return { ok: true, chemin: cle };
    }
    case "s3":
      // Volontairement non implémenté : aucun fournisseur objet n'est retenu à
      // ce stade (décision d'architecture n°2). Échouer explicitement vaut
      // mieux que prétendre stocker.
      return {
        ok: false,
        erreur:
          "Le stockage objet S3 est déclaré mais pas encore implémenté. " +
          "Utilisez STOCKAGE_DISQUE_RACINE en attendant.",
      };
    default:
      return { ok: false, erreur: STOCKAGE_NON_CONFIGURE };
  }
}

export async function lire(cle: string): Promise<Uint8Array | null> {
  if (fournisseur() !== "disque") return null;
  try {
    return new Uint8Array(await readFile(cheminAbsolu(cle)));
  } catch {
    return null;
  }
}

export async function supprimer(cle: string): Promise<void> {
  if (fournisseur() !== "disque") return;
  try {
    await unlink(cheminAbsolu(cle));
  } catch {
    // Un fichier déjà absent n'est pas une erreur : l'entrée en base doit
    // pouvoir disparaître même si le fichier a été perdu.
  }
}

/* -------------------------------------------------------------------------- */
/* Validation d'un envoi                                                      */
/* -------------------------------------------------------------------------- */

export type Validation =
  | { ok: true; mimeType: string; octets: Uint8Array }
  | { ok: false; erreur: string };

/** Contrôle complet d'un fichier reçu, avant toute écriture. */
export async function validerFichier(fichier: File): Promise<Validation> {
  if (fichier.size === 0) return { ok: false, erreur: "Le fichier est vide." };

  if (fichier.size > TAILLE_MAX_OCTETS) {
    return {
      ok: false,
      erreur: `Le fichier dépasse ${Math.round(TAILLE_MAX_OCTETS / 1024 / 1024)} Mo.`,
    };
  }

  const octets = new Uint8Array(await fichier.arrayBuffer());
  const typeReel = detecterTypeReel(octets);

  if (!typeReel || !typeAutorise(typeReel)) {
    return {
      ok: false,
      erreur: "Ce type de fichier n'est pas accepté. Envoyez une image (JPEG, PNG, WebP, HEIC) ou un PDF.",
    };
  }

  return { ok: true, mimeType: typeReel, octets };
}
