import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  withArrow?: boolean;
};

export function PrimaryCta({ children, withArrow = false, className, ...rest }: Props) {
  const cls = ["landing-btn", "landing-btn--primary", className].filter(Boolean).join(" ");
  return (
    <button type="button" className={cls} {...rest}>
      <span>{children}</span>
      {withArrow ? <span className="landing-btn__arrow" aria-hidden="true">→</span> : null}
    </button>
  );
}
