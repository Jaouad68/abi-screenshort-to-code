import { prisma } from "@/lib/prisma";
import { envoyerSms } from "@/lib/sms";
import { prochainPalierARelancer } from "@/lib/ct";

export const dynamic = "force-dynamic";

/**
 * Agent 1 — Rappel du contrôle technique.
 * Envoie un rappel SMS pour chaque véhicule qui atteint aujourd'hui l'un des
 * paliers configurés par son garage (ex. J-21, J-10, J-3), et pas encore reçu
 * pour ce palier. À appeler quotidiennement (Vercel Cron).
 *
 *   Authorization: Bearer <CRON_SECRET>   (en-tête ajouté par Vercel Cron)
 *   ou  ?secret=<CRON_SECRET>
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const url = new URL(request.url);
  const fourni =
    request.headers.get("authorization")?.replace("Bearer ", "") ?? url.searchParams.get("secret");

  if (!secret || fourni !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const aujourdHui = new Date();

  const vehicules = await prisma.vehicule.findMany({
    where: { statut: { not: "CONFIRME" } },
    include: {
      garage: { select: { nom: true, rappelCtPaliers: true } },
      rappels: { select: { palierJours: true } },
    },
  });

  let envoyes = 0;
  const details: string[] = [];

  for (const vehicule of vehicules) {
    const palier = prochainPalierARelancer({
      ctEcheance: vehicule.ctEcheance,
      paliers: vehicule.garage.rappelCtPaliers,
      palierDejaEnvoyes: vehicule.rappels.map((r) => r.palierJours),
      aujourdHui,
    });
    if (palier === null) continue;

    const corps = `Bonjour ${vehicule.clientNom}, le contrôle technique de votre véhicule ${vehicule.plaque} est prévu le ${vehicule.ctEcheance.toLocaleDateString("fr-FR")}. Contactez-nous pour prendre rendez-vous — ${vehicule.garage.nom}.`;
    const resultat = vehicule.clientTelephone
      ? await envoyerSms(vehicule.clientTelephone, corps)
      : { ok: true, simule: true };

    if (!resultat.ok) continue;

    await prisma.rappelCt.create({
      data: { vehiculeId: vehicule.id, palierJours: palier, simule: resultat.simule },
    });
    if (vehicule.statut === "A_VENIR") {
      await prisma.vehicule.update({ where: { id: vehicule.id }, data: { statut: "ENVOYE" } });
    }

    envoyes++;
    details.push(`${vehicule.plaque} · J-${palier}${resultat.simule ? " (simulé)" : ""}`);
  }

  return Response.json({ envoyes, details });
}
