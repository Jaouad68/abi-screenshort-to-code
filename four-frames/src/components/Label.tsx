export function Label({ children, className }: { children: string; className?: string }) {
  return <p className={`meta text-muted ${className ?? ""}`}>{children}</p>;
}
