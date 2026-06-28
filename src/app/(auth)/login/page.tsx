"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { loginAction } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";
import { FormMessage } from "@/components/FormMessage";

export default function LoginPage() {
  const [state, action] = useFormState(loginAction, null);

  return (
    <div className="card animate-fade-in p-6 sm:p-8">
      <h1 className="text-2xl font-extrabold text-slate-900">Connexion</h1>
      <p className="mt-1 text-sm text-slate-500">Accédez à votre classeur HACCP numérique.</p>

      <form action={action} className="mt-6 space-y-4">
        <FormMessage state={state} />
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input id="email" name="email" type="email" autoComplete="email" required className="field" />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Mot de passe
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="field"
          />
        </div>
        <SubmitButton className="w-full btn-lg" pendingLabel="Connexion…">
          Se connecter
        </SubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Pas encore de compte ?{" "}
        <Link href="/register" className="font-semibold text-brand-700 hover:underline">
          Créer mon établissement
        </Link>
      </p>

      <div className="mt-6 rounded-xl bg-slate-50 p-4 text-xs text-slate-500">
        <p className="font-semibold text-slate-600">Comptes de démonstration</p>
        <p className="mt-1">Gérant : gerant@demo.fr / Demo1234</p>
        <p>Employé : employe@demo.fr / Demo1234</p>
      </div>
    </div>
  );
}
