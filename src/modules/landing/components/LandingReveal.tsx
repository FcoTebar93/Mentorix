import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

export type LandingRevealFrom = "left" | "right" | "up" | "down";

export type LandingRevealProps = {
  children: ReactNode;
  from?: LandingRevealFrom;
  className?: string;
  delayMs?: number;
  threshold?: number;
};

export function LandingReveal({
  children,
  from = "up",
  className = "",
  delayMs = 0,
  threshold = 0.12,
}: LandingRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            obs.disconnect();
          }
        }
      },
      { root: null, rootMargin: "0px 0px -8% 0px", threshold }
    );

    obs.observe(node);
    return () => obs.disconnect();
  }, [threshold]);

  const style: CSSProperties | undefined =
    delayMs > 0 ? { "--landing-reveal-delay": `${delayMs}ms` } : undefined;

  const classes = [
    "landing-reveal",
    `landing-reveal--from-${from}`,
    visible ? "landing-reveal--visible" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={ref} className={classes} style={style}>
      {children}
    </div>
  );
}
