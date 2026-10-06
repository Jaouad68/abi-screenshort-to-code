"use client";

import { useSyncExternalStore } from "react";
import { PROFIL_VIDE, type Devise, type ProfilAcheteur } from "@/lib/domain";
import { CRITERES_DEFAUT, type Criteres } from "@/lib/filtres";

/**
 * Préférences personnelles, gardées sur l'appareil (localStorage) :
 * critères de recherche, réponses d'éligibilité, favoris, comparaison, devise.
 */

export interface Prefs {
  criteres: Criteres;
  profil: ProfilAcheteur;
  favoris: string[];
  /** Identifiants de lots à comparer (3 au maximum). */
  comparaison: string[];
  devise: Devise;
}

export const MAX_COMPARAISON = 3;
const CLE = "dar-tanja:prefs:v1";
const DEFAUT: Prefs = { criteres: CRITERES_DEFAUT, profil: PROFIL_VIDE, favoris: [], comparaison: [], devise: "EUR" };

let etat: Prefs | null = null;
const abonnes = new Set<() => void>();

function lire(): Prefs {
  if (etat) return etat;
  try {
    const brut = window.localStorage.getItem(CLE);
    const parse = brut ? (JSON.parse(brut) as Partial<Prefs>) : {};
    etat = {
      ...DEFAUT,
      ...parse,
      criteres: { ...CRITERES_DEFAUT, ...parse.criteres },
      profil: { ...PROFIL_VIDE, ...parse.profil },
    };
  } catch {
    etat = DEFAUT;
  }
  return etat;
}

export function majPrefs(maj: (p: Prefs) => Prefs) {
  etat = maj(lire());
  try {
    window.localStorage.setItem(CLE, JSON.stringify(etat));
  } catch {
    // Stockage indisponible (navigation privée) : les préférences restent en mémoire.
  }
  for (const f of abonnes) f();
}

function abonner(f: () => void) {
  abonnes.add(f);
  const surStockage = (e: StorageEvent) => {
    if (e.key === CLE) {
      etat = null;
      f();
    }
  };
  window.addEventListener("storage", surStockage);
  return () => {
    abonnes.delete(f);
    window.removeEventListener("storage", surStockage);
  };
}

export function usePrefs(): Prefs {
  return useSyncExternalStore(abonner, lire, () => DEFAUT);
}

export const basculer = (liste: string[], id: string) => (liste.includes(id) ? liste.filter((x) => x !== id) : [...liste, id]);
