import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  withDot?: boolean;
};

export function HighlightBadge({ children, withDot = true }: Props) {
  return (
    <span className="landing-badge">
      {withDot ? <span className="landing-badge__dot" aria-hidden="true" /> : null}
      <span>{children}</span>
    </span>
  );
}
