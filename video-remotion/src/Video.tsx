import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { SERIF, SANS, MONO } from "./fonts";

export const FPS = 30;
const s = (sec: number) => Math.round(sec * FPS);

// ---------- Charte ----------
const C = {
  bg: "#F3EFEA",
  ink: "#1A1714",
  muted: "#6E6862",
  accent: "#C2654A",
  code: "#2A2928",
  codeLabel: "#A8A39D",
  green: "#E7EFE4",
  peach: "#F8E5DA",
  line: "#DDD6CE",
};
const PAD = 96;

// ---------- Plan de montage (secondes) ----------
const HOOK = s(8);
const INTRO = s(12);
const STEP = s(18);
const OUTRO = s(10);
export const TOTAL = HOOK + INTRO + STEP * 5 + OUTRO; // 120 s

// ---------- Outils d'animation ----------
const ease = Easing.bezier(0.22, 1, 0.36, 1);

const useIn = (delay: number, dur = 18) => {
  const f = useCurrentFrame();
  return interpolate(f, [delay, delay + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
};

const Rise: React.FC<{ delay?: number; dist?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  delay = 0,
  dist = 40,
  children,
  style,
}) => {
  const p = useIn(delay);
  return (
    <div style={{ opacity: p, transform: `translateY(${(1 - p) * dist}px)`, ...style }}>{children}</div>
  );
};

// Fondu d'entrée et de sortie d'une scène
const SceneFade: React.FC<{ dur: number; children: React.ReactNode }> = ({ dur, children }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 10, dur - 12, dur], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(f, [dur - 12, dur], [0, -30], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity: o, transform: `translateY(${y}px)` }}>{children}</AbsoluteFill>;
};

// ---------- Fond papier ----------
const Paper: React.FC = () => (
  <AbsoluteFill
    style={{
      backgroundColor: C.bg,
      backgroundImage:
        "repeating-linear-gradient(0deg, rgba(0,0,0,0.018) 0 1px, transparent 1px 4px), repeating-linear-gradient(90deg, rgba(0,0,0,0.014) 0 1px, transparent 1px 4px)",
    }}
  />
);

// ---------- Éléments de la charte ----------
const Header: React.FC<{ label: string; counter: string }> = ({ label, counter }) => {
  const p = useIn(0, 14);
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        opacity: p,
        fontFamily: SANS,
      }}
    >
      <span style={{ color: C.accent, fontSize: 34, fontWeight: 700, letterSpacing: 7 }}>{label}</span>
      <span style={{ color: C.muted, fontSize: 32 }}>{counter}</span>
    </div>
  );
};

const Title: React.FC<{ text: string; delay?: number; size?: number }> = ({ text, delay = 4, size = 124 }) => {
  const f = useCurrentFrame();
  const words = text.split(" ");
  return (
    <div style={{ fontFamily: SERIF, fontSize: size, lineHeight: 1.05, color: C.ink, letterSpacing: -2 }}>
      {words.map((w, i) => {
        const p = interpolate(f, [delay + i * 4, delay + i * 4 + 20], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: ease,
        });
        return (
          <span key={i} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "bottom", paddingBottom: 12 }}>
            <span style={{ display: "inline-block", transform: `translateY(${(1 - p) * 110}%)` }}>
              {w}
              {i < words.length - 1 ? " " : ""}
            </span>
          </span>
        );
      })}
    </div>
  );
};

const Typewriter: React.FC<{ text: string; start: number; cps?: number }> = ({ text, start, cps = 38 }) => {
  const f = useCurrentFrame();
  const n = Math.max(0, Math.min(text.length, Math.floor(((f - start) / FPS) * cps)));
  const done = n >= text.length;
  const blink = Math.floor(f / 15) % 2 === 0;
  return (
    <span>
      {text.slice(0, n)}
      <span
        style={{
          display: "inline-block",
          width: 22,
          height: 44,
          marginLeft: 4,
          verticalAlign: "-8px",
          background: C.accent,
          opacity: done ? (blink ? 0.9 : 0) : 0.9,
        }}
      />
    </span>
  );
};

