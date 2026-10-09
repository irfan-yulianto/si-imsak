import type { HTMLAttributes } from "react";
import { cx } from "./cx";

export type BadgeTone = "neutral" | "accent" | "gold" | "warning" | "danger";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-surface-2 text-fg-muted",
  accent: "bg-accent-soft text-accent-fg",
  gold: "bg-gold-soft text-gold",
  warning: "bg-warning-soft text-warning ring-1 ring-warning/30",
  danger: "bg-danger-soft text-danger",
};

/** A short label: a state, a type, a count */
export default function Badge({ tone = "neutral", className, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cx("inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-semibold", TONES[tone], className)}
      {...props}
    />
  );
}
