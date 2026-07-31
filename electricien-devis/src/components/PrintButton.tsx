"use client";

/** Déclenche l'impression / l'enregistrement PDF via le navigateur. */
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
