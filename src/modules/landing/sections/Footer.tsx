import { useLocale } from "../i18n/LocaleContext";
import type { Locale } from "../i18n/types";

export function Footer() {
  const { t, locale, setLocale } = useLocale();

  return (
    <footer className="landing-footer" role="contentinfo">
      <div className="landing-container">
        <div className="landing-footer__grid">
          <div className="landing-footer__brand">
            <strong>Mentorix</strong>
            <p>{t.footer.tagline}</p>
          </div>
          {t.footer.columns.map((col) => (
            <div key={col.title} className="landing-footer__col">
              <h4>{col.title}</h4>
              <ul>
                {col.items.map((item) => (
                  <li key={item}>
                    <a href="#" onClick={(e) => e.preventDefault()}>
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="landing-footer__bottom">
          <span>{t.footer.rights}</span>
          <FooterLocaleToggle locale={locale} onChange={setLocale} ariaLabel={t.nav.localeLabel} />
        </div>
      </div>
    </footer>
  );
}

type ToggleProps = {
  locale: Locale;
  onChange: (next: Locale) => void;
  ariaLabel: string;
};

function FooterLocaleToggle({ locale, onChange, ariaLabel }: ToggleProps) {
  return (
    <div className="landing-nav__locale" role="group" aria-label={ariaLabel}>
      <button type="button" aria-pressed={locale === "es"} onClick={() => onChange("es")}>
        ES
      </button>
      <button type="button" aria-pressed={locale === "en"} onClick={() => onChange("en")}>
        EN
      </button>
    </div>
  );
}
