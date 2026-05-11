import { useLandingCopy } from "../i18n/LocaleContext";

export function ProvidersStrip() {
  const t = useLandingCopy();

  return (
    <section className="landing-section" aria-label={t.providers.eyebrow}>
      <div className="landing-container">
        <div className="landing-providers__header">
          <span className="landing-section__eyebrow">{t.providers.eyebrow}</span>
        </div>
        <div className="landing-providers__chips">
          {t.providers.items.map((name) => {
            const muted = name.toLowerCase().includes("pronto") || name.toLowerCase().includes("soon");
            return (
              <span
                key={name}
                className={muted ? "landing-chip landing-chip--muted" : "landing-chip"}
              >
                <span className="landing-chip__dot" aria-hidden="true" />
                <span>{name}</span>
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}
