export default function AccueilPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-6 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--color-texte)]">
        MargeZen
      </h1>
      <p className="text-base text-[var(--color-texte)]/80">
        Photographie ta facture fournisseur. En 30 secondes, sache quels
        plats de ta carte ne sont plus rentables.
      </p>
    </main>
  );
}