const PromptBox: React.FC<{ text: string; delay: number }> = ({ text, delay }) => {
  const f = useCurrentFrame();
  const p = useIn(delay, 20);
  const typedEnd = delay + 14 + (text.length / 38) * FPS;
  const copied = f > typedEnd + 20;
  const flash = interpolate(f, [typedEnd + 20, typedEnd + 28, typedEnd + 50], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        opacity: p,
        transform: `translateY(${(1 - p) * 50}px) scale(${0.97 + 0.03 * p})`,
        background: C.code,
        borderRadius: 34,
        padding: "48px 52px 54px",
        boxShadow: `0 30px 60px -30px rgba(26,23,20,0.45), 0 0 0 ${flash * 6}px rgba(194,101,74,${flash * 0.6})`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: SANS,
          fontSize: 27,
          letterSpacing: 4,
          color: C.codeLabel,
          marginBottom: 26,
        }}
      >
        <span>PROMPT À COPIER</span>
        <span style={{ color: copied ? "#9FD3A7" : C.codeLabel, letterSpacing: 2 }}>{copied ? "✓ COPIÉ" : "⧉"}</span>
      </div>
      <div style={{ fontFamily: MONO, fontSize: 40, lineHeight: 1.45, color: "#F1ECE6" }}>
        <Typewriter text={text} start={delay + 14} />
      </div>
    </div>
  );
};

const Card: React.FC<{ tag: string; text: string; bg: string; delay: number }> = ({ tag, text, bg, delay }) => {
  const { fps } = useVideoConfig();
  const f = useCurrentFrame();
  const sp = spring({ frame: f - delay, fps, config: { damping: 16, mass: 0.8 } });
  return (
    <div
      style={{
        flex: 1,
        background: bg,
        borderRadius: 30,
        padding: "40px 40px 46px",
        opacity: Math.min(1, sp * 1.4),
        transform: `translateY(${(1 - sp) * 80}px)`,
      }}
    >
      <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 27, letterSpacing: 4, color: C.ink, marginBottom: 20 }}>
        {tag}
      </div>
      <div style={{ fontFamily: SANS, fontSize: 44, lineHeight: 1.3, color: C.ink }}>{text}</div>
    </div>
  );
};

// ---------- Démos animées propres à chaque étape ----------
const DemoFrame: React.FC<{ delay: number; children: React.ReactNode; height?: number }> = ({
  delay,
  children,
  height = 380,
}) => {
  const p = useIn(delay, 20);
  return (
    <div
      style={{
        height,
        opacity: p,
        transform: `translateY(${(1 - p) * 40}px)`,
        border: `2px solid ${C.line}`,
        borderRadius: 30,
        background: "rgba(255,255,255,0.45)",
        padding: 40,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
};

const TerminalDemo: React.FC<{ delay: number }> = ({ delay }) => {
  const f = useCurrentFrame();
  const lines = [
    { t: "$ npx create-video@latest", c: C.ink },
    { t: "  Explication : crée la structure du projet", c: C.muted },
    { t: "$ npm install", c: C.ink },
    { t: "  ✓ 214 paquets installés", c: "#4E8A5A" },
    { t: "$ npm run dev", c: C.ink },
    { t: "  → Aperçu prêt sur localhost:3000", c: C.accent },
  ];
  return (
    <DemoFrame delay={delay}>
      <div style={{ fontFamily: MONO, fontSize: 32, lineHeight: 1.55 }}>
        {lines.map((l, i) => {
          const o = interpolate(f, [delay + 20 + i * 14, delay + 28 + i * 14], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div key={i} style={{ color: l.c, opacity: o, transform: `translateX(${(1 - o) * -20}px)` }}>
              {l.t}
            </div>
          );
        })}
      </div>
    </DemoFrame>
  );
};

const StoryboardDemo: React.FC<{ delay: number }> = ({ delay }) => {
  const f = useCurrentFrame();
  const scenes = [
    { name: "Scène 1", desc: "Titre qui monte", d: 3, col: C.accent },
    { name: "Scène 2", desc: "3 chiffres clés", d: 7, col: "#8A9A7B" },
    { name: "Scène 3", desc: "Appel à l'action", d: 5, col: "#D9A35B" },
  ];
  const total = 15;
  const head = interpolate(f, [delay + 70, delay + 300], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  let acc = 0;
  return (
    <DemoFrame delay={delay}>
      <div style={{ display: "flex", flexDirection: "column", gap: 22, fontFamily: SANS }}>
        {scenes.map((sc, i) => {
          const o = interpolate(f, [delay + 14 + i * 12, delay + 30 + i * 12], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: ease,
          });
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 22, opacity: o }}>
              <div style={{ width: 18, height: 18, borderRadius: 9, background: sc.col }} />
              <div style={{ fontSize: 36, fontWeight: 700, width: 180 }}>{sc.name}</div>
              <div style={{ fontSize: 36, color: C.muted, flex: 1 }}>{sc.desc}</div>
              <div style={{ fontFamily: MONO, fontSize: 32 }}>{sc.d}s</div>
            </div>
          );
        })}
        <div style={{ position: "relative", height: 56, marginTop: 14, display: "flex", borderRadius: 14, overflow: "hidden" }}>
          {scenes.map((sc, i) => {
            const w = interpolate(f, [delay + 40 + i * 10, delay + 62 + i * 10], [0, (sc.d / total) * 100], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: ease,
            });
            acc += sc.d;
            return <div key={i} style={{ width: `${w}%`, background: sc.col, opacity: 0.85 }} />;
          })}
          <div
            style={{
              position: "absolute",
              left: `${head * 100}%`,
              top: -6,
              bottom: -6,
              width: 5,
              background: C.ink,
              opacity: head > 0 ? 1 : 0,
            }}
          />
        </div>
      </div>
    </DemoFrame>
  );
};

