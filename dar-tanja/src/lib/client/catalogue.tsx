"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Catalogue } from "@/lib/domain";
import { aujourdHuiTanger } from "@/lib/format";

/**
 * Catalogue en mémoire, tenu à jour en temps réel : Supabase Realtime signale
 * chaque modification de programme, de lot ou de barème, et le catalogue est
 * rechargé. Un rafraîchissement périodique sert de filet de sécurité.
 */

export type EtatDirect = "connexion" | "direct" | "hors_ligne";

interface ContexteCatalogue {
  catalogue: Catalogue;
  direct: EtatDirect;
  erreur: boolean;
  rafraichi: Date;
  /** Date du jour à Tanger, tirée du catalogue pour être identique côté serveur et navigateur. */
  aujourdHui: string;
}

const Ctx = createContext<ContexteCatalogue | null>(null);

const SECOURS_MS = 5 * 60_000;
const DEMO_MS = 60_000;

let client: SupabaseClient | null | undefined;
function supabaseNavigateur(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cle = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  client = url && cle ? createClient(url, cle, { auth: { persistSession: false } }) : null;
  return client;
}

export function CatalogueProvider({ initial, children }: { initial: Catalogue; children: React.ReactNode }) {
  const [catalogue, setCatalogue] = useState(initial);
  const [rafraichi, setRafraichi] = useState(() => new Date(initial.genereLe));
  const [erreur, setErreur] = useState(false);
  const [direct, setDirect] = useState<EtatDirect>("connexion");
  const enCours = useRef<AbortController | null>(null);

  const recharger = useCallback(async () => {
    enCours.current?.abort();
    const ctrl = new AbortController();
    enCours.current = ctrl;
    try {
      const res = await fetch("/api/catalogue", { cache: "no-store", signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setCatalogue((await res.json()) as Catalogue);
      setRafraichi(new Date());
      setErreur(false);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setErreur(true);
    }
  }, []);

  useEffect(() => {
    const sb = supabaseNavigateur();
    let minuterie: ReturnType<typeof setTimeout> | undefined;
    const differe = () => {
      clearTimeout(minuterie);
      minuterie = setTimeout(() => void recharger(), 300);
    };
    const canal = sb
      ?.channel("catalogue")
      .on("postgres_changes", { event: "*", schema: "public", table: "programmes" }, differe)
      .on("postgres_changes", { event: "*", schema: "public", table: "lots" }, differe)
      .on("postgres_changes", { event: "*", schema: "public", table: "regles_aide" }, differe)
      .subscribe((statut) => {
        if (statut === "SUBSCRIBED") setDirect("direct");
        else if (statut === "CHANNEL_ERROR" || statut === "TIMED_OUT") setDirect("hors_ligne");
      });
    const intervalle = setInterval(() => void recharger(), sb ? SECOURS_MS : DEMO_MS);
    const auRetour = () => {
      if (document.visibilityState === "visible") void recharger();
    };
    const enLigne = () => {
      setDirect(sb ? "connexion" : "direct");
      void recharger();
    };
    const horsLigne = () => setDirect("hors_ligne");
    document.addEventListener("visibilitychange", auRetour);
    window.addEventListener("online", enLigne);
    window.addEventListener("offline", horsLigne);
    // Sans Supabase (mode démo), le catalogue est rechargé périodiquement.
    if (!sb) queueMicrotask(() => setDirect(navigator.onLine ? "direct" : "hors_ligne"));
    return () => {
      clearTimeout(minuterie);
      clearInterval(intervalle);
      document.removeEventListener("visibilitychange", auRetour);
      window.removeEventListener("online", enLigne);
      window.removeEventListener("offline", horsLigne);
      if (canal) void sb?.removeChannel(canal);
    };
  }, [recharger]);

  return <Ctx.Provider value={{ catalogue, direct, erreur, rafraichi, aujourdHui: aujourdHuiTanger(new Date(catalogue.genereLe)) }}>{children}</Ctx.Provider>;
}

export function useCatalogue(): ContexteCatalogue {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCatalogue doit être utilisé dans CatalogueProvider");
  return c;
}
