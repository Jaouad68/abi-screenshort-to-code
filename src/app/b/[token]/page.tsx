import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/money";
import { dateVersHeure, estPasse } from "@/lib/datetime";
import { STATUT_LABEL } from "@/lib/statut";
import { confirmerRdv, annulerRdv } from "./actions";

export default async function RendezVousTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const rdv = await prisma.appointment.findUnique({
    where: { bookingToken: token },
    include: { salon: true, service: true, client: true },
  });

  if (!rdv) notFound();

  const dateAffichee = rdv.debutAt.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
  const heureAffichee = dateVersHeure(rdv.debutAt);

  const rdvPasse = estPasse(rdv.debutAt);
  const peutAgir = !rdvPasse && (rdv.statut === "RESERVE" || rdv.statut === "CONFIRME");

  const confirmerAction = confirmerRdv.bind(null, token);
  const annulerAction = annulerRdv.bind(null, token);

  return (
    <main className="flex-1 flex justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <p className="text-sm text-muted mb-1">{rdv.salon.nom}</p>
        <h1 className="font-serif text-3xl mb-8">Votre rendez-vous</h1>

        <div className="bg-paper rounded-card shadow-hero p-6 flex flex-col gap-4">
          <div>
            <p className="font-semibold capitalize">{dateAffichee}</p>
            <p className="text-muted">à {heureAffichee.replace(":", "h")}</p>
          </div>
          <div className="border-t border-line pt-4">
            <p className="font-semibold">{rdv.service.nom}</p>
            <p className="text-sm text-muted">{formatCents(rdv.service.prixCents)}</p>
          </div>
          <div>
            <span className="text-xs uppercase font-semibold text-muted">
              {STATUT_LABEL[rdv.statut]}
            </span>
          </div>

          {peutAgir ? (
            <div className="flex gap-3 pt-2">
              {rdv.statut === "RESERVE" && (
                <form action={confirmerAction}>
                  <button
                    type="submit"
                    className="rounded-pill bg-sage text-white px-5 py-2.5 font-semibold hover:bg-sage-d transition-colors min-h-[44px]"
                  >
                    Confirmer
                  </button>
                </form>
              )}
              <form action={annulerAction}>
                <button
                  type="submit"
                  className="rounded-pill border border-danger text-danger px-5 py-2.5 font-semibold hover:bg-danger/10 transition-colors min-h-[44px]"
                >
                  Annuler le rendez-vous
                </button>
              </form>
            </div>
          ) : (
            <p className="text-sm text-muted italic pt-2">
              {rdvPasse
                ? "Ce rendez-vous est passé, il n'est plus modifiable ici."
                : "Ce rendez-vous n'est plus modifiable ici."}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