const PreviewDemo: React.FC<{ delay: number }> = ({ delay }) => {
  const f = useCurrentFrame();
  const scrub = interpolate(f, [delay + 20, delay + 90], [0.05, 0.47], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
  const fixAt = delay + 230;
  const fixed = f > fixAt;
  const bad = interpolate(f, [delay + 95, delay + 110], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const shift = interpolate(f, [fixAt, fixAt + 20], [46, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
  const sec = (scrub * 15).toFixed(1).replace(".", ",");
  return (
    <DemoFrame delay={delay}>
      <div style={{ display: "flex", gap: 40, height: "100%" }}>
        {/* mini écran vertical */}
        <div
          style={{
            width: 170,
            borderRadius: 22,
            background: C.ink,
            position: "relative",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 22 + shift,
              top: 90,
              right: 22,
              height: 20,
              borderRadius: 6,
              background: "#F1ECE6",
            }}
          />
          <div style={{ position: "absolute", left: 22, top: 124, width: 90, height: 14, borderRadius: 6, background: C.accent }} />
          {!fixed && (
            <div
              style={{
                position: "absolute",
                left: 10,
                top: 78,
                right: 6,
                height: 44,
                border: `4px solid #E5484D`,
                borderRadius: 10,
                opacity: bad,
              }}
            />
          )}
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", fontFamily: SANS }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 64, color: C.ink }}>{sec}s</div>
            <div style={{ fontSize: 34, color: fixed ? "#4E8A5A" : "#C2403F", marginTop: 8, opacity: bad }}>
              {fixed ? "✓ Titre recentré, le reste intact" : "Le titre déborde à droite"}
            </div>
          </div>
          <div style={{ position: "relative", height: 12, borderRadius: 6, background: C.line }}>
            <div style={{ width: `${scrub * 100}%`, height: "100%", borderRadius: 6, background: C.accent }} />
            <div
              style={{
                position: "absolute",
                left: `calc(${scrub * 100}% - 16px)`,
                top: -10,
                width: 32,
                height: 32,
                borderRadius: 16,
                background: C.ink,
              }}
            />
          </div>
        </div>
      </div>
    </DemoFrame>
  );
};

const AudioDemo: React.FC<{ delay: number }> = ({ delay }) => {
  const f = useCurrentFrame();
  const bars = 38;
  const vol = interpolate(f, [delay + 40, delay + 100], [100, 30], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
  const fadeShow = interpolate(f, [delay + 130, delay + 160], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <DemoFrame delay={delay}>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: SANS, fontSize: 34, marginBottom: 26 }}>
        <span style={{ fontFamily: MONO }}>♪ musique.mp3</span>
        <span>
          Volume <b style={{ fontFamily: MONO, color: C.accent }}>{Math.round(vol)} %</b>
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, height: 170 }}>
        {new Array(bars).fill(0).map((_, i) => {
          const base = 0.35 + 0.65 * Math.abs(Math.sin(i * 1.7 + f * 0.18) * Math.cos(i * 0.6 - f * 0.07));
          const tail = i >= bars - 6 ? 1 - fadeShow * ((i - (bars - 7)) / 6) : 1;
          const h = base * (0.35 + 0.65 * (vol / 100)) * tail * 170;
          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: Math.max(6, h),
                borderRadius: 4,
                background: i >= bars - 6 && fadeShow > 0 ? "#D9A35B" : C.accent,
              }}
            />
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", fontFamily: SANS, fontSize: 30, color: C.muted, marginTop: 18, opacity: fadeShow }}>
        fondu sur la dernière seconde ↘
      </div>
    </DemoFrame>
  );
};

const ExportDemo: React.FC<{ delay: number }> = ({ delay }) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [delay + 20, delay + 200], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.quad),
  });
  const done = p >= 1;
  const pop = spring({ frame: f - (delay + 205), fps: FPS, config: { damping: 12 } });
  return (
    <DemoFrame delay={delay}>
      <div style={{ fontFamily: SANS }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 34, marginBottom: 22 }}>
          <span>Rendu des images</span>
          <span style={{ fontFamily: MONO }}>{Math.round(p * 3600)}/3600</span>
        </div>
        <div style={{ height: 22, borderRadius: 11, background: C.line, overflow: "hidden" }}>
          <div style={{ width: `${p * 100}%`, height: "100%", background: C.accent }} />
        </div>
        <div
          style={{
            marginTop: 44,
            display: "flex",
            alignItems: "center",
            gap: 30,
            opacity: done ? pop : 0,
            transform: `scale(${0.85 + 0.15 * pop})`,
            transformOrigin: "left center",
          }}
        >
          <div
            style={{
              width: 96,
              height: 120,
              borderRadius: 14,
              background: C.ink,
              color: "#F1ECE6",
              fontFamily: MONO,
              fontSize: 24,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              paddingBottom: 14,
            }}
          >
            MP4
          </div>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 34 }}>sorties/ma-video.mp4</div>
            <div style={{ fontSize: 32, color: C.muted, marginTop: 8 }}>Durée 2:00 · prête à publier</div>
          </div>
        </div>
      </div>
    </DemoFrame>
  );
};

