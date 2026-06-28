"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { registerAction } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";
import { FormMessage } from "@/components/FormMessage";

export default function RegisterPage() {
  const [state, action] = useFormState(registerAction, null);

  return (
    <div className="card animate-fade-in p-6 sm:p-8">
      <h1 className="text-2xl font-extrabold text-slate-900">Créer mon établissement</h1>
      <p className="mt-1 text-sm text-slate-500">
        2 minutes pour démarrer. Vous serez le gérant (administrateur).
      </p>

      <form action={action} className="mt-6 space-y-4">
        <FormMessage state={state} />
        <div>
          <label className="label" htmlFor="etablissementNom">
            Nom de l&apos;établissement
          </label>
          <input
            id="etablissementNom"
            name="etablissementNom"
            required
            className="field"
            placeholder="Le Bistrot du Marché"
          />
        </div>
        <div>
          <label className="label" htmlFor="etablissementAdresse">
            Adresse <span className="text-slate-400">(optionnel)</span>
          </label>
          <input
            id="etablissementAdresse"
            name="etablissementAdresse"
            className="field"
            placeholder="12 place de la République, 75011 Paris"
          />
        </div>
        <hr className="border-slate-100" />
        <div>
          <label className="label" htmlFor="nom">
            Votre nom
          </label>
          <input id="nom" name="nom" required className="field" placeholder="Camille Martin" />
        </div>
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input id="email" name="email" type="email" autoComplete="email" required className="field" />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Mot de passe <span className="text-slate-400">(8 caractères min.)</span>
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="field"
          />
        </div>
        <SubmitButton className="w-full btn-lg" pendingLabel="Création…">
          Créer mon compte
        </SubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Déjà inscrit ?{" "}
        <Link href="/login" className="font-semibold text-brand-700 hover:underline">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
