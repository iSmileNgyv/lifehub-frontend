'use client';

import { useCallback, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import PickerModal from './PickerModal';
import PickerField from './PickerField';
import { EntityImage } from '@/components/ui/EntityImage';
import { ItemFormFields } from '@/components/inventory/ItemForm';
import { itemService } from '@/services/itemService';
import { useAuth } from '@/contexts/AuthContext';
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
  const { can } = useAuth();
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
        canCreate={can('PRODUCT_CREATE')}
        createLabel={t('common.create')}
        createTitle={t('picker.newItem')}
        renderCreate={(onCreated, onCancel) => <ItemFormFields onSaved={onCreated} onCancel={onCancel} />}
        editTitle={t('common.edit')}
        renderEdit={can('PRODUCT_UPDATE') ? (item, onSaved, onCancel) => <ItemFormFields item={item} onSaved={() => onSaved()} onCancel={onCancel} /> : undefined}
        onDelete={can('PRODUCT_DELETE') ? (i) => itemService.remove(i.code).then(() => undefined) : undefined}
        onPick={(i) => { setPicked(i); onChange(i.code, i); setOpen(false); }}
        renderItem={(i, pick, actions) => (
          <div className="group relative bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all">
            <button onClick={pick} className="w-full text-left">
              <div className="relative aspect-[4/3]">
                <EntityImage uid={i.image} initial={nm(i).charAt(0).toUpperCase()} className="absolute inset-0 w-full h-full" />
              </div>
              <div className="p-2">
                <p className="font-medium text-gray-900 dark:text-white text-xs leading-tight truncate">{nm(i)}</p>
                <p className="text-[10px] text-gray-400 font-mono truncate">{i.code}</p>
              </div>
            </button>
            {(can('PRODUCT_UPDATE') || can('PRODUCT_DELETE')) && (
              <div className="absolute top-1 right-1 flex gap-1">
                {can('PRODUCT_UPDATE') && <button onClick={actions.edit} title={t('common.edit')} className="w-6 h-6 flex items-center justify-center rounded-md bg-white/90 dark:bg-gray-800/90 text-gray-500 hover:text-blue-600 shadow-sm"><Pencil className="w-3.5 h-3.5" /></button>}
                {can('PRODUCT_DELETE') && <button onClick={actions.del} title={t('common.delete')} className="w-6 h-6 flex items-center justify-center rounded-md bg-white/90 dark:bg-gray-800/90 text-gray-500 hover:text-red-500 shadow-sm"><Trash2 className="w-3.5 h-3.5" /></button>}
              </div>
            )}
          </div>
        )}
      />
    </>
  );
}
