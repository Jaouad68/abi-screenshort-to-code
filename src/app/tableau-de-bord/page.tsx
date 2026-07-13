import { requireSalon } from "@/lib/auth";

export default async function TableauDeBordPage() {
  const salon = await requireSalon();

  return (
    <div>
      <h1 className="font-serif text-3xl mb-2">Agenda</h1>
      <p className="text-muted">
        Bienvenue, {salon.nom}. L&apos;agenda du jour arrivera à l&apos;étape suivante.
      </p>
    </div>
  );
}
