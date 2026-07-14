import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BookingFlow } from "./BookingFlow";

export default async function ReservationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const salon = await prisma.salon.findUnique({
    where: { slug },
    include: {
      services: {
        where: { actif: true },
        orderBy: { nom: "asc" },
      },
      praticiens: {
        where: { actif: true },
        orderBy: { nom: "asc" },
      },
    },
  });

  if (!salon) notFound();

  return (
    <main className="flex-1 flex justify-center px-6 py-12">
      <div className="w-full max-w-xl">
        <p className="text-sm text-muted mb-1">
          {salon.nom}
          {salon.ville ? ` · ${salon.ville}` : ""}
        </p>
        <h1 className="font-serif text-3xl mb-8">Réserver un rendez-vous</h1>
        <BookingFlow
          salonSlug={salon.slug}
          services={salon.services.map((s) => ({
            id: s.id,
            nom: s.nom,
            dureeMin: s.dureeMin,
            prixCents: s.prixCents,
          }))}
          praticiens={salon.praticiens.map((p) => ({ id: p.id, nom: p.nom }))}
        />
      </div>
    </main>
  );
}
