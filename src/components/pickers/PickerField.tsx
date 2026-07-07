'use client';

import { ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Select-i əvəz edən düymə: seçiləni göstərir, klik → picker modalı açır. */
export default function PickerField({
  label, value, placeholder, onOpen, onClear, disabled, error,
}: {
  label?: string;
  value: string;            // göstəriləcək mətn (boşdursa placeholder)
  placeholder?: string;
  onOpen: () => void;
  onClear?: () => void;     // verilibsə "təmizlə" düyməsi çıxır
  disabled?: boolean;
  error?: boolean;
}) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>}
      <div className="relative">
        <button
          type="button"
          onClick={onOpen}
          disabled={disabled}
          className={cn(
            'w-full h-9 pl-3 pr-9 rounded-lg border bg-white dark:bg-gray-900 text-sm text-left outline-none transition-all flex items-center',
            'border-gray-300 dark:border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
            error && 'border-red-500',
            disabled && 'opacity-50 cursor-not-allowed',
          )}
        >
          <span className={cn('truncate', value ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400')}>
            {value || placeholder || '—'}
          </span>
        </button>
        {value && onClear && !disabled ? (
          <button type="button" onClick={onClear} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500">
            <X className="w-4 h-4" />
          </button>
        ) : (
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        )}
      </div>
    </div>
  );
}
