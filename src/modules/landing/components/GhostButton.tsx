import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  muted?: boolean;
};

export function GhostButton({ children, muted = false, className, ...rest }: Props) {
  const cls = [
    "landing-btn",
    muted ? "landing-btn--ghost-muted" : "landing-btn--ghost",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button type="button" className={cls} {...rest}>
      {children}
    </button>
  );
}
