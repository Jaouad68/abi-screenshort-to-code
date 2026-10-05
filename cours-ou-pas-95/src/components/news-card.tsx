import type { NewsMention } from "@/lib/server/store";
import { timeAgo } from "@/lib/dates";
import { IconChevronRight, IconNews } from "./icons";

/** Encart « Dans la presse » : articles récents détectés par la veille automatique. */
export function NewsCard({ mentions, now }: { mentions: NewsMention[]; now: number }) {
  if (mentions.length === 0) return null;
  return (
    <section className="mt-5">
      <h2 className="mb-1.5 flex items-center gap-1.5 px-4 text-[13px] font-semibold uppercase tracking-wide text-label-2">
        <IconNews width={15} height={15} /> Dans la presse
      </h2>
      <ul className="overflow-hidden rounded-[22px] bg-card shadow-card">
        {mentions.map((m) => (
          <li key={m.id} className="border-b border-separator last:border-0">
            <a href={m.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-4 py-3 active:bg-fill">
              <div className="min-w-0 flex-1">
                <div className="line-clamp-2 text-[15px] font-semibold leading-snug">{m.title}</div>
                <div className="mt-0.5 text-[13px] text-label-2">
                  {m.source} · {timeAgo(m.publishedAt, now)}
                </div>
              </div>
              <IconChevronRight width={16} height={16} className="shrink-0 text-label-3" />
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-2 px-4 text-[12px] leading-snug text-label-3">
        Articles repérés automatiquement. Ils informent mais ne changent pas le statut du lycée.
      </p>
    </section>
  );
}
