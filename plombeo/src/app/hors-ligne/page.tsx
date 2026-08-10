import { Carte } from "@/components/ui";

export const metadata = { title: "Hors ligne — Plombéo" };

export default function PageHorsLigne() {
  return (
    <main id="contenu" className="flex-1 flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
        <Carte>
          <h1 className="text-xl font-bold mb-2">Vous êtes hors ligne</h1>
          <p className="text-attenue">
            Impossible de joindre le serveur pour le moment. Cette page se rechargera
            automatiquement dès que la connexion reviendra.
          </p>
          <p className="text-sm text-attenue mt-4">
            La saisie hors connexion des interventions, photos et notes sera disponible
            dans une prochaine version.
          </p>
        </Carte>
      </div>
    </main>
  );
}
