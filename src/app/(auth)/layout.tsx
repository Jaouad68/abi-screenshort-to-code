import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-brand-50 to-slate-50">
      <header className="px-5 pt-8">
        <Link href="/" className="flex items-center gap-2 text-brand-700">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-lg font-black text-white">
            R
          </span>
          <span className="text-lg font-extrabold tracking-tight">Resto Pilot HACCP</span>
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-5 py-8">
        <div className="w-full max-w-md">{children}</div>
      </main>
      <footer className="px-5 pb-6 text-center text-xs text-slate-400">
        Outil d&apos;aide à la conformité — la responsabilité réglementaire reste celle de l&apos;exploitant.
      </footer>
    </div>
  );
}
