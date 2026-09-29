import { useId, type ReactNode } from "react";
import type { PhotoKey } from "../photos";

/**
 * Drawn stand ins for photography. Each scene is an SVG built at 400 x 500 and
 * cropped to its container with slice, with a film grain filter on top so the
 * flat shapes read as prints rather than illustrations.
 */

function rng(seed: number) {
  let t = seed + 0x6d2b79f5;
  return () => {
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Tone = "mono" | "warm";

const TONES: Record<Tone, { bg: string; mid: string; dark: string; skin: string; light: string }> = {
  mono: { bg: "#8d8a82", mid: "#5d5a53", dark: "#1f1d19", skin: "#d9d5cb", light: "#f1eee6" },
  warm: { bg: "#b0764a", mid: "#7a4a2c", dark: "#2b1a10", skin: "#f0c9a0", light: "#ffe8c8" },
};

function Frame({
  children,
  tone,
  label,
  className,
  vignette = 0.55,
}: {
  children: ReactNode;
  tone: Tone;
  label: string;
  className?: string;
  vignette?: number;
}) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      viewBox="0 0 400 500"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={label}
      className={className}
      style={{ display: "block", width: "100%", height: "100%" }}
    >
      <defs>
        <filter id={`g${id}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="table" tableValues="0 0.22" />
          </feComponentTransfer>
        </filter>
        <radialGradient id={`v${id}`} cx="50%" cy="42%" r="70%">
          <stop offset="55%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity={vignette} />
        </radialGradient>
      </defs>
      <rect width="400" height="500" fill={TONES[tone].bg} />
      {children}
      <rect width="400" height="500" fill={`url(#v${id})`} />
      <rect width="400" height="500" filter={`url(#g${id})`} />
    </svg>
  );
}

function Curtain({ tone, seed }: { tone: Tone; seed: number }) {
  const r = rng(seed);
  const c = TONES[tone];
  const folds = [];
  for (let x = -10; x < 410; x += 26 + r() * 14) {
    folds.push(<rect key={x} x={x} y={0} width={8 + r() * 10} height={500} fill={c.mid} opacity={0.35 + r() * 0.3} />);
  }
  return <g>{folds}</g>;
}

type Look = "camera" | "left" | "right" | "down";

function Person({
  x,
  y,
  s,
  tilt,
  tone,
  hair,
  look,
  laugh,
}: {
  x: number;
  y: number;
  s: number;
  tilt: number;
  tone: Tone;
  hair: 0 | 1 | 2 | 3;
  look: Look;
  laugh: boolean;
}) {
  const c = TONES[tone];
  const ex = look === "left" ? -7 : look === "right" ? 7 : 0;
  const ey = look === "down" ? 5 : 0;
  const hairShapes = [
    <path key="h" d="M-46 -8 C-50 -62 50 -62 46 -8 C40 -34 -40 -34 -46 -8Z" fill={c.dark} />,
    <path key="h" d="M-50 30 C-62 -70 62 -70 50 30 L40 30 C44 -20 -44 -20 -40 30Z" fill={c.dark} />,
    <path key="h" d="M-44 -14 C-44 -58 44 -58 44 -14 C30 -26 -10 -40 -44 -14Z" fill={c.mid} />,
    <g key="h">
      <path d="M-46 -12 C-46 -56 46 -56 46 -12Z" fill={c.dark} />
      <rect x="-60" y="-26" width="120" height="10" rx="4" fill={c.dark} />
    </g>,
  ];
  return (
    <g transform={`translate(${x} ${y}) scale(${s}) rotate(${tilt})`}>
      <path d="M-95 190 C-90 90 -50 70 0 70 C50 70 90 90 95 190Z" fill={c.dark} />
      <rect x="-14" y="38" width="28" height="40" fill={c.skin} opacity="0.85" />
      <ellipse cx="0" cy="0" rx="44" ry="54" fill={c.skin} />
      {hairShapes[hair]}
      <circle cx={-15 + ex} cy={-4 + ey} r="3.6" fill={c.dark} />
      <circle cx={15 + ex} cy={-4 + ey} r="3.6" fill={c.dark} />
      {laugh ? (
        <path d={`M${-14 + ex / 2} 22 Q${ex / 2} 42 ${14 + ex / 2} 22Z`} fill={c.dark} />
      ) : (
        <path d={`M${-10 + ex / 2} 26 Q${ex / 2} 32 ${10 + ex / 2} 26`} stroke={c.dark} strokeWidth="3" fill="none" />
      )}
    </g>
  );
}

/** One frame of a photo strip. The fourth frame of a strip never looks at the camera. */
export function StripFrame({ strip, frame, className }: { strip: number; frame: number; className?: string }) {
  const r = rng(strip * 97 + frame * 13 + 1);
  const base = rng(strip * 31 + 7);
  const count = 1 + Math.floor(base() * 3.2);
  const hairs = [0, 1, 2, 3].map(() => Math.floor(base() * 4) as 0 | 1 | 2 | 3);
  const people = [];
  const looks: Look[] = ["left", "right", "down"];
  for (let i = 0; i < count; i++) {
    const spread = count === 1 ? 0 : (i / (count - 1) - 0.5) * (count === 2 ? 150 : 220);
    const look: Look = frame === 3 ? looks[Math.floor(r() * 3)] : r() > 0.8 ? looks[Math.floor(r() * 3)] : "camera";
    people.push(
      <Person
        key={i}
        x={200 + spread + (r() - 0.5) * 30}
        y={250 + (r() - 0.5) * 50 + (count > 2 && i === 1 ? 30 : 0)}
        s={count === 1 ? 1.35 : count === 2 ? 1.05 : 0.85}
        tilt={(r() - 0.5) * 22}
        tone="mono"
        hair={hairs[i]}
        look={look}
        laugh={r() > 0.45}
      />,
    );
  }
  return (
    <Frame tone="mono" label={`Photo strip frame ${frame + 1}`} className={className} vignette={0.7}>
      <Curtain tone="mono" seed={strip * 5 + 2} />
      {people}
    </Frame>
  );
}

function HeroInline() {
  return (
    <Frame tone="warm" label="Two people laughing inside a curtained photo booth, warm flash light" vignette={0.45}>
      <Curtain tone="warm" seed={11} />
      <ellipse cx="200" cy="200" rx="220" ry="180" fill="#ffd9a8" opacity="0.28" />
      <Person x={140} y={250} s={1.05} tilt={-12} tone="warm" hair={1} look="right" laugh />
      <Person x={270} y={240} s={1.0} tilt={10} tone="warm" hair={3} look="camera" laugh />
    </Frame>
  );
}

function Booth({ kind }: { kind: "chrome" | "wood" | "white" }) {
  const body = { chrome: "#d8d6cf", wood: "#6e4a2e", white: "#f3f1ea" }[kind];
  const trim = { chrome: "#a9a7a0", wood: "#4a3020", white: "#d6d3c9" }[kind];
  const curtain = { chrome: "#8a2b20", wood: "#2f3a2c", white: "#3a3a3a" }[kind];
  const w = kind === "white" ? 180 : 230;
  const x = 200 - w / 2;
  const label = {
    chrome: "A chrome and enamel photo booth, straight on",
    wood: "A wood panelled photo booth, straight on",
    white: "A small white photo booth, straight on",
  }[kind];
  return (
    <Frame tone="mono" label={label} vignette={0.35}>
      <rect width="400" height="500" fill="#bdb6a4" />
      <rect y="400" width="400" height="100" fill="#8f8876" />
      <rect x={x} y={70} width={w} height={340} fill={body} />
      <rect x={x} y={70} width={w} height={48} fill={trim} />
      <rect x={x + 16} y={82} width={w - 32} height={24} fill="#f7f3e6" />
      <g fill="#2a2618">
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={x + 26 + i * ((w - 52) / 4)} y={88} width={(w - 52) / 4 - 8} height={12} />
        ))}
      </g>
      {kind === "wood" &&
        [0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={i} x={x + 4 + i * (w / 6)} y={118} width={2} height={292} fill="#4a3020" opacity="0.6" />
        ))}
      {kind === "chrome" && (
        <>
          <rect x={x} y={118} width={10} height={292} fill="#eeece6" />
          <rect x={x + w - 10} y={118} width={10} height={292} fill="#eeece6" />
        </>
      )}
      <rect x={x + 22} y={132} width={w * 0.52} height={262} fill={curtain} />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={x + 26 + i * (w * 0.1)} y={132} width={5} height={262} fill="#000" opacity="0.18" />
      ))}
      <rect x={x + w * 0.62} y={150} width={w * 0.28} height={90} fill={trim} />
      <rect x={x + w * 0.66} y={170} width={w * 0.2} height={8} fill="#2a2618" />
      <rect x={x + w * 0.66} y={260} width={w * 0.2} height={60} fill="#f7f3e6" />
      <rect x={x + w * 0.7} y={268} width={w * 0.12} height={44} fill="#fff" stroke="#2a2618" strokeWidth="1" />
      <rect x={x + 10} y={410} width={w - 20} height={10} fill={trim} />
    </Frame>
  );
}

