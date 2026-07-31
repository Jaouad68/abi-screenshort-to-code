import Link from "next/link";
import type { DevisStatut } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DevisRow } from "@/components/DevisRow";
import { STATUTS, STATUT_LABEL } from "@/lib/statut";
import { btnPrimaire } from "@/lib/ui";

function estStatut(v: string | undefined): v is DevisStatut {
  return !!v && (STATUTS as string[]).includes(v);
}

export default async function DevisListPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string }>;
}) {
  const { user } = await requireUser();
  const { statut } = await searchParams;
  const filtre = estStatut(statut) ? statut : undefined;

  const devis = await prisma.devis.findMany({
    where: { userId: user.id, ...(filtre ? { statut: filtre } : {}) },
    orderBy: { createdAt: "desc" },
    include: { client: { select: { nom: true } } },
  });

  const chip = (href: string, actif: boolean, texte: string) => (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 text-sm font-semibold whitespace-nowrap ${
        actif ? "bg-brand text-white" : "bg-card border border-line text-ink-2"
      }`}
    >
      {texte}
    </Link>
  );

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-4">
        <h1 className="text-2xl font-bold">Devis</h1>
        <Link href="/tableau-de-bord/devis/nouveau" className={btnPrimaire}>
          + Devis
        </Link>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 -mx-1 px-1">
        {chip("/tableau-de-bord/devis", !filtre, "Tous")}
        {STATUTS.map((s) =>
          chip(
            `/tableau-de-bord/devis?statut=${s}`,
            filtre === s,
            STATUT_LABEL[s],
          ),
        )}
      </div>

      {devis.length === 0 ? (
        <p className="text-muted italic">Aucun devis {filtre ? "dans ce statut" : ""}.</p>
      ) : (
        <ul className="grid gap-2">
          {devis.map((d) => (
            <li key={d.id}>
              <DevisRow devis={d} montrerClient />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
