import { LandingReveal } from "../components/LandingReveal";
import { useLandingCopy } from "../i18n/LocaleContext";

export function ReplacesStrip() {
  const t = useLandingCopy();

  return (
    <section className="landing-section landing-section--divider-top landing-replaces" aria-label={t.replaces.eyebrow}>
      <div className="landing-container">
        <LandingReveal from="up">
          <>
            <div className="landing-replaces__eyebrow-wrap">
              <span className="landing-section__eyebrow">{t.replaces.eyebrow}</span>
            </div>
            <div className="landing-replaces__row">
              {t.replaces.items.map((item, idx) => (
                <span key={item} className="landing-replaces__entry">
                  <span className="landing-replaces__item">{item}</span>
                  {idx < t.replaces.items.length - 1 ? (
                    <span className="landing-replaces__sep" aria-hidden="true">·</span>
                  ) : null}
                </span>
              ))}
            </div>
            <p className="landing-replaces__note">{t.replaces.note}</p>
          </>
        </LandingReveal>
      </div>
    </section>
  );
}
