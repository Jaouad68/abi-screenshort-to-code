import Link from "next/link";
import { requireSalon } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/money";
import { basculerActif, supprimerPrestation } from "./actions";
import { NouvellePrestationForm } from "./NouvellePrestationForm";

export default async function PrestationsPage() {
  const salon = await requireSalon();
  const services = await prisma.service.findMany({
    where: { salonId: salon.id },
    orderBy: { nom: "asc" },
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-serif text-3xl mb-2">Prestations</h1>
        <p className="text-muted">
          Ce que vos clientes pourront réserver en ligne : durée, battement et prix.
        </p>
      </div>

      <NouvellePrestationForm />

      <div className="flex flex-col gap-3">
        {services.length === 0 && (
          <p className="text-muted italic">Aucune prestation pour le moment.</p>
        )}
        {services.map((service) => (
          <div
            key={service.id}
            className={`flex items-center justify-between bg-paper rounded-card border border-line px-6 py-4 ${
              service.actif ? "" : "opacity-50"
            }`}
          >
            <div>
              <p className="font-semibold">
                {service.nom}
                {!service.actif && (
                  <span className="ml-2 text-xs uppercase text-muted">Désactivée</span>
                )}
              </p>
              <p className="text-sm text-muted">
                {service.dureeMin} min
                {service.bufferMin > 0 && ` + ${service.bufferMin} min de battement`}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-serif text-xl tabular-nums">
                {formatCents(service.prixCents)}
              </span>
              <Link
                href={`/tableau-de-bord/prestations/${service.id}`}
                className="text-sm font-semibold text-sage-d hover:underline"
              >
                Modifier
              </Link>
              <form action={basculerActif.bind(null, service.id)}>
                <button type="submit" className="text-sm font-semibold text-muted hover:text-ink">
                  {service.actif ? "Désactiver" : "Activer"}
                </button>
              </form>
              <form action={supprimerPrestation.bind(null, service.id)}>
                <button type="submit" className="text-sm font-semibold text-danger hover:underline">
                  Supprimer
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
