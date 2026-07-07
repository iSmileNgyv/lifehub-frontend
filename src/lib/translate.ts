import type { Translatable } from '@/types';

/**
 * Çoxdilli dəyəri cari dilə görə həll edir.
 * Sıra: cari dil → fallback (default) dil → ilk dolu dəyər → ''.
 */
export function translateValue(
  value: Translatable | null | undefined,
  lang: string,
  fallback?: string,
): string {
  if (!value) return '';
  if (value[lang]) return value[lang];
  if (fallback && value[fallback]) return value[fallback];
  return Object.values(value).find((v) => v) ?? '';
}
