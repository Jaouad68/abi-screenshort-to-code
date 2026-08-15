import { prisma } from "@/lib/prisma";
import { envoyerSms } from "@/lib/sms";
import { devisDoitEtreRelance, devisDoitProposerPaiementFractionne } from "@/lib/devis";

export const dynamic = "force-dynamic";

/**
 * Agent 2 — Réveille les devis.
 * Relance chaque devis dormant depuis le délai configuré par son garage, et
 * propose un paiement en 2 fois une fois le second délai atteint. À appeler
 * quotidiennement (Vercel Cron).
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

  const devisList = await prisma.devis.findMany({
    where: { statut: { in: ["EN_ATTENTE", "RELANCE"] } },
    include: {
      garage: { select: { nom: true, devisRelanceApresJours: true, devisPaiementFractionneApresJours: true } },
      relances: { orderBy: { envoyeLe: "desc" }, take: 1 },
    },
  });

  let envoyes = 0;
  const details: string[] = [];

  for (const devis of devisList) {
    const derniereRelanceLe = devis.relances[0]?.envoyeLe ?? null;

    const proposerFractionne = devisDoitProposerPaiementFractionne({
      emisLe: devis.emisLe,
      paiementFractionneApresJours: devis.garage.devisPaiementFractionneApresJours,
      dejaPropose: devis.paiementFractionneProposeLe !== null,
      statut: devis.statut,
      aujourdHui,
    });

    const relancerSimple = devisDoitEtreRelance({
      emisLe: devis.emisLe,
      derniereRelanceLe,
      relanceApresJours: devis.garage.devisRelanceApresJours,
      statut: devis.statut,
      aujourdHui,
    });

    if (!proposerFractionne && !relancerSimple) continue;

    const montant = (devis.montantCentimes / 100).toLocaleString("fr-FR");
    const corps = proposerFractionne
      ? `Bonjour ${devis.clientNom}, votre devis ${devis.reference} (${montant} €) est toujours disponible — un paiement en 2 fois est possible si cela peut aider. Contactez-nous — ${devis.garage.nom}.`
      : `Bonjour ${devis.clientNom}, votre devis ${devis.reference} (${montant} €) est toujours disponible. Contactez-nous si vous souhaitez y donner suite — ${devis.garage.nom}.`;

    const resultat = devis.clientTelephone
      ? await envoyerSms(devis.clientTelephone, corps)
      : { ok: true, simule: true };

    if (!resultat.ok) continue;

    await prisma.$transaction([
      prisma.relanceDevis.create({ data: { devisId: devis.id, simule: resultat.simule } }),
      prisma.devis.update({
        where: { id: devis.id },
        data: {
          statut: "RELANCE",
          ...(proposerFractionne ? { paiementFractionneProposeLe: aujourdHui } : {}),
        },
      }),
    ]);

    envoyes++;
    details.push(`${devis.reference}${proposerFractionne ? " (paiement 2x proposé)" : ""}${resultat.simule ? " (simulé)" : ""}`);
  }

  return Response.json({ envoyes, details });
}
