"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { WeekPayload } from "@/lib/server/week";
import { emptyDay, type DayStatus, type Status } from "@/lib/status";
import { syncPushLycees } from "./push";
import { getBrowserSupabase } from "./supabase";

export type { WeekPayload };

/** Rafraîchissement de secours, même quand le temps réel est actif. */
const SAFETY_POLL_MS = 60_000;
/** En mode démo (sans Supabase), on interroge le serveur plus souvent. */
const DEMO_POLL_MS = 5_000;

export type LiveState = "connecting" | "live" | "polling" | "offline";

/**
 * Statuts d'une semaine, tenus à jour en temps réel :
 * Supabase Realtime prévient de chaque changement, avec un rafraîchissement
 * périodique et au retour sur l'onglet en filet de sécurité.
 */
export function useWeek(start: string) {
  const [data, setData] = useState<WeekPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState<LiveState>(() => (getBrowserSupabase() ? "connecting" : "polling"));
  const startRef = useRef(start);
  const inflight = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    inflight.current?.abort();
    const ctrl = new AbortController();
    inflight.current = ctrl;
    try {
      const res = await fetch(`/api/week?start=${startRef.current}`, { cache: "no-store", signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as WeekPayload;
      if (json.start === startRef.current) {
        setData(json);
        setError(null);
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError("Connexion impossible. Nouvel essai en cours…");
    }
  }, []);

  useEffect(() => {
    startRef.current = start;
    void refresh();
  }, [start, refresh]);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const debounced = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void refresh(), 250);
    };

    const channel = supabase
      ?.channel("updates")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "updates" }, debounced)
      .subscribe((s) => setLive(s === "SUBSCRIBED" ? "live" : s === "CHANNEL_ERROR" || s === "TIMED_OUT" ? "polling" : "connecting"));

    const poll = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, supabase ? SAFETY_POLL_MS : DEMO_POLL_MS);

    const onVisible = () => document.visibilityState === "visible" && debounced();
    const onOnline = () => {
      setLive(supabase ? "connecting" : "polling");
      debounced();
    };
    const onOffline = () => setLive("offline");
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      clearTimeout(timer);
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      if (channel) void supabase?.removeChannel(channel);
    };
  }, [refresh]);

  // Tant que la nouvelle semaine n'est pas chargée, on n'affiche pas l'ancienne.
  return { data: data?.start === start ? data : null, error, live, refresh };
}

export function dayOf(week: WeekPayload | null, uai: string, date: string): DayStatus {
  const days = week?.statuses[uai];
  const i = week?.days.indexOf(date) ?? -1;
  return (days && i >= 0 && days[i]) || emptyDay(date);
}

/* ------------------------------------------------------------------------ */
/* Stockage local (favoris, mes signalements)                                */
/* ------------------------------------------------------------------------ */

function localStore<T>(key: string, fallback: T) {
  const listeners = new Set<() => void>();
  let cache: { raw: string | null; value: T } | null = null;

  const read = (): T => {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(key);
    } catch {}
    if (cache && cache.raw === raw) return cache.value;
    let value = fallback;
    try {
      if (raw) value = JSON.parse(raw) as T;
    } catch {}
    cache = { raw, value };
    return value;
  };

  const write = (value: T) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
    cache = null;
    listeners.forEach((l) => l());
  };

  const subscribe = (l: () => void) => {
    listeners.add(l);
    const onStorage = (e: StorageEvent) => e.key === key && l();
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(l);
      window.removeEventListener("storage", onStorage);
    };
  };

  return { read, write, subscribe, server: () => fallback };
}

const favStore = localStore<string[]>("cop:favoris", []);

export function useFavorites() {
  const favs = useSyncExternalStore(favStore.subscribe, favStore.read, favStore.server);
  const set = useCallback((next: string[]) => {
    favStore.write(next);
    // Les notifications suivent les favoris.
    void syncPushLycees(next).catch(() => {});
  }, []);
  const toggle = useCallback(
    (uai: string) => {
      const cur = favStore.read();
      set(cur.includes(uai) ? cur.filter((u) => u !== uai) : [...cur, uai]);
    },
    [set],
  );
  const add = useCallback(
    (uai: string) => {
      const cur = favStore.read();
      if (!cur.includes(uai)) set([...cur, uai]);
      return cur.includes(uai) ? cur : [...cur, uai];
    },
    [set],
  );
  return { favs, toggle, add, isFav: (uai: string) => favs.includes(uai) };
}

const voteStore = localStore<Record<string, Status>>("cop:mes-signalements", {});

export function useMyVotes() {
  const votes = useSyncExternalStore(voteStore.subscribe, voteStore.read, voteStore.server);
  const record = useCallback((uai: string, date: string, status: Status) => {
    voteStore.write({ ...voteStore.read(), [`${uai}|${date}`]: status });
  }, []);
  return { voteFor: (uai: string, date: string): Status | undefined => votes[`${uai}|${date}`], record };
}

/** Horloge qui avance toutes les 30 s (pour les « il y a 5 min »). */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

/** Vrai une fois monté côté client (évite les écarts d'hydratation). */
export function useMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
