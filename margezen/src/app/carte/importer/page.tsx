import { ImporterCarte } from "./ImporterCarte";

export default async function ImporterCartePage({
  searchParams,
}: {
  searchParams: Promise<{ etablissement?: string }>;
}) {
  const { etablissement: etablissementId } = await searchParams;

  if (!etablissementId) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-2 bg-[var(--color-fond)] px-6 text-center text-[var(--color-texte)]">
        <p>Établissement manquant dans l&apos;URL (?etablissement=...).</p>
        <p className="text-sm text-[var(--color-texte)]/60">
          Le choix de l&apos;établissement actif sera géré par l&apos;authentification
          (à venir).
        </p>
      </main>
    );
  }

  return <ImporterCarte etablissementId={etablissementId} />;
}
