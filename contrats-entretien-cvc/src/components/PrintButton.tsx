"use client";

/** Déclenche l'impression / l'enregistrement PDF via le navigateur — aucun
 * service de génération de PDF externe n'est nécessaire. */
export function PrintButton({
  className,
  children = "Imprimer / Enregistrer en PDF",
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <button type="button" onClick={() => window.print()} className={className}>
      {children}
    </button>
  );
}
