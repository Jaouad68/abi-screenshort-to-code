/** Le document sort de la coquille applicative : rien qui se retrouverait sur la feuille du client. */
export default function LayoutImpression({ children }: { children: React.ReactNode }) {
  return <div className="flex-1 bg-white p-5 print:p-0">{children}</div>;
}
