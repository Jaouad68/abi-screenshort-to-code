import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLycee } from "@/data/lycees";
import { addDays, currentWeekStart, defaultDay, isIsoDate, todayParis, weekdayIndex } from "@/lib/dates";
import { LyceeView } from "./lycee-view";

type Props = {
  params: Promise<{ uai: string }>;
  searchParams: Promise<{ jour?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lycee = getLycee((await params).uai);
  if (!lycee) return {};
  return {
    title: `${lycee.nom} (${lycee.commune})`,
    description: `Y a-t-il cours au ${lycee.nom} à ${lycee.commune} ? Grèves et blocages en temps réel, jour par jour.`,
  };
}

export default async function Page({ params, searchParams }: Props) {
  const [{ uai }, { jour }] = await Promise.all([params, searchParams]);
  const lycee = getLycee(uai);
  if (!lycee) notFound();

  const today = todayParis();
  const thisWeek = currentWeekStart(today);
  const valid = isIsoDate(jour) && weekdayIndex(jour) < 6 && jour >= thisWeek && jour < addDays(thisWeek, 14);
  return <LyceeView lycee={lycee} today={today} initialDay={valid ? jour : defaultDay(today)} />;
}
