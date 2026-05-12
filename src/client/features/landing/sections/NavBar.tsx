import { PrimaryCta } from "../components/PrimaryCta";
import { GhostButton } from "../components/GhostButton";
import { useLocale } from "../i18n/LocaleContext";
import type { Locale } from "../i18n/types";

type Props = {
  onLogin: () => void;
  onCreate: () => void;
};

export function NavBar({ onLogin, onCreate }: Props) {
  const { t, locale, setLocale } = useLocale();

  return (
    <header className="landing-nav" role="banner">
      <div className="landing-container landing-nav__inner">
        <a className="landing-nav__brand" href="#top" aria-label="Mentorix">
          <span className="landing-nav__brand-dot" aria-hidden="true" />
          <span>Mentorix</span>
        </a>

        <nav className="landing-nav__links" aria-label="Primary">
          <a className="landing-nav__link" href="#features">
            {t.nav.product}
          </a>
          <a className="landing-nav__link" href="#how">
            {t.nav.how}
          </a>
          <a className="landing-nav__link" href="#devs">
            {t.nav.devs}
          </a>
          <a className="landing-nav__link" href="#pricing">
            {t.nav.pricing}
          </a>
        </nav>

        <div className="landing-nav__actions">
          <LocaleToggle locale={locale} onChange={setLocale} ariaLabel={t.nav.localeLabel} />
          <GhostButton onClick={onLogin}>{t.nav.signIn}</GhostButton>
          <PrimaryCta onClick={onCreate} aria-label={t.nav.getStarted}>
            {t.nav.getStarted}
          </PrimaryCta>
        </div>
      </div>
    </header>
  );
}

type LocaleToggleProps = {
  locale: Locale;
  onChange: (next: Locale) => void;
  ariaLabel: string;
};

function LocaleToggle({ locale, onChange, ariaLabel }: LocaleToggleProps) {
  return (
    <div className="landing-nav__locale" role="group" aria-label={ariaLabel}>
      <button
        type="button"
        aria-pressed={locale === "es"}
        onClick={() => onChange("es")}
      >
        ES
      </button>
      <button
        type="button"
        aria-pressed={locale === "en"}
        onClick={() => onChange("en")}
      >
        EN
      </button>
    </div>
  );
}
