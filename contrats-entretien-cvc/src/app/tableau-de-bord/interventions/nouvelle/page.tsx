import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { carte } from "@/lib/ui";
import { InterventionForm } from "../InterventionForm";
import { creerIntervention } from "../actions";

export default async function NouvelleInterventionPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; contrat?: string; equipement?: string }>;
}) {
  const { company } = await requireRole(["DIRIGEANT", "ADMINISTRATIF"]);
  const { client, contrat, equipement } = await searchParams;

  const [clients, equipements, contrats, techniciens] = await Promise.all([
    prisma.client.findMany({ where: { companyId: company.id }, orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
    prisma.equipement.findMany({
      where: { companyId: company.id },
      select: { id: true, clientId: true, type: true, marque: true },
    }),
    prisma.contrat.findMany({
      where: { companyId: company.id },
      select: { id: true, clientId: true, equipementId: true, reference: true, type: true },
    }),
    prisma.user.findMany({
      where: { companyId: company.id, role: "TECHNICIEN", actif: true },
      select: { id: true, nom: true },
      orderBy: { nom: "asc" },
    }),
  ]);

  return (
    <div className="flex flex-col gap-5 max-w-xl">
      <h1 className="text-2xl font-bold text-ink">Planifier une intervention</h1>
      <div className={carte}>
        <InterventionForm
          action={creerIntervention}
          clients={clients}
          equipements={equipements.map((e) => ({
            id: e.id,
            clientId: e.clientId,
            label: [e.type, e.marque].filter(Boolean).join(" — ") || "Équipement",
          }))}
          contrats={contrats.map((c) => ({
            id: c.id,
            clientId: c.clientId,
            equipementId: c.equipementId,
            label: `${c.reference} — ${c.type}`,
          }))}
          techniciens={techniciens}
          valeurs={
            client
              ? { clientId: client, equipementId: equipement ?? "", contratId: contrat ?? "", titre: "Entretien annuel", technicienId: "" }
              : undefined
          }
        />
      </div>
    </div>
  );
}
