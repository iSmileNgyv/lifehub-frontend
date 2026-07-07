'use client';

import { useCallback, useState } from 'react';
import PickerModal from './PickerModal';
import PickerField from './PickerField';
import { EntityImage } from '@/components/ui/EntityImage';
import { itemService } from '@/services/itemService';
import { useLanguage } from '@/contexts/LanguageContext';
import { useContentLanguages } from '@/contexts/ContentLanguagesContext';
import { translateValue } from '@/lib/translate';
import type { Item } from '@/types';

export default function ItemPicker({
  value, displayValue, onChange, label, placeholder, disabled,
}: {
  value: string;
  displayValue?: string;
  onChange: (code: string, item?: Item) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const { t, language } = useLanguage();
  const { defaultCode } = useContentLanguages();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Item | null>(null);

  const fetchPage = useCallback((q: string, page: number) => itemService.list({ page, q: q || undefined }), []);
  const nm = (i: Item) => translateValue(i.name, language, defaultCode) || i.code;
  const display = picked && picked.code === value ? nm(picked) : (displayValue || value);

  return (
    <>
      <PickerField label={label} value={display} placeholder={placeholder || t('picker.choose')} onOpen={() => setOpen(true)} disabled={disabled} />
      <PickerModal<Item>
        open={open}
        title={t('picker.selectItem')}
        onClose={() => setOpen(false)}
        fetchPage={fetchPage}
        keyOf={(i) => i.code}
        layout="grid"
        emptyText={t('picker.empty')}
        onPick={(i) => { setPicked(i); onChange(i.code, i); setOpen(false); }}
        renderItem={(i, pick) => (
          <button onClick={pick} className="w-full text-left bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all">
            <div className="relative aspect-[4/3]">
              <EntityImage uid={i.image} initial={nm(i).charAt(0).toUpperCase()} className="absolute inset-0 w-full h-full" />
            </div>
            <div className="p-2">
              <p className="font-medium text-gray-900 dark:text-white text-xs leading-tight truncate">{nm(i)}</p>
              <p className="text-[10px] text-gray-400 font-mono">{i.code}</p>
            </div>
          </button>
        )}
      />
    </>
  );
}
