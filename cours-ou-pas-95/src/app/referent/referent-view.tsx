"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconBadge, IconChevronLeft, IconChevronRight } from "@/components/icons";

type Session = { uai: string; nom: string; commune: string; label: string } | null;

export function ReferentView({ session }: { session: Session }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/referent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string; uai?: string };
    setBusy(false);
    if (!res.ok) return setError(json.error ?? "Erreur");
    router.push(`/lycee/${json.uai}`);
    router.refresh();
  };

  const logout = async () => {
    await fetch("/api/referent", { method: "DELETE" });
    router.refresh();
  };

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-32 pt-safe">
      <Link href="/" className="pressable -ml-2 mt-3 inline-flex items-center gap-0.5 rounded-full px-2 py-1.5 text-[17px] font-medium text-accent">
        <IconChevronLeft width={22} height={22} strokeWidth={2.5} />
        Lycées
      </Link>

      <div className="mt-6 flex flex-col items-center text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-gradient-to-br from-accent to-accent-2 text-white shadow-float">
          <IconBadge width={34} height={34} strokeWidth={2} />
        </span>
        <h1 className="mt-4 font-display text-[30px] font-bold tracking-tight">Espace référent</h1>
        <p className="mt-1 text-[15px] leading-snug text-label-2">
          Délégués, parents élus, personnels : avec un code fourni par la modération, tes signalements fixent le statut de
          ton lycée.
        </p>
      </div>

      {session ? (
        <section className="mt-8 animate-fade-up rounded-[22px] bg-card p-5 shadow-card">
          <div className="text-[13px] font-semibold uppercase tracking-wide text-label-2">Connecté en tant que</div>
          <div className="mt-1 text-[17px] font-semibold">{session.label || "Référent"}</div>
          <Link href={`/lycee/${session.uai}`} className="pressable mt-3 flex items-center gap-3 rounded-2xl bg-fill p-3">
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{session.nom}</div>
              <div className="text-[13px] text-label-2">{session.commune}</div>
            </div>
            <IconChevronRight width={16} height={16} className="text-label-3" />
          </Link>
          <button onClick={logout} className="mt-4 text-[15px] font-medium text-bloque">
            Se déconnecter
          </button>
        </section>
      ) : (
        <form onSubmit={submit} className="mt-8 space-y-3">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABCD-EFGH"
            autoCapitalize="characters"
            autoComplete="one-time-code"
            spellCheck={false}
            maxLength={9}
            className="w-full rounded-2xl bg-card px-4 py-4 text-center font-mono text-[24px] tracking-[0.2em] shadow-card outline-none focus:ring-2 focus:ring-accent"
          />
          {error && <p className="text-center text-[14px] text-bloque">{error}</p>}
          <button
            disabled={busy || code.replace(/[^A-Z0-9]/gi, "").length !== 8}
            className="pressable w-full rounded-2xl bg-accent py-4 text-[17px] font-semibold text-white disabled:opacity-40"
          >
            {busy ? "Vérification…" : "Activer mon accès"}
          </button>
          <p className="px-2 text-center text-[12px] leading-snug text-label-3">
            Pas de code ? Demande-le à l&apos;équipe de modération. Un code est personnel et peut être désactivé à tout moment.
          </p>
        </form>
      )}
    </main>
  );
}
