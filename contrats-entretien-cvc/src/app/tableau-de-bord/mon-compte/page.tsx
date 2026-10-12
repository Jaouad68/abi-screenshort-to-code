import { requireUser } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/permissions";
import { carte } from "@/lib/ui";
import { MotDePasseForm } from "./MotDePasseForm";

export default async function MonComptePage() {
  const { user, company } = await requireUser();

  return (
    <div className="flex flex-col gap-6 max-w-md">
      <div>
        <h1 className="text-2xl font-bold text-ink">Mon compte</h1>
        <p className="text-muted">{company.nom}</p>
      </div>

      <section className={carte}>
        <dl className="text-sm flex flex-col gap-2">
          <div>
            <dt className="text-muted">Nom</dt>
            <dd className="font-medium">{user.nom}</dd>
          </div>
          <div>
            <dt className="text-muted">E-mail</dt>
            <dd className="font-medium">{user.email}</dd>
          </div>
          <div>
            <dt className="text-muted">Rôle</dt>
            <dd className="font-medium">{ROLE_LABEL[user.role]}</dd>
          </div>
        </dl>
      </section>

      <section className={carte}>
        <h2 className="font-bold text-lg mb-3">Changer mon mot de passe</h2>
        <MotDePasseForm />
      </section>
    </div>
  );
}
