import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/money";
import { ajouterJours, formatDate } from "@/lib/date";
import {
  ETAPES_JOURS,
  etapeDue,
  joursEcoules,
  secretValide,
  telephoneInternational,
} from "@/lib/relance";

export const dynamic = "force-dynamic";

/**
 * Devis « Envoyé » dont une étape de relance est due aujourd'hui, avec tout ce
 * dont le workflow n8n a besoin pour rédiger et envoyer les messages.
 * Protégé par CRON_SECRET (Authorization: Bearer <CRON_SECRET>).
 */
export async function GET(request: Request) {
  if (!secretValide(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const maintenant = new Date();
  const devisList = await prisma.devis.findMany({
    where: { statut: "ENVOYE", envoyeLe: { not: null } },
    include: { client: true, user: { include: { company: true } } },
    orderBy: { envoyeLe: "asc" },
  });

  const devis = devisList.flatMap((d) => {
    const company = d.user.company;
    if (!company || !d.envoyeLe) return [];
    const etape = etapeDue(d.envoyeLe, d.relanceLe, maintenant);
    if (etape === null) return [];

    return [
      {
        id: d.id,
        numero: d.numero,
        objet: d.objet,
        etape,
        derniereEtape: etape === ETAPES_JOURS.length,
        envoyeLe: formatDate(d.envoyeLe),
        valableJusquau: formatDate(ajouterJours(d.dateDevis, d.dureeValidite)),
        joursDepuisEnvoi: joursEcoules(d.envoyeLe, maintenant),
        montantTtc: formatCents(d.totalTtcCents),
        client: {
          nom: d.client.nom,
          email: d.client.email,
          telephone: telephoneInternational(d.client.telephone),
        },
        entreprise: {
          nom: company.nom,
          email: company.email,
          telephone: company.telephone,
        },
      },
    ];
  });

  return Response.json({ devis });
}
