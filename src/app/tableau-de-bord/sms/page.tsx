import { requireSalon } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const GABARIT_LABEL: Record<string, string> = {
  CONFIRMATION: "Confirmation",
  RAPPEL_J2: "Rappel J-2",
  ANNULATION: "Accusé annulation",
  NOTIF_GERANT: "Notification gérant",
};

const STATUT_BADGE: Record<string, string> = {
  ENVOYE: "text-sage-d",
  SIMULE: "text-muted",
  ECHEC: "text-danger",
};

export default async function JournalSmsPage() {
  const salon = await requireSalon();

  const logs = await prisma.smsLog.findMany({
    where: { appointment: { salonId: salon.id } },
    include: { appointment: { include: { client: true } } },
    orderBy: { envoyeLe: "desc" },
    take: 100,
  });

  return (
    <div>
      <h1 className="font-serif text-3xl mb-2">Journal SMS</h1>
      <p className="text-muted mb-8">
        {process.env.BREVO_API_KEY
          ? "Envoyés via Brevo."
          : "Aucun fournisseur SMS configuré : les messages ci-dessous sont simulés (non envoyés réellement)."}
      </p>

      <div className="flex flex-col gap-2">
        {logs.length === 0 && <p className="text-muted italic">Aucun SMS pour le moment.</p>}
        {logs.map((log) => (
          <div key={log.id} className="bg-paper rounded-card border border-line px-6 py-4">
            <div className="flex items-center justify-between gap-4 mb-2">
              <div className="flex items-center gap-3">
                <span className="text-xs uppercase font-semibold text-sage-d">
                  {GABARIT_LABEL[log.gabarit] ?? log.gabarit}
                </span>
                <span className="text-sm text-muted">→ {log.destinataire}</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className={`font-semibold uppercase ${STATUT_BADGE[log.statut] ?? ""}`}>
                  {log.statut}
                </span>
                <span className="text-muted">
                  {log.segments} segment{log.segments > 1 ? "s" : ""}
                </span>
              </div>
            </div>
            <p className="text-sm">{log.corps}</p>
            <p className="text-xs text-muted mt-2">
              {log.envoyeLe.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
              {log.appointment.client && ` · ${log.appointment.client.prenom}`}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
