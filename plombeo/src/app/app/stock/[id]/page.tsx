import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Bouton, Carte } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { exigerPermission, sessionCourante } from "@/lib/dal";
import { roleAutorise } from "@/lib/permissions";
import { listerMouvements, stockArticle } from "@/lib/achats";
import { etatStock } from "@/lib/stock";
import { formaterQuantite } from "@/lib/format";
import { formaterEuros } from "@/lib/calcul";
import { basculerSuiviStock } from "../../achats/actions";
import { FormulaireMouvement } from "./FormulaireMouvement";
import { FormulaireComptage } from "./FormulaireComptage";
import { FormulaireSeuil } from "./FormulaireSeuil";

export const metadata = { title: "Référence — Plombéo" };

const LIBELLE_TYPE: Record<string, string> = {
  ENTREE_ACHAT: "Entrée (achat)",
  SORTIE_CHANTIER: "Sortie (chantier)",
  CORRECTION_COMPTAGE: "Correction (comptage)",
  RETOUR: "Retour",
  PERTE: "Perte",
};

const formatHorodatage = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "short",
});

export default async function PageArticleStock(props: PageProps<"/app/stock/[id]">) {
  const { id } = await props.params;
  const { organizationId } = await exigerPermission("stock:lire");

  const article = await prisma.product.findFirst({ where: { id, organizationId } });
  if (!article) notFound();

  const [quantiteMilli, mouvements, contexte] = await Promise.all([
    stockArticle(id),
    listerMouvements(id),
    sessionCourante(),
  ]);

  const peutBouger = contexte ? roleAutorise(contexte.role, "stock:modifier") : false;
  const etat = etatStock(article, quantiteMilli ?? 0);

  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="text-sm text-attenue">
          <Link href="/app/stock" className="underline">
            Stock
          </Link>
        </p>
        <h1 className="text-2xl font-bold mt-1">{article.libelle}</h1>
        {article.reference && <p className="text-sm text-attenue">Réf. {article.reference}</p>}
      </header>

      <Carte>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-2xl font-bold">
              {formaterQuantite(quantiteMilli ?? 0)} {article.unite}
            </p>
            {article.prixAchatCents > 0 ? (
              <p className="text-sm text-attenue mt-1">
                Dernier prix payé : {formaterEuros(article.prixAchatCents)}
              </p>
            ) : (
              <p className="text-sm text-attenue mt-1">Prix d&apos;achat non renseigné.</p>
            )}
          </div>
          <Badge
            ton={
              etat === "NEGATIF" ? "danger" : etat === "SOUS_SEUIL" ? "alerte" : "succes"
            }
          >
            {etat === "NEGATIF" ? "Négatif" : etat === "SOUS_SEUIL" ? "À racheter" : "En stock"}
          </Badge>
        </div>

        {etat === "NEGATIF" && (
          <p className="text-sm text-attenue mt-3">
            Une sortie a été enregistrée sans son entrée. Comptez ce qu&apos;il vous reste et
            corrigez ci-dessous : le stock n&apos;est jamais bloqué, il est seulement signalé.
          </p>
        )}

        {peutBouger && (
          <form action={basculerSuiviStock} className="mt-3">
            <input type="hidden" name="id" value={article.id} />
            <Bouton type="submit" variante="discret">
              {article.suiviStock ? "Ne plus suivre en stock" : "Suivre en stock"}
            </Bouton>
          </form>
        )}
      </Carte>

      {peutBouger && article.suiviStock && (
        <>
          <FormulaireMouvement productId={article.id} unite={article.unite} />
          <FormulaireComptage productId={article.id} unite={article.unite} />
          <FormulaireSeuil
            productId={article.id}
            unite={article.unite}
            seuilMilli={article.seuilAlerteMilli}
          />
        </>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Historique</h2>
        {mouvements.length === 0 ? (
          <p className="text-sm text-attenue">Aucun mouvement enregistré.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {mouvements.map((m) => (
              <li key={m.id}>
                <Carte>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{LIBELLE_TYPE[m.type] ?? m.type}</p>
                      <p className="text-sm text-attenue">
                        {formatHorodatage.format(m.createdAt)}
                        {m.parEmail ? ` · ${m.parEmail}` : ""}
                      </p>
                      {m.motif && <p className="text-sm mt-1">{m.motif}</p>}
                    </div>
                    <p
                      className={`font-semibold whitespace-nowrap ${
                        m.quantiteMilli < 0 ? "text-danger" : "text-succes"
                      }`}
                    >
                      {m.quantiteMilli > 0 ? "+" : ""}
                      {formaterQuantite(m.quantiteMilli)} {article.unite}
                    </p>
                  </div>
                </Carte>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
