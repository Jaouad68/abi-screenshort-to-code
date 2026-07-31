import Link from "next/link";
import { requireSalon } from "@/lib/auth";
import { dateISOActuelle, moisActuelISO } from "@/lib/datetime";
import type { ReglagesAcompte } from "@/lib/horaires";
import { VueJour } from "./VueJour";
import { VueSemaine } from "./VueSemaine";
import { VueMois } from "./VueMois";

type Vue = "jour" | "semaine" | "mois";

function VueSwitcher({ vue, date }: { vue: Vue; date: string }) {
  const onglets: { vue: Vue; label: string }[] = [
    { vue: "jour", label: "Jour" },
    { vue: "semaine", label: "Semaine" },
    { vue: "mois", label: "Mois" },
  ];

  return (
    <div className="flex gap-2 mb-6 text-sm font-semibold">
      {onglets.map((o) => (
        <Link
          key={o.vue}
          href={o.vue === "jour" ? `/tableau-de-bord?date=${date}` : `/tableau-de-bord?vue=${o.vue}&date=${date}`}
          className={`rounded-pill px-4 py-1.5 min-h-[36px] flex items-center transition-colors ${
            vue === o.vue ? "bg-ink text-white" : "bg-white border border-line hover:border-sage-line"
          }`}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}

export default async function TableauDeBordPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; vue?: string }>;
}) {
  const salon = await requireSalon();
  const { date: dateParam, vue: vueParam } = await searchParams;
  const vue: Vue = vueParam === "semaine" || vueParam === "mois" ? vueParam : "jour";
  const date = dateParam ?? (vue === "mois" ? `${moisActuelISO()}-01` : dateISOActuelle());

  return (
    <div>
      <VueSwitcher vue={vue} date={date} />
      {vue === "jour" && (
        <VueJour salonId={salon.id} date={date} reglagesAcompte={salon.reglagesAcompte as ReglagesAcompte} />
      )}
      {vue === "semaine" && <VueSemaine salonId={salon.id} date={date} />}
      {vue === "mois" && <VueMois salonId={salon.id} moisISO={date.slice(0, 7)} />}
    </div>
  );
}
