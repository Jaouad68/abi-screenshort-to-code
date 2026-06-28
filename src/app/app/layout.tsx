import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "../(auth)/actions";
import { DesktopNav, MobileNav } from "@/components/AppNav";
import { ROLE_LABEL } from "@/lib/labels";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-dvh bg-slate-50 lg:flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white p-4 lg:flex">
        <Link href="/app" className="mb-6 flex items-center gap-2 px-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-lg font-black text-white">
            R
          </span>
          <span className="text-base font-extrabold tracking-tight text-slate-800">
            Resto Pilot
          </span>
        </Link>
        <DesktopNav role={user.role} />
        <div className="mt-auto pt-4">
          <div className="rounded-xl bg-slate-50 p-3 text-sm">
            <p className="truncate font-semibold text-slate-700">{user.nom}</p>
            <p className="text-xs text-slate-500">
              {ROLE_LABEL[user.role]} · {user.etablissement.nom}
            </p>
          </div>
          <form action={logoutAction}>
            <button className="mt-2 w-full rounded-xl px-4 py-2 text-left text-sm font-medium text-slate-500 hover:bg-slate-100">
              Se déconnecter
            </button>
          </form>
        </div>
      </aside>

      {/* Top bar (mobile) */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
          <Link href="/app" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-sm font-black text-white">
              R
            </span>
            <span className="text-sm font-extrabold text-slate-800">Resto Pilot</span>
          </Link>
          <form action={logoutAction}>
            <button className="text-xs font-medium text-slate-500">Déconnexion</button>
          </form>
        </header>

        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-24 pt-5 lg:px-8 lg:pb-10">
          {children}
        </main>
      </div>

      <MobileNav role={user.role} />
    </div>
  );
}
