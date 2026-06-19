export const metadata = { title: "Hors-ligne — Resto Pilot HACCP" };

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-50 px-6 text-center">
      <span className="text-5xl">📶</span>
      <h1 className="mt-4 text-xl font-extrabold text-slate-800">Vous êtes hors-ligne</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        Pas de connexion pour le moment. Vos relevés de température saisis restent enregistrés
        localement et seront synchronisés automatiquement dès le retour du réseau.
      </p>
      <a href="/app" className="btn-primary mt-6">
        Réessayer
      </a>
    </div>
  );
}
