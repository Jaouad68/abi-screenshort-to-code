import Link from "next/link";
import { btnPrimaire } from "@/lib/ui";

/** État vide standard : message + action principale optionnelle. */
export function EmptyState({
  titre,
  description,
  actionHref,
  actionLabel,
}: {
  titre: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="rounded-card border border-dashed border-line bg-card/60 p-8 text-center">
      <p className="font-semibold text-ink mb-1">{titre}</p>
      {description && <p className="text-sm text-muted mb-4">{description}</p>}
      {actionHref && actionLabel && (
        <Link href={actionHref} className={`${btnPrimaire} inline-flex`}>
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
