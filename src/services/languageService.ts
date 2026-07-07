import { api } from '@/lib/api';
import type { ContentLanguage } from '@/types';

interface FullLanguage extends ContentLanguage {
  is_active: boolean;
  sort_order: number;
}

export const languageService = {
  /** Aktiv dillər — formalarda input yaratmaq üçün. */
  active: () => api<ContentLanguage[]>('/languages'),

  /** Bütün dillər (idarəetmə). */
  all: () => api<FullLanguage[]>('/languages/all'),

  create: (data: { code: string; name: string; is_active?: boolean; is_default?: boolean; sort_order?: number }) =>
    api<FullLanguage>('/languages', { method: 'POST', body: JSON.stringify(data) }),

  update: (code: string, data: Partial<{ name: string; is_active: boolean; is_default: boolean; sort_order: number }>) =>
    api<FullLanguage>(`/languages/${code}`, { method: 'PATCH', body: JSON.stringify(data) }),
};
