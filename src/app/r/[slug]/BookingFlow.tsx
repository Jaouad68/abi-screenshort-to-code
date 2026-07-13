"use client";

import { useActionState, useEffect, useState } from "react";
import { formatCents } from "@/lib/money";
import { obtenirCreneaux, reserver, type ReservationState } from "./actions";

type ServiceVM = {
  id: string;
  nom: string;
  dureeMin: number;
  prixCents: number;
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

const initialState: ReservationState = {};

export function BookingFlow({
  salonSlug,
  services,
}: {
  salonSlug: string;
  services: ServiceVM[];
}) {
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [date, setDate] = useState(todayISO());
  const [heure, setHeure] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [chargement, setChargement] = useState(false);

  const reserverAction = reserver.bind(null, salonSlug);
  const [state, formAction, pending] = useActionState(reserverAction, initialState);

  useEffect(() => {
    if (!serviceId) return;
    let annule = false;
    setChargement(true);
    setHeure(null);
    obtenirCreneaux(salonSlug, serviceId, date).then((result) => {
      if (!annule) {
        setSlots(result);
        setChargement(false);
      }
    });
    return () => {
      annule = true;
    };
  }, [salonSlug, serviceId, date]);

  if (state.succes) {
    return (
      <div className="bg-sage text-white rounded-card shadow-hero p-8 text-center">
        <p className="uppercase text-xs font-semibold tracking-wide text-sage-l mb-3">
          Rendez-vous confirmé
        </p>
        <p className="font-serif text-2xl mb-2">
          À bientôt, {state.succes.prenom} !
        </p>
        <p className="text-sage-l">
          {state.succes.serviceNom} le{" "}
          {new Date(`${state.succes.date}T00:00:00.000Z`).toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            timeZone: "UTC",
          })}{" "}
          à {state.succes.heure.replace(":", "h")}.
        </p>
      </div>
    );
  }

  const selectedService = services.find((s) => s.id === serviceId);

  return (
    <div className="bg-paper rounded-card shadow-hero p-6 md:p-8 flex flex-col gap-8">
      <section>
        <p className="text-xs uppercase font-semibold text-muted tracking-wide mb-3">
          1 · Votre prestation
        </p>
        <div className="flex flex-col gap-3">
          {services.map((service) => (
            <button
              key={service.id}
              type="button"
              onClick={() => setServiceId(service.id)}
              className={`flex items-center justify-between rounded-control border px-5 py-4 text-left min-h-[48px] transition-colors ${
                serviceId === service.id
                  ? "border-sage bg-sage-l"
                  : "border-line bg-white hover:border-sage-line"
              }`}
            >
              <span>
                <span className="font-semibold block">{service.nom}</span>
                <span className="text-sm text-muted">{service.dureeMin} min</span>
              </span>
              <span className="font-serif text-lg tabular-nums">
                {formatCents(service.prixCents)}
              </span>
            </button>
          ))}
          {services.length === 0 && (
            <p className="text-muted italic">Aucune prestation disponible pour le moment.</p>
          )}
        </div>
      </section>

      {selectedService && (
        <section>
          <p className="text-xs uppercase font-semibold text-muted tracking-wide mb-3">
            2 · Votre créneau
          </p>
          <input
            type="date"
            value={date}
            min={todayISO()}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-control border border-line px-3 py-2 min-h-[44px] mb-4 bg-white"
          />
          {chargement && <p className="text-muted text-sm">Chargement des créneaux...</p>}
          {!chargement && slots.length === 0 && (
            <p className="text-muted italic text-sm">Aucun créneau disponible ce jour-là.</p>
          )}
          <div className="flex flex-wrap gap-2">
            {slots.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setHeure(s)}
                className={`rounded-control border px-4 py-2 min-h-[44px] font-medium transition-colors ${
                  heure === s
                    ? "border-sage bg-sage text-white"
                    : "border-line bg-white hover:border-sage-line"
                }`}
              >
                {s.replace(":", "h")}
              </button>
            ))}
          </div>
        </section>
      )}

      {selectedService && heure && (
        <section>
          <p className="text-xs uppercase font-semibold text-muted tracking-wide mb-3">
            3 · Vos coordonnées
          </p>
          <form action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="serviceId" value={selectedService.id} />
            <input type="hidden" name="date" value={date} />
            <input type="hidden" name="heure" value={heure} />

            <label className="flex flex-col gap-1">
              <span className="text-sm font-semibold">Prénom</span>
              <input
                name="prenom"
                required
                className="rounded-control border border-line px-4 py-3 min-h-[48px] bg-white"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-semibold">Mobile</span>
              <input
                name="telephone"
                required
                placeholder="06 12 34 56 78"
                className="rounded-control border border-line px-4 py-3 min-h-[48px] bg-white"
              />
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="consentementSms" className="mt-1" />
              <span>
                J&apos;accepte de recevoir un SMS de confirmation et un rappel pour ce
                rendez-vous.
              </span>
            </label>

            {state.error && <p className="text-danger text-sm">{state.error}</p>}

            <button
              type="submit"
              disabled={pending}
              className="rounded-pill bg-ink text-white px-6 py-3 font-semibold hover:bg-ink-2 transition-colors min-h-[48px] disabled:opacity-60"
            >
              {pending ? "Confirmation..." : "Confirmer le rendez-vous"}
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
