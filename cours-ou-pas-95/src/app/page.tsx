import { currentWeekStart, defaultDay, isIsoDate, todayParis, weekdayIndex } from "@/lib/dates";
import { HomeView } from "./home-view";

export default async function Page({ searchParams }: { searchParams: Promise<{ jour?: string }> }) {
  const { jour } = await searchParams;
  const today = todayParis();
  const thisWeek = currentWeekStart(today);
  const initialDay = isIsoDate(jour) && weekdayIndex(jour) < 6 && jour >= thisWeek ? jour : defaultDay(today);
  return <HomeView today={today} thisWeek={thisWeek} initialDay={initialDay} />;
}
