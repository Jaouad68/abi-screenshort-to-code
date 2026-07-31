import { prisma } from "@/lib/prisma";
import { envoyerEmail } from "@/lib/email";
import { formatCents } from "@/lib/money";

export const dynamic = "force-dynamic";

const JOUR_MS = 86_400_000;

/**
 * Relance automatique des devis « Envoyé » sans réponse depuis `relanceJours`.
 * À appeler quotidiennement (Vercel Cron). Protégé par CRON_SECRET :
 *   Authorization: Bearer <CRON_SECRET>   (en-tête ajouté par Vercel Cron)
 *   ou  ?secret=<CRON_SECRET>
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const url = new URL(request.url);
  const fourni =
    request.headers.get("authorization")?.replace("Bearer ", "") ??
    url.searchParams.get("secret");

  if (!secret || fourni !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = Date.now();
  const devisList = await prisma.devis.findMany({
    where: { statut: "ENVOYE", envoyeLe: { not: null } },
    include: { client: true, user: { include: { company: true } } },
  });

  let relances = 0;
  const details: string[] = [];

  for (const d of devisList) {
    const company = d.user.company;
    if (!company) continue;
    const seuil = (company.relanceJours || 7) * JOUR_MS;

    if (!d.envoyeLe || now - d.envoyeLe.getTime() < seuil) continue;
    if (d.relanceLe && now - d.relanceLe.getTime() < seuil) continue;
    if (!d.client.email) continue;

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
        <p>Bonjour,</p>
        <p>Nous nous permettons de revenir vers vous concernant notre devis
        <strong>${d.numero}</strong>${d.objet ? ` (${d.objet})` : ""} d'un montant de
        <strong>${formatCents(d.totalTtcCents)} TTC</strong>, resté sans réponse.</p>
        <p>Nous restons à votre disposition pour toute question ou ajustement.</p>
        <p>Cordialement,<br>${company.nom}<br>${company.telephone}</p>
      </div>`;

    const res = await envoyerEmail({
      to: d.client.email,
      sujet: `Relance — Devis ${d.numero} · ${company.nom}`,
      html,
    });

    if (res.ok) {
      await prisma.devis.update({ where: { id: d.id }, data: { relanceLe: new Date() } });
      relances++;
      details.push(`${d.numero}${res.simule ? " (simulé)" : ""}`);
    }
  }

  return Response.json({ relances, details });
}