// ---------- Scène « étape » ----------
type StepData = {
  n: number;
  title: string;
  sub: string;
  prompt: string;
  cards: [{ tag: string; text: string }, { tag: string; text: string }];
  Demo: React.FC<{ delay: number }>;
};

const steps: StepData[] = [
  {
    n: 1,
    title: "Créer le projet",
    sub: "Claude installe tout et t'explique chaque commande.",
    prompt:
      "Crée un projet Remotion dans ce dossier pour une vidéo verticale 1080x1920 de 15 secondes. Explique chaque commande avant de la lancer.",
    cards: [
      { tag: "BON POUR", text: "Démarrer sans connaître Remotion." },
      { tag: "RÉFLEXE", text: "Lis chaque commande avant de valider." },
    ],
    Demo: TerminalDemo,
  },
  {
    n: 2,
    title: "Décrire la vidéo",
    sub: "Une scène par ligne, avec sa durée. Plus c'est précis, moins Claude devine.",
    prompt:
      "Voici ma vidéo, scène par scène : [scène 1 : texte, animation, durée], [scène 2], [scène 3]. Couleurs : [couleurs]. Police : [police].",
    cards: [
      { tag: "ASTUCE", text: "Indique la durée de chaque scène en secondes." },
      { tag: "ÉVITE", text: "« Fais une belle vidéo » : Claude devine tout." },
    ],
    Demo: StoryboardDemo,
  },
  {
    n: 3,
    title: "Corriger dans l'aperçu",
    sub: "Une correction à la fois, avec la seconde précise.",
    prompt:
      "Dans l'aperçu, à [seconde], [ce qui ne va pas]. Corrige seulement ça et ne touche pas au reste.",
    cards: [
      { tag: "RÉFLEXE", text: "Un message par correction." },
      { tag: "FILET", text: "/rewind revient en arrière si une correction casse tout." },
    ],
    Demo: PreviewDemo,
  },
  {
    n: 4,
    title: "Ajouter le son",
    sub: "La musique se règle dans le code, comme le reste.",
    prompt:
      "Ajoute la musique [fichier.mp3] du dossier à 30 % du volume, avec un fondu sur la dernière seconde.",
    cards: [
      { tag: "ATTENTION", text: "Utilise une musique libre de droits ou la tienne." },
      { tag: "ASTUCE", text: "Range les fichiers son dans le dossier du projet." },
    ],
    Demo: AudioDemo,
  },
  {
    n: 5,
    title: "Exporter",
    sub: "Le fichier final, prêt à publier.",
    prompt: "Exporte la vidéo en MP4 dans un dossier sorties, puis dis-moi sa durée et son poids.",
    cards: [
      { tag: "ENSUITE", text: "Regarde la vidéo sur ton téléphone avant de la publier." },
      { tag: "RÉUTILISER", text: "Garde le projet : tu changes le texte pour la suivante." },
    ],
    Demo: ExportDemo,
  },
];

