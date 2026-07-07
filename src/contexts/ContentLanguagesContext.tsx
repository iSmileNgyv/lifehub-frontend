'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { languageService } from '@/services/languageService';
import type { ContentLanguage } from '@/types';

interface ContentLanguagesValue {
  languages: ContentLanguage[];
  defaultCode: string;
  loading: boolean;
}

const ContentLanguagesContext = createContext<ContentLanguagesValue | undefined>(undefined);

export function ContentLanguagesProvider({ children }: { children: React.ReactNode }) {
  const [languages, setLanguages] = useState<ContentLanguage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    languageService
      .active()
      .then((langs) => active && setLanguages(langs))
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const defaultCode = languages.find((l) => l.is_default)?.code ?? languages[0]?.code ?? 'az';

  return (
    <ContentLanguagesContext.Provider value={{ languages, defaultCode, loading }}>
      {children}
    </ContentLanguagesContext.Provider>
  );
}

export function useContentLanguages(): ContentLanguagesValue {
  const ctx = useContext(ContentLanguagesContext);
  if (!ctx) throw new Error('useContentLanguages ContentLanguagesProvider daxilində istifadə olunmalıdır');
  return ctx;
}
