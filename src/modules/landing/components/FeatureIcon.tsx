import type { FeatureIcon as FeatureIconKey } from "../i18n/types";

type Props = {
  name: FeatureIconKey;
  size?: number;
};

export function FeatureIcon({ name, size = 18 }: Props) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    focusable: false as const,
  };

  switch (name) {
    case "voice":
      return (
        <svg {...common}>
          <rect x="9" y="3" width="6" height="12" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0" />
          <path d="M12 18v3" />
        </svg>
      );
    case "llm":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="14" rx="3" />
          <path d="M8 9h8" />
          <path d="M8 13h5" />
          <path d="M12 18v3" />
        </svg>
      );
    case "rubric":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <path d="M8 8h8" />
          <path d="M8 12h8" />
          <path d="M8 16h5" />
        </svg>
      );
    case "link":
      return (
        <svg {...common}>
          <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.5 1.5" />
          <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.5-1.5" />
        </svg>
      );
    case "template":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="6" rx="2" />
          <rect x="3" y="13" width="11" height="8" rx="2" />
          <rect x="16" y="13" width="5" height="8" rx="2" />
        </svg>
      );
    case "report":
      return (
        <svg {...common}>
          <path d="M4 19V5" />
          <path d="M4 19h16" />
          <path d="M8 15v-4" />
          <path d="M12 15V8" />
          <path d="M16 15v-2" />
        </svg>
      );
  }
}
