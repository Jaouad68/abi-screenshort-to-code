import { timingSafeEqual } from "node:crypto";
import { balayer, viderFileEmails } from "@/lib/moteur";
import { purgerDonneesExpirees } from "@/lib/securite";

/**
 * Balayage périodique des automatisations.
 *
 * Ce point d'entrée n'est PAS protégé par une session : aucun humain ne
 * l'appelle. Il exige un secret partagé, et c'est la seule porte du projet qui
 * traverse les organisations — d'où le soin particulier apporté à sa fermeture.
 *
 * Sans `CRON_SECRET` configuré, la route est FERMÉE (503) plutôt qu'ouverte.
 * Le défaut sûr est de ne rien faire, pas de laisser entrer.
 */

/** Comparaison à temps constant : une comparaison naïve fuit le secret. */
function secretValide(fourni: string, attendu: string): boolean {
  const a = Buffer.from(fourni);
  const b = Buffer.from(attendu);
  // `timingSafeEqual` exige des longueurs égales ; comparer les longueurs
  // d'abord ne révèle que la longueur, pas le contenu.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

async function executer(requete: Request): Promise<Response> {
  const attendu = process.env["CRON_SECRET"] ?? "";
  if (!attendu) {
    return Response.json(
      { erreur: "CRON_SECRET n'est pas configuré : le balayage est désactivé." },
      { status: 503 },
    );
  }

  const entete = requete.headers.get("authorization") ?? "";
  const fourni = entete.startsWith("Bearer ") ? entete.slice(7) : "";

  if (!secretValide(fourni, attendu)) {
    // Message identique qu'il s'agisse d'un secret absent ou erroné : ne rien
    // apprendre à celui qui essaie.
    return Response.json({ erreur: "Non autorisé." }, { status: 401 });
  }

  const maintenant = new Date();
  const regles = await balayer(maintenant);
  const file = await viderFileEmails(maintenant);

  // Purge (Phase 15) : sessions expirées et tentatives anciennes. La fonction
  // existait depuis la Phase 1 ; seul le branchement manquait. Les DOCUMENTS ne
  // sont pas purgés : leur durée de conservation relève d'obligations
  // [À VÉRIFIER — SOURCE OFFICIELLE] que Plombéo ne tranche pas.
  const purge = await purgerDonneesExpirees();

  return Response.json(
    { execute: maintenant.toISOString(), regles, file, purge },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(requete: Request) {
  return executer(requete);
}

/**
 * GET accepté : plusieurs ordonnanceurs (dont Vercel Cron) n'émettent que des
 * GET. L'action reste protégée par le même secret.
 */
export async function GET(requete: Request) {
  return executer(requete);
}
