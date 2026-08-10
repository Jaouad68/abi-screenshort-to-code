import Link from "next/link";
import { Badge, Bouton, Carte, ListeVide } from "@/components/ui";
import { listerNotifications } from "@/lib/notifications";
import { marquerNotificationLue, toutMarquerLu } from "../automatisations/actions";

export const metadata = { title: "Notifications — Plombéo" };

const formatHorodatage = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeStyle: "short",
});

export default async function PageNotifications(props: PageProps<"/app/notifications">) {
  const { tout } = await props.searchParams;
  const inclureLues = tout === "1";

  const notifications = await listerNotifications(inclureLues);
  const nonLues = notifications.filter((n) => !n.lueLe).length;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-attenue mt-1">
            Ce que Plombéo a repéré pendant que vous étiez sur le chantier.
          </p>
        </div>
        {nonLues > 0 && <Badge ton="alerte">{nonLues}</Badge>}
      </header>

      <div className="flex flex-wrap gap-2">
        <Link
          href={inclureLues ? "/app/notifications" : "/app/notifications?tout=1"}
          className="inline-flex items-center justify-center min-h-11 px-4 rounded-controle
                     font-semibold bg-white text-encre border border-trait hover:bg-fond"
        >
          {inclureLues ? "Masquer les lues" : "Afficher aussi les lues"}
        </Link>
        {nonLues > 0 && (
          <form action={toutMarquerLu}>
            <Bouton type="submit" variante="discret">
              Tout marquer comme lu
            </Bouton>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <ListeVide titre={inclureLues ? "Aucune notification" : "Rien à signaler"}>
          Les alertes apparaissent ici dès qu&apos;une automatisation est active.
        </ListeVide>
      ) : (
        <ul className="flex flex-col gap-2">
          {notifications.map((n) => (
            <li key={n.id}>
              <Carte className={n.lueLe ? "opacity-70" : ""}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{n.titre}</p>
                    {n.corps && <p className="text-sm mt-1">{n.corps}</p>}
                    <p className="text-sm text-attenue mt-1">
                      {formatHorodatage.format(n.createdAt)}
                    </p>
                  </div>
                  {!n.lueLe && <Badge ton="alerte">Nouveau</Badge>}
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  {n.lien && (
                    <Link
                      href={n.lien}
                      className="inline-flex items-center justify-center min-h-11 px-4 rounded-controle
                                 font-semibold bg-white text-encre border border-trait hover:bg-fond"
                    >
                      Ouvrir
                    </Link>
                  )}
                  {!n.lueLe && (
                    <form action={marquerNotificationLue}>
                      <input type="hidden" name="id" value={n.id} />
                      <Bouton type="submit" variante="discret">
                        Marquer comme lu
                      </Bouton>
                    </form>
                  )}
                </div>
              </Carte>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
