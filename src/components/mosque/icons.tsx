// Icons only the mosque finder uses: kept out of Icons.tsx, which the first page load
// downloads, so they load with the finder
import { defaultProps, type IconProps } from "@/components/ui/Icons";

// Navigation arrow (directions to a mosque)
export function NavigationIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg {...defaultProps(size)} {...props}>
      <polygon points="3 11 22 2 13 21 11 13 3 11" />
    </svg>
  );
}

// Opens in a new tab
export function ExternalLinkIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg {...defaultProps(size)} {...props}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

// GPS crosshair
export function CrosshairIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg {...defaultProps(size)} {...props}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="3" />
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
    </svg>
  );
}
