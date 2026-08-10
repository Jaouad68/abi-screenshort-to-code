import { Bouton, Carte } from "@/components/ui";
import { exigerSession, sessionsActives } from "@/lib/dal";
import { deconnecter, deconnecterTousLesAppareils } from "../actions";

export const metadata = { title: "Sécurité — Plombéo" };

const formatDate = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeStyle: "short",
});

/** Un user-agent brut est illisible : on n'en garde qu'une indication utile. */
function nommerAppareil(userAgent: string): string {
  if (!userAgent) return "Appareil inconnu";
  if (/iPhone|iPad/i.test(userAgent)) return "iPhone ou iPad";
  if (/Android/i.test(userAgent)) return "Appareil Android";
  if (/Mac OS X/i.test(userAgent)) return "Mac";
  if (/Windows/i.test(userAgent)) return "PC Windows";
  return "Autre appareil";
}

export default async function PageSecurite() {
  const contexte = await exigerSession();
  const sessions = await sessionsActives();

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold">Sécurité</h1>
        <p className="text-attenue mt-1">
          Vos appareils connectés à Plombéo.
        </p>
      </header>

      <Carte>
        <h2 className="font-semibold mb-3">Appareils connectés</h2>
        <ul className="flex flex-col divide-y divide-trait">
          {sessions.map((session) => (
            <li key={session.id} className="py-3 flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">
                  {nommerAppareil(session.appareil)}
                  {session.id === contexte.sessionId && (
                    <span className="text-succes text-sm font-semibold">
                      {" "}
                      — cet appareil
                    </span>
                  )}
                </p>
                <p className="text-sm text-attenue">
                  Dernière activité le {formatDate.format(session.lastSeenAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Carte>

      <Carte>
        <h2 className="font-semibold mb-1">Perte ou vol d&apos;un appareil</h2>
        <p className="text-sm text-attenue mb-4">
          Déconnecte immédiatement tous vos appareils, y compris celui-ci. Vous devrez
          vous reconnecter avec votre mot de passe.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <form action={deconnecterTousLesAppareils}>
            <Bouton type="submit" variante="discret">
              Déconnecter tous mes appareils
            </Bouton>
          </form>
          <form action={deconnecter}>
            <Bouton type="submit" variante="secondaire">
              Me déconnecter
            </Bouton>
          </form>
        </div>
      </Carte>
    </div>
  );
}
