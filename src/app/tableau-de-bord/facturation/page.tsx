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

      <div className="bg-paper rounded-card border border-line p-6 mb-8 flex items-center justify-between">
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

      <div className="grid grid-cols-3 gap-3">
        {PLANS.map((p) => {
          const estActuel = p.plan === salon.plan && salon.abonnementStatut === "ACTIF";
          return (
            <div key={p.plan} className="bg-white rounded-card border border-line p-6 flex flex-col gap-3">
              <p className="font-semibold">{p.nom}</p>
              <p className="font-serif text-2xl tabular-nums">
                {formatCents(p.prixCents)}
                <span className="text-sm text-muted font-sans">/mois</span>
              </p>
              <p className="text-xs text-muted">
                {p.quotaSms !== null ? `${p.quotaSms} SMS inclus` : "SMS illimité raisonnable"}
              </p>
              <form action={souscrire.bind(null, p.plan)}>
                <button
                  type="submit"
                  disabled={!configure || estActuel}
                  className="w-full rounded-pill bg-ink text-white px-5 py-2.5 font-semibold hover:bg-ink-2 transition-colors min-h-[44px] disabled:opacity-40"
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
