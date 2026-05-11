import { PrimaryCta } from "../components/PrimaryCta";
import { SecondaryCta } from "../components/SecondaryCta";
import { HighlightBadge } from "../components/HighlightBadge";
import { BarGraph } from "../components/BarGraph";
import { useLandingCopy } from "../i18n/LocaleContext";

type Props = {
  onPrimary: () => void;
  onSecondary: () => void;
};

const WAVE_BARS = 24;

export function Hero({ onPrimary, onSecondary }: Props) {
  const t = useLandingCopy();

  return (
    <section id="top" className="landing-hero" aria-labelledby="hero-title">
      <div className="landing-container landing-hero__inner">
        <div className="landing-hero__copy">
          <HighlightBadge>{t.hero.badge}</HighlightBadge>
          <h1 id="hero-title" className="landing-hero__title">
            {t.hero.title}
          </h1>
          <p className="landing-hero__subtitle">{t.hero.subtitle}</p>
          <div className="landing-hero__ctas">
            <PrimaryCta onClick={onPrimary} withArrow aria-label={t.hero.ctaPrimary}>
              {t.hero.ctaPrimary}
            </PrimaryCta>
            <SecondaryCta onClick={onSecondary} aria-label={t.hero.ctaSecondary}>
              {t.hero.ctaSecondary}
            </SecondaryCta>
          </div>
          <p className="landing-hero__trust">{t.hero.trustNote}</p>
        </div>

        <div className="landing-hero__visual" aria-hidden="false">
          <MonitorMock />
        </div>
      </div>
    </section>
  );
}

function MonitorMock() {
  const t = useLandingCopy();
  return (
    <div className="landing-monitor" role="img" aria-label="Mentorix interview preview">
      <div className="landing-monitor__chrome">
        <span className="landing-monitor__dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        <span className="landing-monitor__url">{t.hero.monitorUrl}</span>
        <span style={{ width: 40 }} aria-hidden="true" />
      </div>
      <div className="landing-monitor__body">
        <span className="landing-monitor__question-label">
          {t.hero.monitorQuestionLabel}
        </span>
        <p className="landing-monitor__question">{t.hero.monitorQuestion}</p>

        <div className="landing-monitor__waveform" aria-hidden="true">
          {Array.from({ length: WAVE_BARS }).map((_, idx) => (
            <span
              key={idx}
              style={{
                animationDelay: `${(idx % 8) * 90}ms`,
                height: `${20 + ((idx * 13) % 60)}%`,
              }}
            />
          ))}
        </div>

        <div className="landing-monitor__transcript">
          <strong>{t.hero.monitorTranscriptLabel}</strong>
          <br />
          {t.hero.monitorTranscriptText}
        </div>

        <div className="landing-monitor__scores">
          <BarGraph
            ariaLabel="dimension scores"
            items={[
              { label: t.hero.monitorScoreLabels.clarity, value: 82 },
              { label: t.hero.monitorScoreLabels.depth, value: 74 },
              { label: t.hero.monitorScoreLabels.reasoning, value: 91 },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
