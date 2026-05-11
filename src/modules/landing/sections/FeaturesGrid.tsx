import { FeatureIcon } from "../components/FeatureIcon";
import { useLandingCopy } from "../i18n/LocaleContext";

export function FeaturesGrid() {
  const t = useLandingCopy();

  return (
    <section id="features" className="landing-section" aria-labelledby="features-title">
      <div className="landing-container">
        <header className="landing-section__header landing-section__header--centered">
          <span className="landing-section__eyebrow">{t.features.eyebrow}</span>
          <h2 id="features-title" className="landing-section__title">
            {t.features.title}
          </h2>
          <p className="landing-section__subtitle">{t.features.subtitle}</p>
        </header>

        <div className="landing-features__grid">
          {t.features.items.map((feature) => (
            <article key={feature.title} className="landing-feature">
              <span className="landing-feature__icon" aria-hidden="true">
                <FeatureIcon name={feature.icon} />
              </span>
              <h3 className="landing-feature__title">{feature.title}</h3>
              <p className="landing-feature__body">{feature.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
