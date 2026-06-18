"use client";

import { useFormStatus } from "react-dom";
import clsx from "clsx";

export function SubmitButton({
  children,
  className,
  variant = "primary",
  pendingLabel,
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "danger";
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  const base =
    variant === "secondary" ? "btn-secondary" : variant === "danger" ? "btn-danger" : "btn-primary";
  return (
    <button type="submit" disabled={pending} className={clsx(base, className)}>
      {pending ? pendingLabel ?? "Enregistrement…" : children}
    </button>
  );
}