function Venue({ kind }: { kind: "hall" | "barn" | "music" | "garden" | "exchange" | "pub" }) {
  const labels = {
    hall: "A wedding in a gallery hall",
    barn: "A party in a barn",
    music: "A late night at a music hall",
    garden: "A garden marquee",
    exchange: "A Christmas party under a domed roof",
    pub: "A birthday in a pub",
  };
  const r = rng(kind.length * 17 + kind.charCodeAt(0));
  const crowd = [];
  for (let i = 0; i < 9; i++) {
    const cx = 20 + i * 46 + r() * 20;
    const cy = 380 + r() * 40;
    crowd.push(
      <g key={i} fill="#1f1a14">
        <circle cx={cx} cy={cy - 50} r={16 + r() * 6} />
        <path d={`M${cx - 34} 520 C${cx - 30} ${cy - 20} ${cx + 30} ${cy - 20} ${cx + 34} 520Z`} />
      </g>,
    );
  }
  const lights = [];
  for (let i = 0; i < 14; i++) {
    lights.push(<circle key={i} cx={10 + i * 29} cy={120 + Math.sin(i / 2) * 18} r="4" fill="#ffe7b0" />);
  }
  return (
    <Frame tone="warm" label={labels[kind]} vignette={0.6}>
      {kind === "hall" && (
        <>
          <rect width="400" height="500" fill="#c9b594" />
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={30 + i * 95} y={60} width={60} height={200} fill="#efe3c8" />
          ))}
        </>
      )}
      {kind === "barn" && (
        <>
          <rect width="400" height="500" fill="#5a3a24" />
          <path d="M0 200 L200 30 L400 200" stroke="#2e1d12" strokeWidth="18" fill="none" />
          <rect x="190" y="30" width="20" height="470" fill="#2e1d12" />
          {lights}
        </>
      )}
      {kind === "music" && (
        <>
          <rect width="400" height="500" fill="#3a1f1a" />
          <path d="M60 0 L140 300 L0 300Z" fill="#ffb86b" opacity="0.28" />
          <path d="M340 0 L400 300 L230 300Z" fill="#ffb86b" opacity="0.22" />
          <rect x="0" y="300" width="400" height="30" fill="#211210" />
        </>
      )}
      {kind === "garden" && (
        <>
          <rect width="400" height="500" fill="#e9dcc0" />
          <path d="M0 140 Q100 60 200 140 Q300 60 400 140 L400 0 L0 0Z" fill="#fbf4e4" />
          {lights}
          <rect x="0" y="300" width="400" height="200" fill="#7b8a55" opacity="0.5" />
        </>
      )}
      {kind === "exchange" && (
        <>
          <rect width="400" height="500" fill="#4a3526" />
          <ellipse cx="200" cy="40" rx="260" ry="200" fill="#6f5238" />
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <path key={i} d={`M200 -160 L${-60 + i * 87} 240`} stroke="#2f2218" strokeWidth="6" />
          ))}
          <circle cx="200" cy="40" r="60" fill="#e6d3a8" opacity="0.7" />
          {lights}
        </>
      )}
      {kind === "pub" && (
        <>
          <rect width="400" height="500" fill="#4f2e1e" />
          <rect x="0" y="80" width="400" height="140" fill="#2f1b11" />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <rect key={i} x={20 + i * 48} y={100} width={18} height={60} fill="#c98a3c" opacity="0.8" />
          ))}
          <rect x="0" y="220" width="400" height="16" fill="#8a5a34" />
          <circle cx="300" cy="300" r="14" fill="#ffe7b0" />
          <rect x="296" y="270" width="8" height="30" fill="#f7efe0" />
        </>
      )}
      {crowd}
    </Frame>
  );
}

export function Scene({ name, className }: { name: PhotoKey; className?: string }) {
  const map: Record<PhotoKey, ReactNode> = {
    heroInline: <HeroInline />,
    boothMarlene: <Booth kind="chrome" />,
    boothSid: <Booth kind="wood" />,
    boothDot: <Booth kind="white" />,
    venueHepworth: <Venue kind="hall" />,
    venueBarn: <Venue kind="barn" />,
    venueBelgrave: <Venue kind="music" />,
    venueIlkley: <Venue kind="garden" />,
    venueCornExchange: <Venue kind="exchange" />,
    venueAdelphi: <Venue kind="pub" />,
  };
  return <div className={className}>{map[name]}</div>;
}
