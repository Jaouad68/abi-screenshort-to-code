import Link from "next/link";

export function Pagination({
  page,
  totalPages,
  hrefPourPage,
}: {
  page: number;
  totalPages: number;
  hrefPourPage: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between mt-8 text-sm font-semibold">
      {page > 1 ? (
        <Link href={hrefPourPage(page - 1)} className="hover:text-sage-d">
          ← Précédent
        </Link>
      ) : (
        <span className="text-muted opacity-40">← Précédent</span>
      )}
      <span className="text-muted font-normal">
        Page {page} sur {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={hrefPourPage(page + 1)} className="hover:text-sage-d">
          Suivant →
        </Link>
      ) : (
        <span className="text-muted opacity-40">Suivant →</span>
      )}
    </div>
  );
}
