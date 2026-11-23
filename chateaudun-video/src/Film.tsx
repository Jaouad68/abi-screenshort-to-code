import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  Sequence,
  interpolate,
  random,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { SERIF, SANS } from "./fonts";
import { timeline, credits, Item, Shot } from "./shots";

export const FPS = 30;
export const W = 1920;
export const H = 1080;
const XF = 30; // fondu enchaîné : 1 s

const ease = Easing.bezier(0.33, 0, 0.2, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// ---------- Calcul du montage ----------
type Placed = Item & { from: number; dur: number };
const placed: Placed[] = [];
{
  let t = 0;
  for (const it of timeline) {
    const dur = Math.round(it.sec * FPS);
    placed.push({ ...it, from: t, dur });
    t += dur;
  }
}
export const TOTAL = placed.reduce((a, p) => a + p.dur, 0) + XF;

// ---------- Plan photo avec mouvement de caméra ----------
const KenBurns: React.FC<{ shot: Shot; dur: number }> = ({ shot, dur }) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [0, dur + XF], [0, 1], { ...clamp, easing: Easing.inOut(Easing.sin) });
  const [s0, s1] = shot.z ?? [1.04, 1.14];
  const [x0, y0, x1, y1] = shot.o ?? [50, 50, 50, 50];
  const sc = s0 + (s1 - s0) * p;
  const ox = x0 + (x1 - x0) * p;
  const oy = y0 + (y1 - y0) * p;
  const src = staticFile(`photos/${shot.file}`);
  const mode = shot.mode ?? "cover";
  if (mode === "cover") {
    return (
      <AbsoluteFill style={{ overflow: "hidden", background: "#000" }}>
        <Img
          src={src}
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: `${ox}% ${oy}%`,
            transformOrigin: `${ox}% ${oy}%`,
            transform: `scale(${sc})`,
            filter: "contrast(1.05) saturate(1.06)",
          }}
        />
      </AbsoluteFill>
    );
  }
  // fond flouté + image entière (portrait, basse définition, carte postale)
  const card = mode === "card";
  const rot = card ? interpolate(p, [0, 1], [-1.6, -0.6]) : 0;
  return (
    <AbsoluteFill style={{ overflow: "hidden", background: "#120f0c" }}>
      <Img
        src={src}
        style={{
          position: "absolute",
          inset: -60,
          width: "calc(100% + 120px)",
          height: "calc(100% + 120px)",
          objectFit: "cover",
          filter: card ? "blur(40px) brightness(0.35) sepia(0.4)" : "blur(36px) brightness(0.55)",
          transform: `scale(${1.1 + 0.05 * p})`,
        }}
      />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <Img
          src={src}
          style={{
            height: card ? "74%" : "88%",
            width: "auto",
            maxWidth: "80%",
            objectFit: "contain",
            transform: `scale(${sc}) rotate(${rot}deg)`,
            boxShadow: card ? "0 40px 90px rgba(0,0,0,0.7)" : "0 30px 80px rgba(0,0,0,0.5)",
            border: card ? "14px solid #efe6d4" : "none",
            borderRadius: card ? 4 : 6,
            filter: card ? "sepia(0.25) contrast(1.05)" : "contrast(1.04) saturate(1.05)",
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------- Légende de lieu (bas gauche) ----------
const Caption: React.FC<{ title: string; sub?: string; dur: number }> = ({ title, sub, dur }) => {
  const f = useCurrentFrame();
  const inP = interpolate(f, [XF, XF + 28], [0, 1], { ...clamp, easing: ease });
  const outP = interpolate(f, [dur - 10, dur + 10], [1, 0], clamp);
  const line = interpolate(f, [XF + 6, XF + 40], [0, 1], { ...clamp, easing: ease });
  return (
    <>
    <AbsoluteFill
      style={{
        background: "linear-gradient(to top, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.25) 28%, transparent 45%)",
        opacity: inP * outP,
      }}
    />
    <div
      style={{
        position: "absolute",
        left: 120,
        bottom: 110,
        opacity: inP * outP,
        transform: `translateY(${(1 - inP) * 24}px)`,
        color: "#fff",
        textShadow: "0 2px 24px rgba(0,0,0,0.55)",
        maxWidth: 1100,
      }}
    >
      <div style={{ width: 90 * line, height: 3, background: "#E3B778", marginBottom: 22 }} />
      <div style={{ fontFamily: SERIF, fontSize: 62, lineHeight: 1.1 }}>{title}</div>
      {sub && (
        <div style={{ fontFamily: SANS, fontSize: 34, marginTop: 14, opacity: 0.95, lineHeight: 1.4 }}>{sub}</div>
      )}
    </div>
    </>
  );
};

// ---------- Carte de chapitre ----------
const ChapterCard: React.FC<{ n: string; title: string; sub: string; dur: number }> = ({ n, title, sub, dur }) => {
  const f = useCurrentFrame();
  const a = interpolate(f, [XF - 6, XF + 24], [0, 1], { ...clamp, easing: ease });
  const out = interpolate(f, [dur - 14, dur + 8], [1, 0], clamp);
  const ls = interpolate(f, [XF, dur], [14, 22], clamp);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", color: "#fff", opacity: out }}>
      <AbsoluteFill style={{ background: "rgba(10,8,6,0.45)", opacity: a }} />
      <div style={{ textAlign: "center", opacity: a, transform: `translateY(${(1 - a) * 20}px)` }}>
        <div style={{ fontFamily: SANS, fontSize: 26, letterSpacing: ls, color: "#E3B778", fontWeight: 700 }}>
          CHAPITRE {n}
        </div>
        <div style={{ fontFamily: SERIF, fontSize: 132, margin: "26px 0 18px", textShadow: "0 4px 40px rgba(0,0,0,0.5)" }}>
          {title}
        </div>
        <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 40, opacity: 0.9 }}>{sub}</div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- Titre d'ouverture ----------
const OpeningTitle: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const letters = "CHÂTEAUDUN".split("");
  const out = interpolate(f, [dur - 20, dur + 10], [1, 0], clamp);
  const sub = interpolate(f, [100, 140], [0, 1], { ...clamp, easing: ease });
  const top = interpolate(f, [40, 80], [0, 1], { ...clamp, easing: ease });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", color: "#fff", opacity: out }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0.35), rgba(0,0,0,0.05) 70%)" }} />
      <div style={{ textAlign: "center", textShadow: "0 4px 50px rgba(0,0,0,0.6)" }}>
        <div style={{ fontFamily: SANS, fontSize: 26, letterSpacing: 14, color: "#E3B778", fontWeight: 700, opacity: top }}>
          EURE-ET-LOIR · VALLÉE DU LOIR
        </div>
        <div style={{ fontFamily: SERIF, fontSize: 200, letterSpacing: 18, margin: "20px 0" }}>
          {letters.map((l, i) => {
            const p = interpolate(f, [50 + i * 5, 90 + i * 5], [0, 1], { ...clamp, easing: ease });
            return (
              <span key={i} style={{ display: "inline-block", opacity: p, filter: `blur(${(1 - p) * 12}px)` }}>
                {l}
              </span>
            );
          })}
        </div>
        <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 46, opacity: sub }}>
          Une cité médiévale perchée au-dessus du Loir
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- Carte de situation ----------
const project = (lon: number, lat: number) => {
  // projection équirectangulaire centrée sur la zone
  const cx = 1.75, cy = 48.4, k = 700;
  return [W / 2 + (lon - cx) * k * Math.cos((cy * Math.PI) / 180), H / 2 - (lat - cy) * k];
};
const cities = [
  { n: "Paris", lon: 2.352, lat: 48.857, d: 0 },
  { n: "Chartres", lon: 1.489, lat: 48.446, d: 20 },
  { n: "Orléans", lon: 1.909, lat: 47.903, d: 30 },
  { n: "Châteaudun", lon: 1.331, lat: 48.071, d: 50, main: true },
];
const MapScene: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const fadeIn = interpolate(f, [0, XF], [0, 1], clamp);
  const out = interpolate(f, [dur - 10, dur + XF], [1, 0], clamp);
  const zoom = interpolate(f, [0, dur], [1, 1.12], { ...clamp, easing: Easing.inOut(Easing.sin) });
  const [cx, cy] = project(1.331, 48.071);
  const routes = [
    { from: "Paris", km: "≈ 130 km", d: 60 },
    { from: "Chartres", km: "≈ 45 km", d: 90 },
    { from: "Orléans", km: "≈ 50 km", d: 120 },
  ];
  return (
    <AbsoluteFill style={{ background: "#EFE8DC", opacity: fadeIn * out }}>
      <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: `${cx}px ${cy}px` }}>
        <svg width={W} height={H}>
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M60 0H0V60" fill="none" stroke="#D9CFBF" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width={W} height={H} fill="url(#grid)" />
          {routes.map((r) => {
            const c = cities.find((x) => x.n === r.from)!;
            const [x, y] = project(c.lon, c.lat);
            const p = interpolate(f, [r.d, r.d + 50], [0, 1], { ...clamp, easing: ease });
            const len = Math.hypot(cx - x, cy - y);
            const lp = interpolate(f, [r.d + 40, r.d + 60], [0, 1], clamp);
            return (
              <g key={r.from}>
                <line
                  x1={x}
                  y1={y}
                  x2={cx}
                  y2={cy}
                  stroke="#B5523A"
                  strokeWidth={4}
                  strokeDasharray={`${len}`}
                  strokeDashoffset={len * (1 - p)}
                  strokeLinecap="round"
                />
                <text
                  x={(x + cx) / 2 + 16}
                  y={(y + cy) / 2 - 12}
                  fontFamily={SANS}
                  fontSize={28}
                  fill="#7A3A2A"
                  opacity={lp}
                >
                  {r.km}
                </text>
              </g>
            );
          })}
          {cities.map((c) => {
            const [x, y] = project(c.lon, c.lat);
            const p = interpolate(f, [c.d, c.d + 20], [0, 1], clamp);
            const pulse = c.main ? 1 + 0.5 * ((f % 60) / 60) : 1;
            return (
              <g key={c.n} opacity={p}>
                {c.main && <circle cx={x} cy={y} r={26 * pulse} fill="none" stroke="#B5523A" strokeWidth={3} opacity={1 - (f % 60) / 60} />}
                <circle cx={x} cy={y} r={c.main ? 16 : 10} fill={c.main ? "#B5523A" : "#3A3330"} />
                <text
                  x={x + (c.main ? -30 : 22)}
                  y={y + (c.main ? 60 : 10)}
                  textAnchor={c.main ? "end" : "start"}
                  fontFamily={c.main ? SERIF : SANS}
                  fontSize={c.main ? 58 : 34}
                  fill="#2A2420"
                >
                  {c.n}
                </text>
              </g>
            );
          })}
        </svg>
      </AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: 140,
          top: 120,
          textAlign: "left",
          color: "#2A2420",
          opacity: interpolate(f, [140, 170], [0, 1], clamp),
        }}
      >
        <div style={{ fontFamily: SANS, fontSize: 24, letterSpacing: 8, color: "#B5523A", fontWeight: 700 }}>
          CENTRE-VAL DE LOIRE
        </div>
        <div style={{ fontFamily: SERIF, fontSize: 64, marginTop: 10 }}>Entre Beauce et Perche</div>
        <div style={{ fontFamily: SANS, fontSize: 30, marginTop: 10, opacity: 0.75 }}>Châteaudun · 28200</div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- Fin : informations + crédits ----------