const StepScene: React.FC<{ d: StepData }> = ({ d }) => {
  const { Demo } = d;
  const promptDelay = 34;
  const typeDur = (d.prompt.length / 38) * FPS;
  const demoDelay = Math.round(promptDelay + 14 + typeDur + 10);
  const cardDelay = demoDelay + 150;
  return (
    <SceneFade dur={STEP}>
      <AbsoluteFill style={{ padding: `${PAD + 20}px ${PAD}px`, display: "flex", flexDirection: "column", gap: 44 }}>
        <Header label={`ÉTAPE ${d.n}`} counter={`${d.n}/5`} />
        <div>
          <Title text={d.title} delay={6} size={d.title.length > 18 ? 104 : 124} />
          <Rise delay={20}>
            <div style={{ fontFamily: SANS, fontSize: 50, lineHeight: 1.3, color: C.ink, marginTop: 22 }}>{d.sub}</div>
          </Rise>
        </div>
        <PromptBox text={d.prompt} delay={promptDelay} />
        <Demo delay={demoDelay} />
        <div style={{ display: "flex", gap: 30, marginTop: "auto" }}>
          <Card tag={d.cards[0].tag} text={d.cards[0].text} bg={C.green} delay={cardDelay} />
          <Card tag={d.cards[1].tag} text={d.cards[1].text} bg={C.peach} delay={cardDelay + 8} />
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
};

// ---------- Accroche ----------
const HookScene: React.FC = () => {
  const f = useCurrentFrame();
  const strike = interpolate(f, [120, 140], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  const zoom = interpolate(f, [0, HOOK], [1, 1.04]);
  return (
    <SceneFade dur={HOOK}>
      <AbsoluteFill
        style={{
          padding: PAD,
          justifyContent: "center",
          transform: `scale(${zoom})`,
        }}
      >
        <Rise delay={0}>
          <div style={{ fontFamily: SANS, color: C.accent, fontSize: 36, fontWeight: 700, letterSpacing: 8, marginBottom: 50 }}>
            CLAUDE CODE × REMOTION
          </div>
        </Rise>
        <Title text="Monter une vidéo" delay={10} size={150} />
        <Title text="sans logiciel" delay={30} size={150} />
        <div style={{ position: "relative", marginTop: 10 }}>
          <Rise delay={70}>
            <div style={{ fontFamily: SERIF, fontSize: 150, fontStyle: "italic", color: C.muted, lineHeight: 1.05 }}>
              de montage.
            </div>
          </Rise>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: "55%",
              height: 10,
              width: `${strike * 82}%`,
              background: C.accent,
              borderRadius: 5,
            }}
          />
        </div>
        <Rise delay={150}>
          <div style={{ fontFamily: SANS, fontSize: 60, color: C.ink, marginTop: 80 }}>
            Juste <span style={{ color: C.accent, fontWeight: 700 }}>5 prompts</span> à copier.
          </div>
        </Rise>
      </AbsoluteFill>
    </SceneFade>
  );
};

