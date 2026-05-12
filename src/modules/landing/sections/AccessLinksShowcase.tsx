import { CommandLine } from "../components/CommandLine";
import { LandingReveal } from "../components/LandingReveal";
import { useLandingCopy } from "../i18n/LocaleContext";

export function AccessLinksShowcase() {
  const t = useLandingCopy();

  return (
    <section className="landing-section" aria-labelledby="links-title">
      <div className="landing-container landing-showcase__inner">
        <LandingReveal from="left">
          <div className="landing-showcase__copy">
            <span className="landing-section__eyebrow">{t.accessLinks.eyebrow}</span>
            <h2 id="links-title">{t.accessLinks.title}</h2>
            <p>{t.accessLinks.body}</p>
            <div className="landing-pills">
              {t.accessLinks.pills.map((pill) => (
                <span key={pill} className="landing-pill">
                  {pill}
                </span>
              ))}
            </div>
          </div>
        </LandingReveal>

        <LandingReveal from="right" delayMs={80}>
          <div>
            <CommandLine prompt=">" line={t.accessLinks.command} />
          </div>
        </LandingReveal>
      </div>
    </section>
  );
}
