import "server-only";
import { createClient } from "@supabase/supabase-js";
import { catalogueDemo, REGLE_AIDE_LANCEMENT } from "@/data/demo";
import type { Catalogue, Lot, Programme, Promoteur, RegleAide } from "@/lib/domain";

/**
 * Chargement du catalogue complet.
 *
 * - Si NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY sont définies :
 *   lecture des tables publiques Supabase (protégées par RLS, voir schema.sql).
 * - Sinon : catalogue de démonstration fictif.
 */

type Ligne = Record<string, unknown>;

const TAUX_DEFAUT = { EUR: 10.8, USD: 9.9, CAD: 7.2 };

/** Taux du jour (dirhams pour une unité de devise), mis en cache 24 h. */
async function chargerTaux(): Promise<Catalogue["taux"]> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/MAD", {
      next: { revalidate: 86_400 },
      signal: AbortSignal.timeout(4_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as { rates?: Record<string, number>; time_last_update_utc?: string };
    const r = json.rates ?? {};
    if (!r.EUR || !r.USD || !r.CAD) throw new Error("taux manquants");
    const date = json.time_last_update_utc ? new Date(json.time_last_update_utc).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    return { EUR: 1 / r.EUR, USD: 1 / r.USD, CAD: 1 / r.CAD, date, source: "open.er-api.com" };
  } catch {
    return { ...TAUX_DEFAUT, date: new Date().toISOString().slice(0, 10), source: "valeurs par défaut" };
  }
}

const promoteurDepuis = (l: Ligne): Promoteur => ({
  id: String(l.id),
  nom: String(l.nom),
  anneeCreation: (l.annee_creation as number | null) ?? null,
  projetsLivres: Number(l.projets_livres ?? 0),
  tfRemisATemps: (l.tf_remis_a_temps as number | null) ?? null,
  whatsapp: (l.whatsapp as string | null) ?? null,
  siteWeb: (l.site_web as string | null) ?? null,
  scoreFiabilite: l.score_fiabilite === null || l.score_fiabilite === undefined ? null : Number(l.score_fiabilite),
});

const programmeDepuis = (l: Ligne): Programme => ({
  id: String(l.id),
  promoteurId: String(l.promoteur_id),
  nom: String(l.nom),
  quartier: String(l.quartier),
  adresse: String(l.adresse ?? ""),
  lat: Number(l.lat),
  lng: Number(l.lng),
  livraisonPrevue: (l.livraison_prevue as string | null) ?? null,
  livre: Boolean(l.livre),
  avancementChantier: Number(l.avancement_chantier ?? 0),
  statutTf: l.statut_tf as Programme["statutTf"],
  numeroTf: (l.numero_tf as string | null) ?? null,
  conservationFonciere: (l.conservation_fonciere as string | null) ?? null,
  confianceTf: l.confiance_tf as Programme["confianceTf"],
  dateVerificationTf: (l.date_verification_tf as string | null) ?? null,
  sourceTf: (l.source_tf as string | null) ?? null,
  eligibleDispositif: Boolean(l.eligible_dispositif),
  confianceAide: l.confiance_aide as Programme["confianceAide"],
  autorisationConstruire: l.autorisation_construire as Programme["autorisationConstruire"],
  garantieAchevement: l.garantie_achevement as Programme["garantieAchevement"],
  photos: (l.photos as string[] | null) ?? [],
  description: String(l.description ?? ""),
  exemple: false,
  misAJourLe: String(l.mis_a_jour_le),
});

const lotDepuis = (l: Ligne): Lot => ({
  id: String(l.id),
  programmeId: String(l.programme_id),
  prixTtc: Number(l.prix_ttc),
  surface: Number(l.surface),
  chambres: Number(l.chambres),
  etage: Number(l.etage),
  ascenseur: Boolean(l.ascenseur),
  vueMer: l.vue_mer as Lot["vueMer"],
  parking: Boolean(l.parking),
  disponible: Boolean(l.disponible),
  misAJourLe: String(l.mis_a_jour_le),
});

const regleDepuis = (l: Ligne): RegleAide => ({
  version: String(l.version),
  dateEffet: String(l.date_effet),
  dateFin: (l.date_fin as string | null) ?? null,
  tranches: l.tranches as RegleAide["tranches"],
  lienOfficiel: String(l.lien_officiel),
  verifieLe: String(l.verifie_le),
});

export function supabaseConfigure(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export async function chargerCatalogue(): Promise<Catalogue> {
  const taux = await chargerTaux();
  if (!supabaseConfigure()) return { ...catalogueDemo(), taux };

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
  const aujourdHui = new Date().toISOString().slice(0, 10);
  const [promoteurs, programmes, lots, regles] = await Promise.all([
    sb.from("promoteurs").select("*"),
    sb.from("programmes").select("*").eq("publie", true),
    sb.from("lots").select("*"),
    sb.from("regles_aide").select("*").lte("date_effet", aujourdHui).order("date_effet", { ascending: false }).limit(1),
  ]);
  const erreur = promoteurs.error ?? programmes.error ?? lots.error ?? regles.error;
  if (erreur) throw new Error(`Supabase : ${erreur.message}`);

  const programmesPublies = (programmes.data ?? []).map(programmeDepuis);
  const ids = new Set(programmesPublies.map((p) => p.id));
  return {
    mode: "supabase",
    promoteurs: (promoteurs.data ?? []).map(promoteurDepuis),
    programmes: programmesPublies,
    lots: (lots.data ?? []).map(lotDepuis).filter((l) => ids.has(l.programmeId)),
    regle: regles.data?.[0] ? regleDepuis(regles.data[0]) : REGLE_AIDE_LANCEMENT,
    taux,
    genereLe: new Date().toISOString(),
  };
}
