/** Icône de l'app : étoile de zellige blanche sur bleu détroit. */
export function AppIconArt({ size }: { size: number }) {
  const s = size;
  return (
    <div style={{ width: s, height: s, background: "#0b4f6c", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={s * 0.62} height={s * 0.62} viewBox="0 0 40 40">
        <g fill="none" stroke="#ffffff" strokeWidth="2.4">
          <rect x="10" y="10" width="20" height="20" />
          <rect x="10" y="10" width="20" height="20" transform="rotate(45 20 20)" />
        </g>
        <circle cx="20" cy="20" r="4" fill="#e8b866" />
      </svg>
    </div>
  );
}
