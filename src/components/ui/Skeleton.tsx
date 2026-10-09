import { cx } from "./cx";

/** A placeholder block, shimmering while its content loads; size it like the content */
export default function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cx("animate-shimmer rounded", className)} />;
}
