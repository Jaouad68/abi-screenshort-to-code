export function BodySilhouette({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <svg viewBox="0 0 100 200" className="mx-auto h-64 w-auto" role="img" aria-label="Body location diagram">
      <path
        d="M50 6c7 0 12 6 12 13 0 5-2 9-5 12 9 3 15 11 16 21l3 30c1 6-3 11-9 11l-2 34 6 55c1 6-4 11-10 11s-10-4-11-10l-4-46-4 46c-1 6-5 10-11 10s-11-5-10-11l6-55-2-34c-6 0-10-5-9-11l3-30c1-10 7-18 16-21-3-3-5-7-5-12 0-7 5-13 12-13Z"
        fill="none"
        stroke="#c3d5cd"
        strokeWidth="2"
      />
      <circle cx={x} cy={y * 2} r="6" fill={color} opacity="0.85">
        <animate attributeName="r" values="5;8;5" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx={x} cy={y * 2} r="12" fill={color} opacity="0.2" />
    </svg>
  );
}
