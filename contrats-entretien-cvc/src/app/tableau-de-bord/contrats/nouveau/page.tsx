import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { carte } from "@/lib/ui";
import { ContratForm } from "../ContratForm";
import { creerContrat } from "../actions";

export default async function NouveauContratPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; equipement?: string }>;
}) {
  const { company } = await requireRole(["DIRIGEANT", "ADMINISTRATIF"]);
  const { client, equipement } = await searchParams;

  const [clients, equipements] = await Promise.all([
    prisma.client.findMany({ where: { companyId: company.id }, orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
    prisma.equipement.findMany({
      where: { companyId: company.id },
      select: { id: true, clientId: true, type: true, marque: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-5 max-w-xl">
      <h1 className="text-2xl font-bold text-ink">Nouveau contrat</h1>
      <div className={carte}>
        <ContratForm
          action={creerContrat}
          clients={clients}
          equipements={equipements.map((e) => ({
            id: e.id,
            clientId: e.clientId,
            label: [e.type, e.marque].filter(Boolean).join(" — ") || "Équipement",
          }))}
          valeurs={
            client || equipement
              ? {
                  clientId: client ?? "",
                  equipementId: equipement ?? "",
                  type: "Entretien annuel",
                  periodicite: "ANNUELLE",
                  montant: "",
                  dateDebut: "",
                  dateEcheance: "",
                  notes: "",
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}
