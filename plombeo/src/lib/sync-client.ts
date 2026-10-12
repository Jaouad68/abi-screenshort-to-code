"use client";

import {
  aEnvoyer,
  appliquerResultat,
  dedupliquer,
  marquerEchecReseau,
  resumeFile,
  type MutationLocale,
} from "@/lib/file-sync";

/**
 * STOCKAGE ET ENVOI DE LA FILE HORS-LIGNE.
 *
 * IndexedDB en accès direct, sans dépendance : le besoin se limite à un magasin
 * clé/valeur sur un seul objet. Dexie aurait été justifié pour un cache de
 * données métier complet (Phase 12) ; ici il n'apporterait qu'un paquet de plus.
 *
 * localStorage a été écarté : il est synchrone (il bloque le fil principal) et
 * plafonné à quelques mégaoctets.
 */

const BASE = "plombeo-sync";
const MAGASIN = "mutations";

function ouvrirBase(): Promise<IDBDatabase> {
  return new Promise((resoudre, rejeter) => {
    const requete = indexedDB.open(BASE, 1);
    requete.onupgradeneeded = () => {
      const db = requete.result;
      if (!db.objectStoreNames.contains(MAGASIN)) {
        db.createObjectStore(MAGASIN, { keyPath: "clientMutationId" });
      }
    };
    requete.onsuccess = () => resoudre(requete.result);
    requete.onerror = () => rejeter(requete.error);
  });
}

async function transaction<T>(
  mode: IDBTransactionMode,
  operation: (magasin: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await ouvrirBase();
  return new Promise((resoudre, rejeter) => {
    const tx = db.transaction(MAGASIN, mode);
    const requete = operation(tx.objectStore(MAGASIN));
    requete.onsuccess = () => resoudre(requete.result);
    requete.onerror = () => rejeter(requete.error);
    tx.oncomplete = () => db.close();
  });
}

export async function lireFile(): Promise<MutationLocale[]> {
  const tout = await transaction<MutationLocale[]>("readonly", (m) => m.getAll());
  return dedupliquer(tout);
}

/**
 * Enregistre une saisie.
 *
 * L'écriture locale précède TOUJOURS l'envoi : c'est ce qui garantit qu'une
 * saisie faite en cave existe avant même de savoir si le réseau répondra.
 */
export async function enregistrerMutation(
  mutation: Omit<MutationLocale, "etat" | "tentatives" | "creeLe">,
): Promise<void> {
  const complete: MutationLocale = {
    ...mutation,
    etat: "LOCAL",
    tentatives: 0,
    creeLe: Date.now(),
  };
  await transaction("readwrite", (m) => m.put(complete));
}

async function ecrire(mutations: readonly MutationLocale[]): Promise<void> {
  for (const mutation of mutations) {
    await transaction("readwrite", (m) => m.put(mutation));
  }
}

async function supprimer(identifiants: readonly string[]): Promise<void> {
  for (const id of identifiants) {
    await transaction("readwrite", (m) => m.delete(id));
  }
}

/**
 * Tente d'envoyer la file. Sûre à rappeler : le serveur est idempotent.
 *
 * Retourne le résumé à afficher.
 */
export async function synchroniser(): Promise<{
  enAttente: number;
  enEchec: number;
  /** Nombre de mutations réellement acceptées par le serveur lors de cet envoi. */
  appliquees: number;
}> {
  const file = await lireFile();
  const lot = aEnvoyer(file);
  if (lot.length === 0) return { ...resumeFile(file), appliquees: 0 };

  const corps = {
    mutations: lot.map((m) => ({
      type: m.type,
      clientMutationId: m.clientMutationId,
      interventionId: m.interventionId,
      ...m.charge,
    })),
  };

  let resultats: { clientMutationId: string; etat: "applique" | "refuse"; motif?: string }[] = [];

  try {
    const reponse = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corps),
    });
    if (!reponse.ok) throw new Error(`statut ${reponse.status}`);
    resultats = (await reponse.json()).resultats ?? [];
  } catch {
    // Réseau indisponible ou serveur en erreur : rien n'est perdu, la file
    // conserve tout et l'on réessaiera.
    await ecrire(lot.map(marquerEchecReseau));
    return { ...resumeFile(await lireFile()), appliquees: 0 };
  }

  const parId = new Map(resultats.map((r) => [r.clientMutationId, r]));
  const misesAJour = lot.map((m) => appliquerResultat(m, parId.get(m.clientMutationId)));
  await ecrire(misesAJour);

  // Les mutations acceptées quittent la file : les garder la ferait grossir
  // indéfiniment sur un appareil utilisé tous les jours.
  const synchronisees = misesAJour.filter((m) => m.etat === "SYNCHRONISE");
  await supprimer(synchronisees.map((m) => m.clientMutationId));

  // On relit la file plutôt que de recomposer l'état en mémoire : c'est le
  // stockage qui fait foi, et une recomposition serait une source d'écart
  // silencieux.
  return { ...resumeFile(await lireFile()), appliquees: synchronisees.length };
}

/** UUID v4 disponible dans tous les navigateurs cibles (Chrome/Safari récents). */
export function nouvelIdentifiant(): string {
  return crypto.randomUUID();
}