// ---------- Le principe ----------
const IntroScene: React.FC = () => {
  const f = useCurrentFrame();
  const nodes = [
    { t: "Ton prompt", sub: "en français", icon: "✎" },
    { t: "Du code", sub: "écrit par Claude", icon: "{ }" },
    { t: "Une vidéo", sub: "MP4 1080x1920", icon: "▶" },
  ];
  return (
    <SceneFade dur={INTRO}>
      <AbsoluteFill style={{ padding: `${PAD + 20}px ${PAD}px`, display: "flex", flexDirection: "column", gap: 50 }}>
        <Header label="LE PRINCIPE" counter="0/5" />
        <Title text="La vidéo, c'est du code." delay={6} size={116} />
        <Rise delay={26}>
          <div style={{ fontFamily: SANS, fontSize: 50, lineHeight: 1.35, color: C.ink }}>
            Remotion transforme du code en vidéo. Claude Code écrit ce code à ta place. Toi, tu décris.
          </div>
        </Rise>
        <div style={{ display: "flex", flexDirection: "column", gap: 0, marginTop: 30 }}>
          {nodes.map((n, i) => {
            const d = 70 + i * 40;
            const sp = spring({ frame: f - d, fps: FPS, config: { damping: 14 } });
            const arrow = interpolate(f, [d + 20, d + 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div key={i}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 40,
                    background: i === 2 ? C.ink : "rgba(255,255,255,0.6)",
                    color: i === 2 ? "#F1ECE6" : C.ink,
                    border: `2px solid ${i === 2 ? C.ink : C.line}`,
                    borderRadius: 30,
                    padding: "38px 46px",
                    opacity: sp,
                    transform: `translateX(${(1 - sp) * -120}px)`,
                  }}
                >
                  <div
                    style={{
                      width: 110,
                      height: 110,
                      borderRadius: 24,
                      background: i === 2 ? C.accent : C.peach,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: MONO,
                      fontSize: 46,
                      color: i === 2 ? "#fff" : C.accent,
                    }}
                  >
                    {n.icon}
                  </div>
                  <div>
                    <div style={{ fontFamily: SERIF, fontSize: 64 }}>{n.t}</div>
                    <div style={{ fontFamily: SANS, fontSize: 36, opacity: 0.7 }}>{n.sub}</div>
                  </div>
                </div>
                {i < 2 && (
                  <div style={{ height: 70, display: "flex", justifyContent: "center" }}>
                    <div style={{ width: 4, height: `${arrow * 100}%`, background: C.accent, borderRadius: 2 }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
};

// ---------- Récap final ----------
const OutroScene: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <SceneFade dur={OUTRO + 12}>
      <AbsoluteFill style={{ padding: `${PAD + 20}px ${PAD}px`, display: "flex", flexDirection: "column", gap: 40 }}>
        <Header label="RÉCAP" counter="5/5" />
        <Title text="Ta méthode en 5 prompts" delay={4} size={112} />
        <div style={{ display: "flex", flexDirection: "column", gap: 26, marginTop: 30 }}>
          {steps.map((st, i) => {
            const d = 30 + i * 14;
            const p = interpolate(f, [d, d + 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
            const check = spring({ frame: f - d - 10, fps: FPS, config: { damping: 10 } });
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 34,
                  opacity: p,
                  transform: `translateX(${(1 - p) * 60}px)`,
                  borderBottom: `2px solid ${C.line}`,
                  paddingBottom: 26,
                }}
              >
                <div
                  style={{
                    width: 76,
                    height: 76,
                    borderRadius: 38,
                    background: C.accent,
                    color: "#fff",
                    fontFamily: SANS,
                    fontSize: 40,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transform: `scale(${check})`,
                  }}
                >
                  ✓
                </div>
                <div style={{ fontFamily: SERIF, fontSize: 62, color: C.ink }}>{st.title}</div>
              </div>
            );
          })}
        </div>
        <Rise delay={120} style={{ marginTop: "auto" }}>
          <div style={{ background: C.ink, borderRadius: 34, padding: "50px 54px", color: "#F1ECE6" }}>
            <div style={{ fontFamily: SANS, fontSize: 30, letterSpacing: 5, color: C.codeLabel, marginBottom: 18 }}>
              À TOI DE JOUER
            </div>
            <div style={{ fontFamily: SANS, fontSize: 52, lineHeight: 1.3 }}>
              Enregistre ce guide et lance ta première vidéo <span style={{ color: "#E8957B" }}>aujourd'hui</span>.
            </div>
          </div>
        </Rise>
      </AbsoluteFill>
    </SceneFade>
  );
};

// ---------- Barre de progression globale ----------
const ProgressBar: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 10, background: "rgba(0,0,0,0.05)" }}>
      <div style={{ width: `${(f / TOTAL) * 100}%`, height: "100%", background: C.accent }} />
    </div>
  );
};

// ---------- Composition principale ----------
export const MethodeVideo: React.FC = () => {
  let t = 0;
  const at = (d: number) => {
    const from = t;
    t += d;
    return from;
  };
  return (
    <AbsoluteFill>
      <Paper />
      <Sequence from={at(HOOK)} durationInFrames={HOOK}>
        <HookScene />
      </Sequence>
      <Sequence from={at(INTRO)} durationInFrames={INTRO}>
        <IntroScene />
      </Sequence>
      {steps.map((d) => (
        <Sequence key={d.n} from={at(STEP)} durationInFrames={STEP}>
          <StepScene d={d} />
        </Sequence>
      ))}
      <Sequence from={at(OUTRO)} durationInFrames={OUTRO}>
        <OutroScene />
      </Sequence>
      <ProgressBar />
      <Audio
        src={staticFile("musique.mp3")}
        volume={(f) =>
          0.3 *
          interpolate(f, [0, 20, TOTAL - FPS, TOTAL], [0, 1, 1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
        }
      />
    </AbsoluteFill>
  );
};
