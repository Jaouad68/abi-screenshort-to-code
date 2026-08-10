import Link from "next/link";
import { notFound } from "next/navigation";
import {
  devisDuClient,
  enteteClient,
  facturesDuClient,
  marquerVu,
  resoudreJeton,
} from "@/lib/portail";
import { formaterEuros } from "@/lib/calcul";

export const metadata = { title: "Votre espace — Plombéo" };

const formatDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

const LIBELLE_DEVIS: Record<string, string> = {
  PRET: "À examiner",
  ENVOYE: "À examiner",
  ACCEPTE: "Accepté",
  REFUSE: "Refusé",
  EXPIRE: "Expiré",
};

const LIBELLE_FACTURE: Record<string, string> = {
  EMISE: "À régler",
  ENVOYEE: "À régler",
  PARTIELLEMENT_PAYEE: "Partiellement réglée",
  PAYEE: "Réglée",
};

export default async function PagePortail(props: PageProps<"/portail/[jeton]">) {
  const { jeton } = await props.params;

  const acces = await resoudreJeton(jeton);
  // Même réponse pour un jeton inconnu, révoqué ou expiré : distinguer
  // renseignerait sur l'existence d'un lien.
  if (!acces) notFound();

  const entete = await enteteClient(acces);
  if (!entete) notFound();

  const [devis, factures] = await Promise.all([devisDuClient(acces), facturesDuClient(acces)]);
  await marquerVu(acces.accessId);

  return (
    <div className="min-h-dvh bg-fond">
      <header className="bg-encre text-white">
        <div className="mx-auto w-full max-w-2xl px-5 py-4">
          <p className="font-bold text-lg">{entete.entreprise.nom}</p>
          <p className="text-sm opacity-90">Espace de {entete.nomAffichage}</p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-5 py-6 flex flex-col gap-6">
        <section className="flex flex-col gap-3">
          <h1 className="text-xl font-bold">Vos devis</h1>
          {devis.length === 0 ? (
            <p className="text-sm text-attenue">Aucun devis pour l&apos;instant.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {devis.map((d) => (
                <li key={d.id}>
                  <Link
                    href={`/portail/${jeton}/devis/${d.id}`}
                    className="block bg-papier border border-trait rounded-carte p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">{d.objet || `Devis ${d.numero}`}</p>
                        <p className="text-sm text-attenue">
                          {d.numero} · {formatDate.format(d.date)}
                        </p>
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <p className="font-bold">{formaterEuros(d.totalTtcCents)}</p>
                        <p className="text-sm text-attenue">{LIBELLE_DEVIS[d.statut] ?? ""}</p>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold">Vos factures</h2>
          {factures.length === 0 ? (
            <p className="text-sm text-attenue">Aucune facture pour l&apos;instant.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {factures.map((f) => (
                <li key={f.id} className="bg-papier border border-trait rounded-carte p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">Facture {f.numero}</p>
                      <p className="text-sm text-attenue">
                        {formatDate.format(f.date)}
                        {f.echeance ? ` · échéance ${formatDate.format(f.echeance)}` : ""}
                      </p>
                    </div>
                    <div className="text-right whitespace-nowrap">
                      <p className="font-bold">{formaterEuros(f.totalTtcCents)}</p>
                      <p className="text-sm text-attenue">{LIBELLE_FACTURE[f.statut] ?? ""}</p>
                      {f.resteCents > 0 && f.resteCents !== f.totalTtcCents && (
                        <p className="text-sm">Reste {formaterEuros(f.resteCents)}</p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="text-sm text-attenue border-t border-trait pt-4">
          <p>
            Une question ? {entete.entreprise.nom}
            {entete.entreprise.telephone ? ` · ${entete.entreprise.telephone}` : ""}
            {entete.entreprise.email ? ` · ${entete.entreprise.email}` : ""}
          </p>
          <p className="mt-2">
            Ce lien vous est personnel. Il ne donne accès qu&apos;à vos propres documents.
          </p>
        </footer>
      </main>
    </div>
  );
}
