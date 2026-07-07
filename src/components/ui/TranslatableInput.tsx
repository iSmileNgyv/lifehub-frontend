'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useContentLanguages } from '@/contexts/ContentLanguagesContext';
import type { Translatable } from '@/types';

interface TranslatableInputProps {
  label?: string;
  value: Translatable;
  onChange: (value: Translatable) => void;
  placeholder?: string;
  multiline?: boolean;
}

/**
 * Hər aktiv dil üçün bir input (reyestrdən dinamik).
 * Dəyər: { az: "...", en: "...", ... } — backend JSONB-yə düz oturur.
 */
export default function TranslatableInput({ label, value, onChange, placeholder, multiline }: TranslatableInputProps) {
  const { languages, defaultCode } = useContentLanguages();
  const [active, setActive] = useState<string>(defaultCode);

  // dillər gec yüklənsə, aktiv tab default-a düşsün
  const activeCode = languages.some((l) => l.code === active) ? active : (languages[0]?.code ?? defaultCode);

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      )}

      {/* Dil tabları */}
      <div className="flex items-center gap-1">
        {languages.map((l) => {
          const filled = Boolean(value[l.code]);
          const isActive = l.code === activeCode;
          return (
            <button
              key={l.code}
              type="button"
              onClick={() => setActive(l.code)}
              title={l.name}
              className={cn(
                'flex items-center gap-1 px-2 h-7 rounded-md text-xs font-medium uppercase transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
              )}
            >
              {l.code}
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  filled ? 'bg-emerald-400' : isActive ? 'bg-white/40' : 'bg-gray-300 dark:bg-gray-600',
                )}
              />
            </button>
          );
        })}
      </div>

      {multiline ? (
        <textarea
          value={value[activeCode] ?? ''}
          onChange={(e) => onChange({ ...value, [activeCode]: e.target.value })}
          placeholder={placeholder}
          rows={3}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-y"
        />
      ) : (
        <input
          value={value[activeCode] ?? ''}
          onChange={(e) => onChange({ ...value, [activeCode]: e.target.value })}
          placeholder={placeholder}
          className="w-full h-9 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      )}
    </div>
  );
}
