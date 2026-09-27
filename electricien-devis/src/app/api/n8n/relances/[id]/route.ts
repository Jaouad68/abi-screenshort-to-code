import { prisma } from "@/lib/prisma";
import { secretValide } from "@/lib/relance";

export const dynamic = "force-dynamic";

/**
 * Appelé par n8n après l'envoi d'une relance : enregistre la date de relance,
 * ce qui fait passer le devis à l'étape suivante de la séquence.
 * Protégé par CRON_SECRET (Authorization: Bearer <CRON_SECRET>).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!secretValide(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const { count } = await prisma.devis.updateMany({
    where: { id, statut: "ENVOYE" },
    data: { relanceLe: new Date() },
  });

  if (count === 0) {
    return Response.json({ ok: false, erreur: "Devis introuvable ou plus en attente" }, { status: 404 });
  }
  return Response.json({ ok: true });
}
