import { FeatureIcon } from "../components/FeatureIcon";
import { LandingReveal } from "../components/LandingReveal";
import { useLandingCopy } from "../i18n/LocaleContext";

export function FeaturesGrid() {
  const t = useLandingCopy();

  return (
    <section id="features" className="landing-section" aria-labelledby="features-title">
      <div className="landing-container">
        <header className="landing-section__header landing-section__header--centered">
          <LandingReveal from="up">
            <>
              <span className="landing-section__eyebrow">{t.features.eyebrow}</span>
              <h2 id="features-title" className="landing-section__title">
                {t.features.title}
              </h2>
              <p className="landing-section__subtitle">{t.features.subtitle}</p>
            </>
          </LandingReveal>
        </header>

        <div className="landing-features__grid">
          {t.features.items.map((feature, idx) => {
            const from = idx % 3 === 0 ? "left" : idx % 3 === 2 ? "right" : "up";
            return (
              <LandingReveal key={feature.title} from={from} delayMs={idx * 65}>
                <article className="landing-feature">
                  <span className="landing-feature__icon" aria-hidden="true">
                    <FeatureIcon name={feature.icon} />
                  </span>
                  <h3 className="landing-feature__title">{feature.title}</h3>
                  <p className="landing-feature__body">{feature.body}</p>
                </article>
              </LandingReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
