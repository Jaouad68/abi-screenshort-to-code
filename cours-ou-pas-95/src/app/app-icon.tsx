/**
 * Icône de l'application (générée en PNG par next/og) : un dégradé indigo
 * avec trois pastilles aux couleurs des statuts.
 */
export function AppIconArt({ size }: { size: number }) {
  const dot = size * 0.17;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(145deg, #7d7aff 0%, #5e5ce6 45%, #3634a3 100%)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: size * 0.05,
          width: size * 0.56,
          height: size * 0.56,
          borderRadius: size * 0.16,
          background: "rgba(255,255,255,0.16)",
          border: `${Math.max(1, size * 0.012)}px solid rgba(255,255,255,0.35)`,
        }}
      >
        {["#ff453a", "#ffb340", "#32d74b"].map((c) => (
          <div key={c} style={{ width: dot, height: dot, borderRadius: dot, background: c, boxShadow: `0 0 ${size * 0.04}px ${c}` }} />
        ))}
      </div>
    </div>
  );
}
