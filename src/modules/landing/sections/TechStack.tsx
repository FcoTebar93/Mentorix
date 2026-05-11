import { useLandingCopy } from "../i18n/LocaleContext";

export function TechStack() {
  const t = useLandingCopy();

  return (
    <section
      className="landing-section landing-section--gradient-cosmic"
      aria-labelledby="stack-title"
    >
      <div className="landing-container">
        <header className="landing-section__header landing-section__header--centered">
          <span className="landing-section__eyebrow">{t.stack.eyebrow}</span>
          <h2 id="stack-title" className="landing-section__title">
            {t.stack.title}
          </h2>
          <p className="landing-section__subtitle">{t.stack.body}</p>
        </header>

        <div className="landing-stack__grid">
          <article className="landing-stack__col">
            <h3>{t.stack.frontend.title}</h3>
            <ul>
              {t.stack.frontend.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
          <article className="landing-stack__col">
            <h3>{t.stack.backend.title}</h3>
            <ul>
              {t.stack.backend.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}
