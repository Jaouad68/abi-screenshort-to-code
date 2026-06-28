// File d'attente locale (IndexedDB) pour les relevés saisis hors-ligne.
// Objectif §6 du cahier des charges : ne JAMAIS perdre une saisie même avec un
// réseau instable. Les saisies sont rejouées vers /api/releves à la reconnexion.

export type QueuedReleve = {
  id: string; // identifiant local (uuid)
  equipementId: string;
  equipementNom: string;
  valeur: number;
  commentaire?: string;
  saisiAt: string; // ISO — heure de saisie déclarée
};

const DB_NAME = "resto-pilot-haccp";
const STORE = "releves-queue";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const req = fn(transaction.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
  );
}

export async function enqueueReleve(item: QueuedReleve): Promise<void> {
  await tx("readwrite", (s) => s.put(item));
}

export async function getQueue(): Promise<QueuedReleve[]> {
  return (await tx<QueuedReleve[]>("readonly", (s) => s.getAll())) ?? [];
}

export async function removeFromQueue(id: string): Promise<void> {
  await tx("readwrite", (s) => s.delete(id));
}

export async function queueCount(): Promise<number> {
  return (await tx<number>("readonly", (s) => s.count())) ?? 0;
}

/**
 * Tente d'envoyer toutes les saisies en attente. Retourne le nombre synchronisé.
 * Une saisie reste en file tant que le serveur ne l'a pas acceptée.
 */
export async function flushQueue(): Promise<number> {
  const items = await getQueue();
  let synced = 0;
  for (const item of items) {
    try {
      const res = await fetch("/api/releves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equipementId: item.equipementId,
          valeur: item.valeur,
          commentaire: item.commentaire ?? "",
          saisiAt: item.saisiAt,
          horsLigne: true,
        }),
      });
      if (res.ok) {
        await removeFromQueue(item.id);
        synced++;
      } else if (res.status === 404 || res.status === 400) {
        // Donnée définitivement invalide (équipement supprimé) : on retire pour
        // ne pas bloquer la file. Les autres cas (réseau/401) restent en attente.
        await removeFromQueue(item.id);
      }
    } catch {
      // hors-ligne / erreur réseau : on garde l'item pour réessayer plus tard.
      break;
    }
  }
  return synced;
}
