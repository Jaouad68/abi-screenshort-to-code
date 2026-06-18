import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { startOfToday, startOfWeek, startOfMonth } from "@/lib/dates";
import { StatutBadge } from "@/components/ui";
import { ROLE_LABEL } from "@/lib/labels";

export const dynamic = "force-dynamic";

function periodStart(frequence: string): Date {
  if (frequence === "HEBDOMADAIRE") return startOfWeek();
  if (frequence === "MENSUELLE") return startOfMonth();
  return startOfToday();
}

export default async function Dashboard() {
  const user = await requireUser();
  const etabId = user.etablissementId;
  const now = new Date();

  const [equipements, relevesToday, taches, dlcDepassees, ncOuvertes] = await Promise.all([
    prisma.equipement.findMany({ where: { etablissementId: etabId, actif: true } }),
    prisma.releveTemperature.findMany({
      where: {
        equipement: { etablissementId: etabId },
        createdAt: { gte: startOfToday() },
      },
      select: { equipementId: true },
    }),
    prisma.tacheNettoyage.findMany({
      where: { etablissementId: etabId, actif: true },
      include: { validations: { orderBy: { createdAt: "desc" }, take: 1 } },
    }),
    prisma.produitOuvert.count({
      where: { etablissementId: etabId, statut: "OUVERT", dlcSecondaire: { lt: now } },
    }),
    prisma.nonConformite.count({ where: { etablissementId: etabId, statut: "OUVERT" } }),
  ]);

  const equipsReleves = new Set(relevesToday.map((r) => r.equipementId));
  const relevesRestants = equipements.filter((e) => !equipsReleves.has(e.id));
  const tachesRestantes = taches.filter((t) => {
    const last = t.validations[0];
    return !(last && last.createdAt >= periodStart(t.frequence));
  });

  const greeting = now.getHours() < 12 ? "Bonjour" : "Bonsoir";

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-slate-500">
          {greeting}, {user.nom.split(" ")[0]} · {ROLE_LABEL[user.role]}
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
          {user.etablissement.nom}
        </h1>
      </header>

      {/* Synthèse du jour */}
      <section className="grid grid-cols-2 gap-3">
        <StatCard
          href="/app/temperatures"
          icon="🌡️"
          label="Relevés à faire"
          value={relevesRestants.length}
          total={equipements.length}
          tone={relevesRestants.length === 0 && equipements.length > 0 ? "ok" : "warn"}
        />
        <StatCard
          href="/app/nettoyage"
          icon="🧽"
          label="Nettoyage à faire"
          value={tachesRestantes.length}
          total={taches.length}
          tone={tachesRestantes.length === 0 && taches.length > 0 ? "ok" : "warn"}
        />
        <StatCard
          href="/app/tracabilite"
          icon="🏷️"
          label="DLC dépassées"
          value={dlcDepassees}
          tone={dlcDepassees === 0 ? "ok" : "danger"}
        />
        <StatCard
          href="/app/non-conformites"
          icon="⚠️"
          label="Anomalies ouvertes"
          value={ncOuvertes}
          tone={ncOuvertes === 0 ? "ok" : "danger"}
        />
      </section>

      {/* Relevés restants détaillés */}
      <section className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Relevés du jour</h2>
          {equipements.length > 0 && (
            <StatutBadge
              label={relevesRestants.length === 0 ? "Terminé ✓" : `${relevesRestants.length} restant(s)`}
              tone={relevesRestants.length === 0 ? "ok" : "warn"}
            />
          )}
        </div>
        {equipements.length === 0 ? (
          <p className="text-sm text-slate-500">
            Aucun équipement déclaré.{" "}
            {user.role === "GERANT" ? (
              <Link href="/app/parametres" className="font-semibold text-brand-700 hover:underline">
                Ajoutez vos enceintes →
              </Link>
            ) : (
              "Demandez au gérant de les configurer."
            )}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {equipements.map((e) => {
              const done = equipsReleves.has(e.id);
              return (
                <li key={e.id} className="flex items-center justify-between py-2.5">
                  <span className="text-sm font-medium text-slate-700">{e.nom}</span>
                  {done ? (
                    <span className="text-sm font-semibold text-brand-700">✓ Relevé</span>
                  ) : (
                    <Link
                      href={`/app/temperatures`}
                      className="rounded-lg bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700"
                    >
                      Saisir →
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Accès rapides */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <QuickLink href="/app/temperatures" icon="🌡️" label="Température" />
        <QuickLink href="/app/nettoyage" icon="🧽" label="Nettoyage" />
        <QuickLink href="/app/receptions" icon="📦" label="Réception" />
        <QuickLink href="/app/tracabilite" icon="🏷️" label="Traçabilité" />
        <QuickLink href="/app/non-conformites" icon="⚠️" label="Anomalie" />
        {user.role === "GERANT" && <QuickLink href="/app/export" icon="📄" label="Export PDF" />}
      </section>
    </div>
  );
}

function StatCard({
  href,
  icon,
  label,
  value,
  total,
  tone,
}: {
  href: string;
  icon: string;
  label: string;
  value: number;
  total?: number;
  tone: "ok" | "warn" | "danger";
}) {
  const ring =
    tone === "ok" ? "ring-brand-200" : tone === "danger" ? "ring-red-200" : "ring-amber-200";
  const color =
    tone === "ok" ? "text-brand-700" : tone === "danger" ? "text-red-600" : "text-amber-600";
  return (
    <Link href={href} className={`card p-4 ring-1 ${ring} transition active:scale-[0.98]`}>
      <div className="text-2xl">{icon}</div>
      <div className={`mt-1 text-3xl font-extrabold tabular-nums ${color}`}>
        {value}
        {total !== undefined && <span className="text-base font-medium text-slate-400">/{total}</span>}
      </div>
      <div className="text-xs font-medium text-slate-500">{label}</div>
    </Link>
  );
}

function QuickLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link
      href={href}
      className="card flex flex-col items-center gap-1 px-3 py-4 text-center transition active:scale-[0.98]"
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-sm font-semibold text-slate-700">{label}</span>
    </Link>
  );
}
