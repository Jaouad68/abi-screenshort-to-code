import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { getLycee } from "@/data/lycees";
import { defaultDay, isIsoDate, longDate, relativeDayLabel, todayParis } from "@/lib/dates";
import { computeDayStatus, CONFIDENCE_META, STATUS_META, type DisplayStatus } from "@/lib/status";
import { getStore } from "@/lib/server/store";

export const dynamic = "force-dynamic";

type FontWeight = 600 | 800;
const fontCache = new Map<FontWeight, Promise<ArrayBuffer | null>>();

/** Inter (Google Fonts), chargée une fois par instance ; repli sur la police par défaut. */
function loadInter(weight: FontWeight): Promise<ArrayBuffer | null> {
  let p = fontCache.get(weight);
  if (!p) {
    p = (async () => {
      const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Inter:wght@${weight}`)).text();
      const url = css.match(/src: url\((.+?)\) format\('(?:truetype|opentype)'\)/)?.[1];
      if (!url) return null;
      return (await fetch(url)).arrayBuffer();
    })().catch(() => null);
    fontCache.set(weight, p);
  }
  return p;
}

const COLORS: Record<DisplayStatus, [string, string]> = {
  normal: ["#4ade80", "#15803d"],
  perturbe: ["#fdba74", "#c2410c"],
  bloque: ["#fb7185", "#b91c1c"],
  inconnu: ["#a1a1aa", "#3f3f46"],
};

/** Pictogramme dessiné en formes simples (pas d'emoji, pour rester autonome). */
function Glyph({ status, size }: { status: DisplayStatus; size: number }) {
  const stroke = Math.round(size * 0.1);
  const inner =
    status === "normal" ? (
      <div
        style={{
          width: size * 0.26,
          height: size * 0.5,
          borderRight: `${stroke}px solid white`,
          borderBottom: `${stroke}px solid white`,
          transform: "rotate(45deg) translate(-8%, -12%)",
        }}
      />
    ) : status === "bloque" ? (
      <div style={{ width: size * 0.5, height: stroke, background: "white", borderRadius: stroke }} />
    ) : (
      <div style={{ fontSize: size * 0.6, fontWeight: 800, color: "white", lineHeight: 1 }}>{status === "perturbe" ? "!" : "?"}</div>
    );
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size,
        background: "rgba(255,255,255,0.22)",
        border: `${Math.round(size * 0.04)}px solid rgba(255,255,255,0.55)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {inner}
    </div>
  );
}

/**
 * GET /api/story/{uai}?jour=YYYY-MM-DD&format=story|og
 * Image du statut d'un lycée : story (1080×1920) ou aperçu de lien (1200×630).
 */
export async function GET(request: NextRequest, ctx: { params: Promise<{ uai: string }> }) {
  const { uai } = await ctx.params;
  const lycee = getLycee(uai);
  if (!lycee) return new Response("Lycée inconnu", { status: 404 });

  const today = todayParis();
  const raw = request.nextUrl.searchParams.get("jour");
  const date = isIsoDate(raw) ? raw : defaultDay(today);
  const og = request.nextUrl.searchParams.get("format") === "og";

  const store = getStore();
  const [reports, overrides] = await Promise.all([store.listReports(date, date), store.listOverrides(date, date)]).catch(
    () => [[], []] as const,
  );
  const day = computeDayStatus(
    date,
    reports.filter((r) => r.uai === lycee.uai),
    overrides.find((o) => o.uai === lycee.uai) ?? null,
  );
  const s = day.status;
  const [c1, c2] = COLORS[s];
  const relative = relativeDayLabel(date, today);
  const dayLine = relative === longDate(date) ? relative : `${relative} · ${longDate(date)}`;
  const host = request.headers.get("x-forwarded-host") ?? request.nextUrl.host;
  const nom = lycee.nom.replace(/^Lycée (professionnel )?/, "");
  const confidence = day.confidence ? CONFIDENCE_META[day.confidence].label : null;

  const [semi, heavy] = await Promise.all([loadInter(600), loadInter(800)]);
  const fonts = [
    ...(semi ? [{ name: "Inter", data: semi, weight: 600 as const, style: "normal" as const }] : []),
    ...(heavy ? [{ name: "Inter", data: heavy, weight: 800 as const, style: "normal" as const }] : []),
  ];

  const W = og ? 1200 : 1080;
  const H = og ? 630 : 1920;
  const k = og ? 0.5 : 1;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: `${110 * k}px ${90 * k}px`,
          color: "white",
          background: `radial-gradient(circle at 85% 10%, ${c1} 0%, transparent 55%), linear-gradient(160deg, ${c1} 0%, ${c2} 70%)`,
          fontFamily: fonts.length ? "Inter" : "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 44 * k, fontWeight: 800, letterSpacing: -1 }}>Cours ou Pas ?</div>
          <div
            style={{
              display: "flex",
              fontSize: 30 * k,
              fontWeight: 600,
              padding: `${12 * k}px ${26 * k}px`,
              borderRadius: 999,
              background: "rgba(255,255,255,0.2)",
            }}
          >
            Val d&apos;Oise · 95
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 40 * k, fontWeight: 600, opacity: 0.85, textTransform: "uppercase", letterSpacing: 4 * k }}>
            {lycee.commune}
          </div>
          <div style={{ display: "flex", fontSize: (nom.length > 28 ? 84 : 104) * k, fontWeight: 800, lineHeight: 1.05, marginTop: 14 * k, letterSpacing: -2 }}>
            {nom}
          </div>
          <div style={{ display: "flex", fontSize: 42 * k, fontWeight: 600, opacity: 0.9, marginTop: 50 * k }}>{dayLine}</div>
          <div style={{ display: "flex", alignItems: "center", marginTop: 34 * k }}>
            <Glyph status={s} size={170 * k} />
            <div style={{ display: "flex", flexDirection: "column", marginLeft: 40 * k }}>
              <div style={{ display: "flex", fontSize: (s === "normal" ? 104 : 130) * k, fontWeight: 800, lineHeight: 1, letterSpacing: -3 }}>
                {STATUS_META[s].label}
              </div>
              {confidence && (
                <div style={{ display: "flex", fontSize: 36 * k, fontWeight: 600, opacity: 0.9, marginTop: 14 * k }}>
                  {confidence} · {day.count} signalement{day.count > 1 ? "s" : ""}
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 38 * k, fontWeight: 600, opacity: 0.9 }}>Infos en temps réel, lycée par lycée :</div>
          <div style={{ display: "flex", fontSize: 44 * k, fontWeight: 800, marginTop: 10 * k }}>{host}</div>
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      fonts,
      headers: { "Cache-Control": "public, max-age=60, s-maxage=60" },
    },
  );
}
