import { LandingReveal } from "../components/LandingReveal";
import { useLandingCopy } from "../i18n/LocaleContext";

export function BuilderShowcase() {
  const t = useLandingCopy();
  const mock = t.builder.mock;

  return (
    <section
      id="how"
      className="landing-section landing-section--gradient-cosmic"
      aria-labelledby="builder-title"
    >
      <div className="landing-container landing-showcase__inner">
        <LandingReveal from="left">
          <div className="landing-showcase__copy">
          <span className="landing-section__eyebrow">{t.builder.eyebrow}</span>
          <h2 id="builder-title">{t.builder.title}</h2>
          <p>{t.builder.body}</p>
          <ol className="landing-steps">
            {t.builder.steps.map((step) => (
              <li key={step.title}>
                <span>
                  <span className="landing-steps__title">{step.title}</span>
                  <span className="landing-steps__hint">{step.hint}</span>
                </span>
              </li>
            ))}
          </ol>
          </div>
        </LandingReveal>

        <LandingReveal from="right" delayMs={80}>
          <div className="landing-builder-mock" role="img" aria-label="Interview template form preview">
          <div className="landing-field">
            <span className="landing-field__label">{mock.title.label}</span>
            <span className="landing-field__value">{mock.title.value}</span>
          </div>

          <div className="landing-field__row">
            <div className="landing-field">
              <span className="landing-field__label">{mock.role.label}</span>
              <span className="landing-field__value">{mock.role.value}</span>
            </div>
            <div className="landing-field">
              <span className="landing-field__label">{mock.level.label}</span>
              <div className="landing-field__chips" role="radiogroup" aria-label={mock.level.label}>
                {mock.level.chips.map((chip, idx) => (
                  <span
                    key={chip}
                    className="landing-field__chip"
                    aria-pressed={idx === mock.level.selected}
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="landing-field">
            <span className="landing-field__label">{mock.questions.label}</span>
            <span className="landing-field__value">{mock.questions.value}</span>
          </div>

          <div className="landing-field">
            <span className="landing-field__label">{mock.rubric.label}</span>
            <span className="landing-field__value">{mock.rubric.value}</span>
          </div>
          </div>
        </LandingReveal>
      </div>
    </section>
  );
}
