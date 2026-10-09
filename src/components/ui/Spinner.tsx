import { cx } from "./cx";

/**
 * A spinning ring in the current text colour. With a `label` it is a status that
 * screen readers announce; without one it is decoration next to a text that says it.
 */
export default function Spinner({ size = "md", label, className }: { size?: "sm" | "md"; label?: string; className?: string }) {
  const ring = (
    <span
      aria-hidden={label ? undefined : true}
      className={cx(
        "inline-block animate-spin rounded-full border-2 border-current border-t-transparent",
        size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5",
        className
      )}
    />
  );
  return label ? (
    <span role="status" aria-label={label} className="inline-flex">
      {ring}
    </span>
  ) : (
    ring
  );
}
