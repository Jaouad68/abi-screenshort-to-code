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

type PraticienVM = {
  id: string;
  nom: string;
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function EtapeTitre({ numero, label }: { numero: number; label: string }) {
  return (
    <p className="flex items-center gap-2 text-xs uppercase font-semibold text-muted tracking-wide mb-3">
      <span className="w-5 h-5 rounded-full bg-ink text-white flex items-center justify-center text-[11px] font-sans font-bold shrink-0">
        {numero}
      </span>
      {label}
    </p>
  );
}

const initialState: ReservationState = {};

export function BookingFlow({
  salonSlug,
  services,
  praticiens,
}: {
  salonSlug: string;
  services: ServiceVM[];
  praticiens: PraticienVM[];
}) {
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [praticienId, setPraticienId] = useState<string | null>(null);
  const [date, setDate] = useState(todayISO());
  const [heure, setHeure] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [chargement, setChargement] = useState(false);

  const reserverAction = reserver.bind(null, salonSlug);
  const [state, formAction, pending] = useActionState(reserverAction, initialState);

  useEffect(() => {
    if (!serviceId || !praticienId) return;
    let annule = false;
    obtenirCreneaux(salonSlug, serviceId, praticienId, date).then((result) => {
      if (!annule) {
        setSlots(result);
        setChargement(false);
      }
    });
    return () => {
      annule = true;
    };
  }, [salonSlug, serviceId, praticienId, date]);

  function choisirService(id: string) {
    setServiceId(id);
    // Skip the practitioner step entirely when there's only one to pick from.
    if (praticiens.length === 1) {
      setPraticienId(praticiens[0].id);
      setChargement(true);
    } else {
      setPraticienId(null);
    }
    setHeure(null);
  }

  function choisirPraticien(id: string) {
    setPraticienId(id);
    setHeure(null);
    setChargement(true);
  }

  function changerDate(value: string) {
    setDate(value);
    setHeure(null);
    setChargement(true);
  }

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
        {state.succes.acompteDuCents !== undefined && (
          <p className="text-sage-l mt-4 pt-4 border-t border-white/20">
            Un acompte de {formatCents(state.succes.acompteDuCents)} est demandé pour ce
            rendez-vous. Le salon vous recontactera pour le règlement.
          </p>
        )}
      </div>
    );
  }

  const selectedService = services.find((s) => s.id === serviceId);
  const selectedPraticien = praticiens.find((p) => p.id === praticienId);

  return (
    <div className="bg-paper rounded-card shadow-hero p-6 md:p-8 flex flex-col gap-8">
      <section>
        <EtapeTitre numero={1} label="Votre prestation" />
        <div className="flex flex-col gap-3">
          {services.map((service) => (
            <button
              key={service.id}
              type="button"
              onClick={() => choisirService(service.id)}
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
          <EtapeTitre numero={2} label="Votre praticien" />
          <div className="flex flex-wrap gap-2">
            {praticiens.map((praticien) => (
              <button
                key={praticien.id}
                type="button"
                onClick={() => choisirPraticien(praticien.id)}
                className={`rounded-control border px-4 py-2 min-h-[44px] font-medium transition-colors ${
                  praticienId === praticien.id
                    ? "border-sage bg-sage text-white"
                    : "border-line bg-white hover:border-sage-line"
                }`}
              >
                {praticien.nom}
              </button>
            ))}
          </div>
          {praticiens.length === 0 && (
            <p className="text-muted italic text-sm">Aucun praticien disponible pour le moment.</p>
          )}
        </section>
      )}

      {selectedService && selectedPraticien && (
        <section>
          <EtapeTitre numero={3} label="Votre créneau" />
          <input
            type="date"
            value={date}
            min={todayISO()}
            onChange={(e) => changerDate(e.target.value)}
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

      {selectedService && selectedPraticien && heure && (
        <section>
          <EtapeTitre numero={4} label="Vos coordonnées" />
          <form action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="serviceId" value={selectedService.id} />
            <input type="hidden" name="praticienId" value={selectedPraticien.id} />
            <input type="hidden" name="date" value={date} />
            <input type="hidden" name="heure" value={heure} />
            {/* Honeypot: hidden from real visitors, bots that auto-fill every field get caught. */}
            <input
              type="text"
              name="site_web"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute -left-[9999px] w-px h-px overflow-hidden"
            />

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
            <label className="flex flex-col gap-1">
              <span className="text-sm font-semibold">E-mail (optionnel)</span>
              <input
                type="email"
                name="email"
                placeholder="vous@exemple.fr"
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
