import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ReinitialisationForm } from "./ReinitialisationForm";

export default async function ReinitialiserMotDePassePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });
  const valide = !!resetToken && !resetToken.usedAt && resetToken.expiresAt > new Date();

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md bg-paper rounded-card shadow-hero p-8">
        <h1 className="font-serif text-3xl mb-2">Nouveau mot de passe</h1>

        {valide ? (
          <ReinitialisationForm token={token} />
        ) : (
          <>
            <p className="text-danger mb-6">
              Ce lien de réinitialisation n&apos;est plus valide ou a expiré.
            </p>
            <Link href="/mot-de-passe-oublie" className="text-sage-d font-semibold">
              Demander un nouveau lien
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
