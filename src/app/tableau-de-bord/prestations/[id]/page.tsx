import { notFound } from "next/navigation";
import { requireSalon } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ModifierPrestationForm } from "./ModifierPrestationForm";

export default async function ModifierPrestationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const salon = await requireSalon();
  const { id } = await params;

  const service = await prisma.service.findFirst({
    where: { id, salonId: salon.id },
  });
  if (!service) notFound();

  return (
    <div className="max-w-lg">
      <h1 className="font-serif text-3xl mb-6">Modifier « {service.nom} »</h1>
      <ModifierPrestationForm service={service} />
    </div>
  );
}