const EndCard: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const a = interpolate(f, [0, XF + 10], [0, 1], clamp);
  const t = interpolate(f, [XF, XF + 30], [0, 1], { ...clamp, easing: ease });
  const cr = interpolate(f, [XF + 170, XF + 210], [0, 1], { ...clamp, easing: ease });
  const t2 = interpolate(f, [XF + 150, XF + 180], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ background: "#14110E", opacity: a, color: "#F2EBE1" }}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: t * t2 }}>
        <div style={{ fontFamily: SANS, fontSize: 26, letterSpacing: 12, color: "#E3B778", fontWeight: 700 }}>
          À BIENTÔT À
        </div>
        <div style={{ fontFamily: SERIF, fontSize: 160, letterSpacing: 14, margin: "18px 0" }}>Châteaudun</div>
        <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 40, opacity: 0.85 }}>
          Château · Vieille ville · Vallée du Loir · Grottes du Foulon
        </div>
        <div style={{ fontFamily: SANS, fontSize: 28, opacity: 0.6, marginTop: 40 }}>
          Renseignements : Office de tourisme du Grand Châteaudun
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ padding: "0 160px", justifyContent: "center", opacity: cr }}>
        <div style={{ fontFamily: SANS, fontSize: 26, letterSpacing: 10, color: "#E3B778", fontWeight: 700, marginBottom: 34 }}>
          CRÉDITS IMAGES
        </div>
        <div style={{ fontFamily: SANS, fontSize: 30, lineHeight: 1.7, opacity: 0.88 }}>
          {credits.map((c, j) => (
            <div key={j}>{c}</div>
          ))}
        </div>
        <div style={{ fontFamily: SANS, fontSize: 24, opacity: 0.55, marginTop: 40 }}>
          Images recadrées et animées pour ce film · Musique originale · Montage réalisé avec Remotion
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------- Grain + vignette ----------
const Grain: React.FC = () => {
  const f = useCurrentFrame();
  const seed = Math.floor(random(`g${Math.floor(f / 2)}`) * 1000);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.38) 100%)" }} />
      <svg width={W} height={H} style={{ position: "absolute", opacity: 0.07, mixBlendMode: "overlay" }}>
        <filter id="n">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={seed} />
        </filter>
        <rect width={W} height={H} filter="url(#n)" />
      </svg>
    </AbsoluteFill>
  );
};

