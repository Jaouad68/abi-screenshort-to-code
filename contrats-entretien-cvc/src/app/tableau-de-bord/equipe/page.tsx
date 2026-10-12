import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLE_LABEL } from "@/lib/permissions";
import { carte } from "@/lib/ui";
import { CreerUtilisateurForm } from "./CreerUtilisateurForm";
import { ToggleActifButton } from "./ToggleActifButton";

export default async function EquipePage() {
  const { user, company } = await requireRole(["DIRIGEANT"]);

  const membres = await prisma.user.findMany({
    where: { companyId: company.id },
    orderBy: [{ actif: "desc" }, { nom: "asc" }],
  });

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-ink">Équipe</h1>
        <p className="text-muted">Comptes de {company.nom}.</p>
      </div>

      <section>
        <h2 className="font-bold text-lg mb-3">Membres ({membres.length})</h2>
        <ul className="flex flex-col gap-2">
          {membres.map((m) => (
            <li key={m.id} className={`${carte} flex items-center justify-between gap-3`}>
              <div className="min-w-0">
                <p className="font-semibold text-ink truncate">
                  {m.nom} {m.id === user.id && <span className="text-muted font-normal">(vous)</span>}
                </p>
                <p className="text-sm text-muted truncate">
                  {m.email} · {ROLE_LABEL[m.role]}
                  {!m.actif && " · Désactivé"}
                </p>
              </div>
              {m.id !== user.id && <ToggleActifButton id={m.id} actif={m.actif} />}
            </li>
          ))}
        </ul>
      </section>

      <section className={carte}>
        <h2 className="font-bold text-lg mb-3">Créer un compte</h2>
        <CreerUtilisateurForm />
      </section>
    </div>
  );
}
