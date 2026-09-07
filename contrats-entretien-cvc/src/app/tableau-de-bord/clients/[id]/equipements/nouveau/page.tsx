import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { carte } from "@/lib/ui";
import { EquipementForm } from "../../../../equipements/EquipementForm";
import { creerEquipement } from "../../../../equipements/actions";

export default async function NouvelEquipementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { company } = await requireRole(["DIRIGEANT", "ADMINISTRATIF"]);
  const { id } = await params;

  const client = await prisma.client.findFirst({ where: { id, companyId: company.id } });
  if (!client) notFound();

  return (
    <div className="flex flex-col gap-5 max-w-xl">
      <Link href={`/tableau-de-bord/clients/${client.id}`} className="text-sm text-muted hover:text-brand">
        ← {client.nom}
      </Link>
      <h1 className="text-2xl font-bold text-ink">Nouvel équipement</h1>
      <div className={carte}>
        <EquipementForm action={creerEquipement.bind(null, client.id)} />
      </div>
    </div>
  );
}
