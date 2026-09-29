import clsx from "clsx";
import { ArrowRight } from "lucide-react";

/** Rounded button with a round arrow circle, used for every primary action. */
export function Pill({
  href,
  children,
  tone = "accent",
  className,
}: {
  href: string;
  children: string;
  tone?: "accent" | "ink" | "paper";
  className?: string;
}) {
  const tones = {
    accent: "bg-accent text-on-accent",
    ink: "bg-ink text-paper",
    paper: "bg-paper text-ink",
  };
  const circle = {
    accent: "bg-on-accent text-accent",
    ink: "bg-paper text-ink",
    paper: "bg-ink text-paper",
  };
  return (
    <a
      href={href}
      className={clsx(
        "arrow-host inline-flex items-center gap-3 rounded-full py-[7px] pl-5 pr-[7px] text-[15px] font-medium",
        tones[tone],
        className,
      )}
    >
      <span>{children}</span>
      <span className={clsx("arrow-slide grid size-8 place-items-center rounded-full", circle[tone])}>
        <ArrowRight size={16} strokeWidth={2} />
      </span>
    </a>
  );
}
