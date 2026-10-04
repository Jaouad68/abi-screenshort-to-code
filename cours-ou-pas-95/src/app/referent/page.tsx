import type { Metadata } from "next";
import { getLycee } from "@/data/lycees";
import { getReferentSession } from "@/lib/server/security";
import { ReferentView } from "./referent-view";

export const metadata: Metadata = { title: "Espace référent", robots: { index: false } };

export default async function Page() {
  const s = await getReferentSession();
  const lycee = s ? getLycee(s.uai) : undefined;
  return <ReferentView session={s && lycee ? { uai: lycee.uai, nom: lycee.nom, commune: lycee.commune, label: s.label } : null} />;
}
