import { requireSalon } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/money";
import { moisActuelISO, debutEtFinDeMoisUtc } from "@/lib/datetime";
import { PLANS, definitionPlan } from "@/lib/facturation/plans";
import { facturationConfiguree } from "@/lib/facturation/stripe";
import { souscrire, gererAbonnement } from "./actions";

const STATUT_LABEL: Record<string, string> = {
  ESSAI: "Essai",
  ACTIF: "Actif",
  IMPAYE: "Paiement en échec",
  ANNULE: "Annulé",
};

const STATUT_BADGE: Record<string, string> = {
  ESSAI: "text-muted",
  ACTIF: "text-sage-d",
  IMPAYE: "text-danger",
  ANNULE: "text-danger",
};

export default async function FacturationPage() {
  const salon = await requireSalon();
  const planActuel = definitionPlan(salon.plan);

  const { debut, fin } = debutEtFinDeMoisUtc(moisActuelISO());
  const smsEnvoyesCeMois = await prisma.smsLog.count({
    where: {
      direction: "SORTANT",
      statut: { not: "QUOTA_DEPASSE" },
      envoyeLe: { gte: debut, lt: fin },
      appointment: { salonId: salon.id },
    },
  });

  const configure = facturationConfiguree();

  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-3xl mb-2">Facturation</h1>
      <p className="text-muted mb-8">Votre abonnement RésaZen et votre consommation SMS.</p>

      <div className="card-hover bg-paper rounded-card border border-line p-6 mb-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-4">
          <span className="shrink-0 w-11 h-11 rounded-full bg-sage-l text-sage-d flex items-center justify-center text-lg">
            ★
          </span>
          <div>
            <p className="font-semibold">
              Plan {planActuel.nom} · {formatCents(planActuel.prixCents)}/mois
            </p>
            <p className={`text-sm font-semibold ${STATUT_BADGE[salon.abonnementStatut] ?? ""}`}>
              {STATUT_LABEL[salon.abonnementStatut] ?? salon.abonnementStatut}
            </p>
            <p className="text-sm text-muted mt-2">
              SMS ce mois-ci : {smsEnvoyesCeMois}
              {planActuel.quotaSms !== null ? ` / ${planActuel.quotaSms} inclus` : " (illimité raisonnable)"}
            </p>
          </div>
        </div>
        {salon.stripeCustomerId && (
          <form action={gererAbonnement}>
            <button
              type="submit"
              className="rounded-pill border border-line px-5 py-2.5 font-semibold hover:border-sage-line transition-colors min-h-[44px]"
            >
              Gérer mon abonnement
            </button>
          </form>
        )}
      </div>

      {!configure && (
        <p className="text-sm text-muted mb-6 italic">
          Aucun moyen de paiement configuré : les boutons ci-dessous sont désactivés en
          attendant que Stripe soit relié (voir <code>STRIPE_PRICE_*</code> dans <code>.env</code>).
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
        {PLANS.map((p) => {
          const estActuel = p.plan === salon.plan && salon.abonnementStatut === "ACTIF";
          return (
            <div
              key={p.plan}
              className={`relative rounded-card border p-6 flex flex-col gap-3 ${
                estActuel
                  ? "bg-ink text-white border-ink shadow-hero sm:-translate-y-2"
                  : "card-hover bg-white border-line"
              }`}
            >
              {estActuel && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-pill bg-brass text-white text-xs font-semibold uppercase tracking-wide px-3 py-1">
                  Plan actuel
                </span>
              )}
              <p className="font-semibold">{p.nom}</p>
              <p className="font-serif text-2xl">
                {formatCents(p.prixCents)}
                <span className={`text-sm font-sans ${estActuel ? "text-white/70" : "text-muted"}`}>
                  /mois
                </span>
              </p>
              <p className={`text-xs ${estActuel ? "text-white/80" : "text-muted"}`}>
                {p.quotaSms !== null ? `${p.quotaSms} SMS inclus` : "SMS illimité raisonnable"}
              </p>
              <form action={souscrire.bind(null, p.plan)}>
                <button
                  type="submit"
                  disabled={!configure || estActuel}
                  className={`w-full rounded-pill px-5 py-2.5 font-semibold transition-colors min-h-[44px] disabled:opacity-40 ${
                    estActuel ? "bg-white text-ink" : "bg-ink text-white hover:bg-ink-2"
                  }`}
                >
                  {estActuel ? "Plan actuel" : "Choisir ce plan"}
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
