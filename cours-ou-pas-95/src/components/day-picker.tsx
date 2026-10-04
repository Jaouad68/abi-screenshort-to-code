"use client";

import { dayNumber, shortWeekday } from "@/lib/dates";
import type { DisplayStatus } from "@/lib/status";
import { StatusDot } from "./status";

/**
 * Sélecteur de jour (lundi → samedi), façon calendrier iOS.
 * `statusFor` permet d'afficher un point coloré sous chaque jour.
 */
export function DayPicker({
  days,
  value,
  today,
  onChange,
  statusFor,
}: {
  days: string[];
  value: string;
  today: string;
  onChange: (d: string) => void;
  statusFor?: (d: string) => DisplayStatus;
}) {
  return (
    <div role="tablist" aria-label="Jour" className="grid grid-cols-6 gap-1.5">
      {days.map((d) => {
        const selected = d === value;
        const isToday = d === today;
        const past = d < today;
        const st = statusFor?.(d);
        return (
          <button
            key={d}
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(d)}
            className={`pressable flex flex-col items-center gap-0.5 rounded-2xl py-2 transition-colors duration-300 ${
              selected ? "bg-label text-bg shadow-float" : "bg-card text-label shadow-card"
            } ${past && !selected ? "opacity-55" : ""}`}
          >
            <span className={`text-[11px] font-semibold uppercase tracking-wide ${selected ? "opacity-70" : "text-label-2"}`}>
              {shortWeekday(d).replace(".", "")}
            </span>
            <span className="font-display text-[20px] font-bold leading-tight tabular-nums">{dayNumber(d)}</span>
            <span className="flex h-2 items-center">
              {st ? (
                <StatusDot status={st} size={6} />
              ) : isToday ? (
                <span className={`h-1 w-1 rounded-full ${selected ? "bg-bg" : "bg-accent"}`} />
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const i = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div className="relative grid rounded-[10px] bg-fill p-0.5" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      <span
        aria-hidden
        className="absolute inset-y-0.5 left-0.5 rounded-[8px] bg-elevated shadow-[0_3px_8px_rgba(0,0,0,0.12),0_3px_1px_rgba(0,0,0,0.04)] transition-transform duration-300 ease-spring"
        style={{ width: `calc((100% - 4px) / ${options.length})`, transform: `translateX(${i * 100}%)` }}
      />
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          aria-pressed={o.value === value}
          className={`relative z-10 py-1.5 text-[13px] font-semibold transition-colors ${o.value === value ? "text-label" : "text-label-2"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
