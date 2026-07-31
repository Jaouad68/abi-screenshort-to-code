import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PrestationForm } from "../PrestationForm";
import { modifierPrestation, supprimerPrestation } from "../actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { btnDanger } from "@/lib/ui";

export default async function PrestationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await requireUser();
  const { id } = await params;

  const prestation = await prisma.prestation.findFirst({
    where: { id, userId: user.id },
  });
  if (!prestation) notFound();

  return (
    <div>
      <Link href="/tableau-de-bord/prestations" className="text-sm text-muted hover:text-brand">
        ← Catalogue
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-6">Modifier la prestation</h1>

      <PrestationForm
        action={modifierPrestation.bind(null, prestation.id)}
        prestation={prestation}
        submitLabel="Enregistrer"
      />

      <section className="border-t border-line mt-8 pt-6">
        <ConfirmButton
          action={supprimerPrestation.bind(null, prestation.id)}
          message={`Supprimer « ${prestation.libelle} » du catalogue ? (les devis existants ne sont pas modifiés)`}
          className={btnDanger}
        >
          Supprimer du catalogue
        </ConfirmButton>
      </section>
    </div>
  );
}
