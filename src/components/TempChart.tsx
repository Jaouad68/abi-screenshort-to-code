// Courbe de température en SVG pur (aucune dépendance). Affiche la plage cible
// (bande verte), la ligne des relevés et signale les points hors plage en rouge.

export type ChartPoint = { t: number; v: number; conforme: boolean };

export function TempChart({
  points,
  tempMin,
  tempMax,
  height = 160,
}: {
  points: ChartPoint[];
  tempMin: number;
  tempMax: number;
  height?: number;
}) {
  const W = 600;
  const H = height;
  const padL = 34;
  const padR = 10;
  const padT = 10;
  const padB = 18;

  if (points.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">Aucun relevé sur la période.</p>;
  }

  const sorted = [...points].sort((a, b) => a.t - b.t);
  const ts = sorted.map((p) => p.t);
  const vs = sorted.map((p) => p.v);
  const tMin = Math.min(...ts);
  const tMax = Math.max(...ts);
  const vLo = Math.min(tempMin, ...vs);
  const vHi = Math.max(tempMax, ...vs);
  const pad = (vHi - vLo) * 0.15 || 1;
  const yLo = vLo - pad;
  const yHi = vHi + pad;

  const x = (t: number) =>
    tMax === tMin ? padL + (W - padL - padR) / 2 : padL + ((t - tMin) / (tMax - tMin)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - (v - yLo) / (yHi - yLo)) * (H - padT - padB);

  const bandTop = y(tempMax);
  const bandBottom = y(tempMin);
  const line = sorted.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Courbe de température">
      {/* bande cible */}
      <rect
        x={padL}
        y={bandTop}
        width={W - padL - padR}
        height={Math.max(0, bandBottom - bandTop)}
        fill="#d6ece4"
      />
      <line x1={padL} y1={bandTop} x2={W - padR} y2={bandTop} stroke="#2c876c" strokeDasharray="4 3" strokeWidth="1" />
      <line x1={padL} y1={bandBottom} x2={W - padR} y2={bandBottom} stroke="#2c876c" strokeDasharray="4 3" strokeWidth="1" />

      {/* étiquettes min/max */}
      <text x={4} y={bandTop + 4} fontSize="10" fill="#1f6c56">{tempMax}°</text>
      <text x={4} y={bandBottom + 4} fontSize="10" fill="#1f6c56">{tempMin}°</text>

      {/* ligne */}
      <path d={line} fill="none" stroke="#334155" strokeWidth="1.5" />

      {/* points */}
      {sorted.map((p, i) => (
        <circle
          key={i}
          cx={x(p.t)}
          cy={y(p.v)}
          r={2.8}
          fill={p.conforme ? "#1f6c56" : "#dc2626"}
        />
      ))}
    </svg>
  );
}
