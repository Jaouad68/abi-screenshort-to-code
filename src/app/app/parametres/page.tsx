import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { TYPE_EQUIPEMENT_LABEL, FREQUENCE_LABEL, ROLE_LABEL } from "@/lib/labels";
import {
  EquipementForm,
  TacheForm,
  EmployeForm,
  RappelForm,
  SupprimerCompte,
} from "./ParametresForms";
import {
  desactiverEquipement,
  desactiverTache,
  desactiverEmploye,
  supprimerRappel,
} from "./actions";

export const dynamic = "force-dynamic";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-5">
      <h2 className="text-lg font-bold text-slate-800">{title}</h2>
      {description && <p className="mb-4 mt-0.5 text-sm text-slate-500">{description}</p>}
      <div className={description ? "" : "mt-4"}>{children}</div>
    </section>
  );
}

export default async function ParametresPage({
  searchParams,
}: {
  searchParams: { onboarding?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "GERANT") redirect("/app");

  const etabId = user.etablissementId;
  const [equipements, taches, employes, rappels] = await Promise.all([
    prisma.equipement.findMany({
      where: { etablissementId: etabId, actif: true },
      orderBy: { nom: "asc" },
    }),
    prisma.tacheNettoyage.findMany({
      where: { etablissementId: etabId, actif: true },
      orderBy: { libelle: "asc" },
    }),
    prisma.utilisateur.findMany({
      where: { etablissementId: etabId, actif: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.rappel.findMany({ where: { etablissementId: etabId }, orderBy: { heure: "asc" } }),
  ]);

  const onboarding = searchParams.onboarding === "1";

  return (
    <div className="space-y-5">
      <PageHeader title="Réglages" subtitle={user.etablissement.nom} />

      {onboarding && (
        <div className="card animate-fade-in border-brand-200 bg-brand-50 p-5">
          <p className="font-bold text-brand-800">👋 Bienvenue ! Configurons votre établissement.</p>
          <p className="mt-1 text-sm text-brand-700">
            Ajoutez vos 2-3 enceintes froides ci-dessous, puis lancez votre premier relevé. Vous
            serez opérationnel en moins de 5 minutes.
          </p>
        </div>
      )}

      {/* Équipements */}
      <Section
        title="Équipements"
        description="Vos enceintes froides/chaudes et leurs plages de température cibles."
      >
        <ul className="mb-4 space-y-2">
          {equipements.length === 0 && (
            <li className="text-sm text-slate-400">Aucun équipement pour l&apos;instant.</li>
          )}
          {equipements.map((e) => (
            <li
              key={e.id}
              className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5"
            >
              <div>
                <p className="font-semibold text-slate-700">{e.nom}</p>
                <p className="text-xs text-slate-500">
                  {TYPE_EQUIPEMENT_LABEL[e.type]} · {e.tempMin} à {e.tempMax} °C
                </p>
              </div>
              <form action={desactiverEquipement}>
                <input type="hidden" name="id" value={e.id} />
                <button className="text-sm font-medium text-red-600 hover:underline">Retirer</button>
              </form>
            </li>
          ))}
        </ul>
        <EquipementForm />
      </Section>

      {/* Plan de nettoyage */}
      <Section title="Plan de nettoyage" description="Les tâches récurrentes à valider par l'équipe.">
        <ul className="mb-4 space-y-2">
          {taches.length === 0 && (
            <li className="text-sm text-slate-400">Aucune tâche pour l&apos;instant.</li>
          )}
          {taches.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5"
            >
              <div>
                <p className="font-semibold text-slate-700">{t.libelle}</p>
                <p className="text-xs text-slate-500">
                  {t.zone} · {FREQUENCE_LABEL[t.frequence]}
                </p>
              </div>
              <form action={desactiverTache}>
                <input type="hidden" name="id" value={t.id} />
                <button className="text-sm font-medium text-red-600 hover:underline">Retirer</button>
              </form>
            </li>
          ))}
        </ul>
        <TacheForm />
      </Section>

      {/* Utilisateurs */}
      <Section title="Équipe" description="Les employés saisissent les relevés ; ils n'ont pas accès aux réglages.">
        <ul className="mb-4 space-y-2">
          {employes.map((u) => (
            <li
              key={u.id}
              className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5"
            >
              <div>
                <p className="font-semibold text-slate-700">
                  {u.nom} {u.id === user.id && <span className="text-xs text-slate-400">(vous)</span>}
                </p>
                <p className="text-xs text-slate-500">
                  {u.email} · {ROLE_LABEL[u.role]}
                </p>
              </div>
              {u.role === "EMPLOYE" && (
                <form action={desactiverEmploye}>
                  <input type="hidden" name="id" value={u.id} />
                  <button className="text-sm font-medium text-red-600 hover:underline">Retirer</button>
                </form>
              )}
            </li>
          ))}
        </ul>
        <EmployeForm />
      </Section>

      {/* Rappels */}
      <Section title="Rappels de relevés" description="Heures conseillées pour ne pas oublier les relevés (matin / soir).">
        <ul className="mb-4 space-y-2">
          {rappels.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5"
            >
              <p className="font-semibold text-slate-700">
                <span className="tabular-nums">{r.heure}</span> · {r.libelle}
              </p>
              <form action={supprimerRappel}>
                <input type="hidden" name="id" value={r.id} />
                <button className="text-sm font-medium text-red-600 hover:underline">Supprimer</button>
              </form>
            </li>
          ))}
        </ul>
        <RappelForm />
      </Section>

      {/* RGPD */}
      <Section title="Données & RGPD" description="Vos données sont conservées au moins 12 mois et hébergées dans l'UE.">
        <div className="space-y-3 text-sm text-slate-600">
          <p>
            Vous pouvez exporter l&apos;intégralité de vos enregistrements via{" "}
            <a href="/app/export" className="font-semibold text-brand-700 hover:underline">
              l&apos;export PDF
            </a>
            .
          </p>
          <div className="pt-2">
            <SupprimerCompte />
          </div>
        </div>
      </Section>
    </div>
  );
}
