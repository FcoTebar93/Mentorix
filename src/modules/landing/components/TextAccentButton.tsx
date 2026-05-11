import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export function TextAccentButton({ children, className, ...rest }: Props) {
  const cls = ["landing-btn", "landing-btn--text", className].filter(Boolean).join(" ");
  return (
    <button type="button" className={cls} {...rest}>
      <span>{children}</span>
      <span className="landing-btn__arrow" aria-hidden="true">→</span>
    </button>
  );
}
