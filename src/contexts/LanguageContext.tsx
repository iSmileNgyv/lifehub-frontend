'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Language } from '@/types';
import { api, getToken } from '@/lib/api';
import az from '@/i18n/az.json';
import en from '@/i18n/en.json';
import ru from '@/i18n/ru.json';

const translations = { az, en, ru };
const STORAGE_KEY = 'procurement_language';

function isLanguage(v: unknown): v is Language {
  return v === 'az' || v === 'en' || v === 'ru';
}

type TranslationKeys = typeof az;

interface LanguageContextValue {
  language: Language;
  /** İstifadəçi dili dəyişir — localStorage + backend-ə yazılır. */
  setLanguage: (lang: Language) => void;
  /** Serverdən gələn dili tətbiq edir (geri yazmadan). */
  syncLanguage: (lang: Language) => void;
  t: (path: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // SSR uyğunluğu üçün default ilə başlayır, mount-dan sonra localStorage-dan oxuyur
  const [language, setLanguageState] = useState<Language>('az');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isLanguage(saved)) {
      setLanguageState(saved);
      document.documentElement.lang = saved;
    }
  }, []);

  // localStorage + html lang (geri yazma yoxdur)
  const syncLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
  }, []);

  // İstifadəçi seçimi — yuxarıdakı + daxil olubsa backend-də yadda saxla
  const setLanguage = useCallback((lang: Language) => {
    syncLanguage(lang);
    if (getToken()) {
      api('/auth/language', { method: 'PUT', body: JSON.stringify({ language: lang }) }).catch(() => {});
    }
  }, [syncLanguage]);

  const t = useCallback(
    (path: string): string => {
      const keys = path.split('.');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let value: any = translations[language];
      for (const key of keys) {
        value = value?.[key];
      }
      return typeof value === 'string' ? value : path;
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, syncLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}

// Re-export type for completeness
export type { TranslationKeys };
