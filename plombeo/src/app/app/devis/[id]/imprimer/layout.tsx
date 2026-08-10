/**
 * Le document imprimable sort de la coquille applicative : pas d'en-tête, pas de
 * navigation, rien qui se retrouverait sur la feuille du client.
 */
export default function LayoutImpression({ children }: { children: React.ReactNode }) {
  return <div className="flex-1 bg-white p-5 print:p-0">{children}</div>;
}
