import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <div className="text-[56px]">🏫</div>
      <h1 className="mt-2 font-display text-[26px] font-bold">Lycée introuvable</h1>
      <p className="mt-1 text-[15px] text-label-2">Cette page n&apos;existe pas ou plus.</p>
      <Link href="/" className="pressable mt-6 rounded-full bg-accent px-6 py-3 font-semibold text-white">
        Voir tous les lycées
      </Link>
    </main>
  );
}
