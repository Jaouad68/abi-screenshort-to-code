import { requireSalon } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NouveauPraticienForm } from "./NouveauPraticienForm";
import { PraticienRow } from "./PraticienRow";

export default async function PraticiensPage() {
  const salon = await requireSalon();
  const praticiens = await prisma.praticien.findMany({
    where: { salonId: salon.id },
    orderBy: { nom: "asc" },
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-serif text-3xl mb-2">Praticiens</h1>
        <p className="text-muted">
          Les personnes que vos clientes pourront choisir lors de la réservation en ligne.
        </p>
      </div>

      <NouveauPraticienForm />

      <div className="flex flex-col gap-3">
        {praticiens.length === 0 && (
          <p className="text-muted italic">Aucun praticien pour le moment.</p>
        )}
        {praticiens.map((praticien) => (
          <PraticienRow key={praticien.id} praticien={praticien} />
        ))}
      </div>
    </div>
  );
}
