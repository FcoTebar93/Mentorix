import { LandingReveal } from "../components/LandingReveal";
import { useLandingCopy } from "../i18n/LocaleContext";

const WAVE_BARS = 18;

export function CandidateExperience() {
  const t = useLandingCopy();
  const mock = t.candidate.mock;

  return (
    <section
      className="landing-section landing-section--gradient-deep"
      aria-labelledby="candidate-title"
    >
      <div className="landing-container landing-showcase__inner">
        <LandingReveal from="left">
          <div className="landing-showcase__copy">
            <span className="landing-section__eyebrow">{t.candidate.eyebrow}</span>
            <h2 id="candidate-title">{t.candidate.title}</h2>
            <p>{t.candidate.body}</p>
            <p className="landing-candidate__foot">{t.candidate.foot}</p>
          </div>
        </LandingReveal>

        <LandingReveal from="right" delayMs={90}>
          <div className="landing-candidate-mock" role="img" aria-label="Candidate interview screen preview">
          <aside className="landing-candidate-mock__aside">
            <div className="landing-candidate-mock__brand">
              <strong>{mock.brandTitle}</strong>
              <span>{mock.brandSubtitle}</span>
            </div>
            <nav className="landing-candidate-mock__nav" aria-label="Candidate nav">
              {mock.navItems.map((item, idx) => (
                <button key={item} type="button" className={idx === 0 ? "is-active" : ""} tabIndex={-1}>
                  {item}
                </button>
              ))}
            </nav>
          </aside>
          <div className="landing-candidate-mock__main">
            <span className="landing-monitor__question-label">{mock.questionLabel}</span>
            <p className="landing-monitor__question">{mock.question}</p>
            <div className="landing-monitor__waveform" aria-hidden="true">
              {Array.from({ length: WAVE_BARS }).map((_, idx) => (
                <span
                  key={idx}
                  style={{
                    animationDelay: `${(idx % 6) * 110}ms`,
                    height: `${30 + ((idx * 17) % 50)}%`,
                  }}
                />
              ))}
            </div>
            <p className="landing-candidate-mock__hint">{mock.hint}</p>
          </div>
          </div>
        </LandingReveal>
      </div>
    </section>
  );
}
