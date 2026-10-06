"use client";

import { createContext, useContext } from "react";
import { COOKIE_LANGUE, type Langue } from "@/lib/format";
import { DICTIONNAIRES, type Dictionnaire } from "@/lib/i18n";

const Ctx = createContext<Langue>("fr");

export function LangueProvider({ langue, children }: { langue: Langue; children: React.ReactNode }) {
  return <Ctx.Provider value={langue}>{children}</Ctx.Provider>;
}

export function useLangue(): { langue: Langue; t: Dictionnaire } {
  const langue = useContext(Ctx);
  return { langue, t: DICTIONNAIRES[langue] };
}

/** Change la langue (cookie lu par le serveur pour l'attribut dir de la page). */
export function choisirLangue(langue: Langue) {
  document.cookie = `${COOKIE_LANGUE}=${langue}; path=/; max-age=31536000; samesite=lax`;
}
