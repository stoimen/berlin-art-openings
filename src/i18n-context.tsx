import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  LOCALE_STORAGE_KEY,
  detectPreferredLocale,
  getLocaleName,
  translations,
  type Locale,
} from './i18n';

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  copy: (typeof translations)[Locale];
  getLanguageName: (locale: Locale) => string;
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(detectPreferredLocale);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    }

    if (typeof document !== 'undefined') {
      document.documentElement.lang = translations[locale].htmlLang;
      document.title = translations[locale].documentTitle;
    }
  }, [locale]);

  return (
    <I18nContext.Provider
      value={{
        locale,
        setLocale,
        copy: translations[locale],
        getLanguageName: getLocaleName,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }

  return context;
}
