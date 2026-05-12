import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { copy } from "./copy";
import type { LandingCopy, Locale } from "./types";

const STORAGE_KEY = "mentorix.landing.locale";
const SUPPORTED: readonly Locale[] = ["es", "en"] as const;

type LocaleContextValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: LandingCopy;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readInitialLocale(): Locale {
  if (typeof window === "undefined") return "es";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "es" || stored === "en") return stored;
  } catch {
    // ignore storage access failures (private mode, etc.)
  }
  const navLang = window.navigator?.language?.slice(0, 2).toLowerCase();
  if (navLang && (SUPPORTED as readonly string[]).includes(navLang)) {
    return navLang as Locale;
  }
  return "es";
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => readInitialLocale());

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, t: copy[locale] }),
    [locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used inside <LocaleProvider>");
  }
  return ctx;
}

export function useLandingCopy(): LandingCopy {
  return useLocale().t;
}
