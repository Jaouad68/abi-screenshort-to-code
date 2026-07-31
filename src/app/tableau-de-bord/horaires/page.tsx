import { requireSalon } from "@/lib/auth";
import { JOURS, type Horaires } from "@/lib/horaires";
import { HorairesForm } from "./HorairesForm";

export default async function HorairesPage() {
  const salon = await requireSalon();
  const stored = salon.horaires as Horaires;

  const horaires: Horaires = JOURS.map(
    (jour) => stored.find((h) => h.jour === jour) ?? { jour, fenetres: [] }
  );

  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-3xl mb-2">Horaires d&apos;ouverture</h1>
      <p className="text-muted mb-8">
        Définissez vos plages d&apos;ouverture par jour. Ajoutez une seconde plage
        pour une coupure méridienne (ex. 09h00–12h00 puis 14h00–19h00).
      </p>
      <HorairesForm initialHoraires={horaires} />
    </div>
  );
}
