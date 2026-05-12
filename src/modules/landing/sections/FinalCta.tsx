import { LandingReveal } from "../components/LandingReveal";
import { PrimaryCta } from "../components/PrimaryCta";
import { SecondaryCta } from "../components/SecondaryCta";
import { useLandingCopy } from "../i18n/LocaleContext";

type Props = {
  onPrimary: () => void;
  onSecondary: () => void;
};

export function FinalCta({ onPrimary, onSecondary }: Props) {
  const t = useLandingCopy();

  return (
    <section
      id="pricing"
      className="landing-section landing-final"
      aria-labelledby="final-title"
    >
      <div className="landing-container">
        <LandingReveal from="up">
          <>
            <h2 id="final-title" className="landing-final__title">
              {t.final.title}
            </h2>
            <p className="landing-final__sub">{t.final.subtitle}</p>
            <div className="landing-final__ctas">
              <PrimaryCta onClick={onPrimary} withArrow>
                {t.final.ctaPrimary}
              </PrimaryCta>
              <SecondaryCta onClick={onSecondary}>{t.final.ctaSecondary}</SecondaryCta>
            </div>
          </>
        </LandingReveal>
      </div>
    </section>
  );
}
