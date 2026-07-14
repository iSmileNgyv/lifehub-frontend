'use client';

import { useCallback, useEffect, useState } from 'react';
import { Pencil, Trash2, Loader2 } from 'lucide-react';
import PickerModal from './PickerModal';
import PickerField from './PickerField';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { EntityImage } from '@/components/ui/EntityImage';
import { itemService } from '@/services/itemService';
import { measureService } from '@/services/measureService';
import { itemCategoryService } from '@/services/itemCategoryService';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useContentLanguages } from '@/contexts/ContentLanguagesContext';
import { translateValue } from '@/lib/translate';
import { ApiError } from '@/lib/api';
import type { Item, ItemCategory, Measurement, Translatable } from '@/types';

const genCode = (name: string) => {
  let base = name.trim().toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 20);
  if (!/^[A-Z]/.test(base)) base = `I${base}`;
  return `${base || 'ITEM'}_${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
};

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
        renderCreate={(onCreated, onCancel) => <ItemForm onSaved={onCreated} onCancel={onCancel} />}
        editTitle={t('common.edit')}
        renderEdit={can('PRODUCT_UPDATE') ? (item, onSaved, onCancel) => <ItemForm item={item} onSaved={() => onSaved()} onCancel={onCancel} /> : undefined}
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

/** Məhsul yaratma/redaktə forması (picker daxilində). */
function ItemForm({ item, onSaved, onCancel }: { item?: Item; onSaved: (i: Item) => void; onCancel: () => void }) {
  const { t, language } = useLanguage();
  const { defaultCode } = useContentLanguages();
  const tr = (v: Translatable | null | undefined, fb: string) => translateValue(v ?? undefined, language, defaultCode) || fb;

  const [name, setName] = useState(item ? tr(item.name, item.code) : '');
  const [category, setCategory] = useState<string>(item?.category_code ?? '');
  const [measure, setMeasure] = useState(item?.base_measure_code ?? '');
  const [measures, setMeasures] = useState<Measurement[]>([]);
  const [cats, setCats] = useState<ItemCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    measureService.list().then((m) => { setMeasures(m); if (!item && m[0]) setMeasure((cur) => cur || m[0].code); }).catch(() => {});
    itemCategoryService.list().then(setCats).catch(() => {});
  }, [item]);

  const sel = 'w-full h-9 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:border-blue-500';

  const submit = async () => {
    setError('');
    if (!name.trim()) { setError(`${t('common.name')} *`); return; }
    if (!measure) { setError(`${t('products.baseMeasure')} *`); return; }
    setLoading(true);
    try {
      const payload = { name: { [defaultCode]: name.trim() }, category_code: category || null, base_measure_code: measure, status: (item?.status ?? 'ACTIVE') as Item['status'] };
      const saved = item
        ? await itemService.update(item.code, payload)
        : await itemService.create({ code: genCode(name), ...payload });
      onSaved(saved);
    } catch (e) { setError(e instanceof ApiError ? e.message : t('common.error')); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-3">
      {error && <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600">{error}</div>}
      <Input label={t('common.name')} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('finance.newItemName')} />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('products.category')}</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={sel}>
            <option value="">—</option>
            {cats.map((c) => <option key={c.code} value={c.code}>{tr(c.name, c.code)}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('products.baseMeasure')} *</label>
          <select value={measure} onChange={(e) => setMeasure(e.target.value)} className={sel}>
            <option value="">—</option>
            {measures.map((m) => <option key={m.code} value={m.code}>{tr(m.name, m.code)}</option>)}
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" onClick={onCancel} disabled={loading}>{t('common.cancel')}</Button>
        <Button onClick={submit} loading={loading}>{t('common.save')}</Button>
      </div>
    </div>
  );
}