// ---------- Élément du montage ----------
const Block: React.FC<{ it: Placed }> = ({ it }) => {
  const f = useCurrentFrame();
  const fade = interpolate(f, [0, XF], [0, 1], { ...clamp, easing: Easing.inOut(Easing.quad) });
  if (it.kind === "map") return <MapScene dur={it.dur} />;
  if (it.kind === "end") return <EndCard dur={it.dur} />;
  return (
    <AbsoluteFill style={{ opacity: it.first ? interpolate(f, [0, 45], [0, 1], clamp) : fade }}>
      <KenBurns shot={it.shot!} dur={it.dur} />
      {it.kind === "opening" && <OpeningTitle dur={it.dur} />}
      {it.kind === "chapter" && <ChapterCard n={it.n!} title={it.title!} sub={it.sub!} dur={it.dur} />}
      {it.kind === "photo" && it.title && <Caption title={it.title} sub={it.sub} dur={it.dur} />}
    </AbsoluteFill>
  );
};

export const Film: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    {placed.map((it, i) => (
      <Sequence key={i} from={it.from} durationInFrames={it.dur + XF}>
        <Block it={it} />
      </Sequence>
    ))}
    <Grain />
    <Audio
      src={staticFile("musique.mp3")}
      volume={(f) => 0.85 * interpolate(f, [0, 45, TOTAL - 75, TOTAL], [0, 1, 1, 0], clamp)}
    />
  </AbsoluteFill>
);
