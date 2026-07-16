'use client';

import { useCallback, useEffect, useState } from 'react';
import PickerModal from './PickerModal';
import PickerField from './PickerField';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import TranslatableInput from '@/components/ui/TranslatableInput';
import { itemCategoryService } from '@/services/itemCategoryService';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useContentLanguages } from '@/contexts/ContentLanguagesContext';
import { translateValue } from '@/lib/translate';
import { ApiError } from '@/lib/api';
import type { ItemCategory, Translatable } from '@/types';

/** Kateqoriya seçici — search + yoxdursa oradaca yarat (select əvəzinə). Kateqoriya opsionaldır (təmizlə). */
export default function CategoryPicker({
  value, onChange, label, placeholder, disabled,
}: {
  value: string;
  onChange: (code: string, cat?: ItemCategory) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const { can } = useAuth();
  const { t, language } = useLanguage();
  const { defaultCode } = useContentLanguages();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<ItemCategory | null>(null);

  const nm = (c: ItemCategory) => translateValue(c.name, language, defaultCode) || c.code;

  // Kateqoriyalar paginate olunmur → hamısını çək, client-side filtr et
  const fetchPage = useCallback(async (q: string) => {
    const all = await itemCategoryService.list();
    const ql = q.trim().toLowerCase();
    const data = ql
      ? all.filter((c) => c.code.toLowerCase().includes(ql) || (translateValue(c.name, language, defaultCode) || '').toLowerCase().includes(ql))
      : all;
    return { data, current_page: 1, last_page: 1 };
  }, [language, defaultCode]);

  const display = picked && picked.code === value ? nm(picked) : value;

  return (
    <>
      <PickerField
        label={label}
        value={display}
        placeholder={placeholder || t('picker.choose')}
        onOpen={() => setOpen(true)}
        onClear={value ? () => { setPicked(null); onChange(''); } : undefined}
        disabled={disabled}
      />
      <PickerModal<ItemCategory>
        open={open}
        title={t('picker.selectCategory')}
        onClose={() => setOpen(false)}
        fetchPage={fetchPage}
        keyOf={(c) => c.code}
        layout="list"
        emptyText={t('picker.empty')}
        canCreate={can('CATEGORY_CREATE')}
        createLabel={t('common.create')}
        createTitle={t('picker.newCategory')}
        renderCreate={(onCreated, onCancel) => <CategoryForm onSaved={onCreated} onCancel={onCancel} />}
        onPick={(c) => { setPicked(c); onChange(c.code, c); setOpen(false); }}
        renderItem={(c, pick) => (
          <button onClick={pick} className="w-full flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-2.5 text-left hover:border-blue-300 dark:hover:border-blue-700">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{nm(c)}</p>
              <p className="text-xs text-gray-400 font-mono">{c.code}</p>
            </div>
          </button>
        )}
      />
    </>
  );
}

/** Kateqoriya yaratma forması (picker daxilində). Ağac idarəsi kateqoriya səhifəsində qalır — burda sadə üst seçim. */
function CategoryForm({ onSaved, onCancel }: { onSaved: (c: ItemCategory) => void; onCancel: () => void }) {
  const { t, language } = useLanguage();
  const { defaultCode } = useContentLanguages();
  const [code, setCode] = useState('');
  const [name, setName] = useState<Translatable>({});
  const [parent, setParent] = useState<string | null>(null);
  const [cats, setCats] = useState<ItemCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { itemCategoryService.list().then(setCats).catch(() => {}); }, []);

  const submit = async () => {
    setError('');
    if (!code.trim()) { setError(`${t('common.code')} *`); return; }
    setLoading(true);
    try { onSaved(await itemCategoryService.create({ code: code.trim().toUpperCase(), parent_code: parent, name, status: 'ACTIVE' })); }
    catch (e) { setError(e instanceof ApiError ? e.message : t('common.error')); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-3">
      {error && <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600">{error}</div>}
      <Input label={t('common.code')} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="MOTOR" />
      <TranslatableInput label={t('common.name')} value={name} onChange={setName} />
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('categories.parentCategory')}</label>
        <select value={parent ?? ''} onChange={(e) => setParent(e.target.value || null)} className="w-full h-9 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:border-blue-500">
          <option value="">{t('categories.rootOption')}</option>
          {cats.map((c) => <option key={c.code} value={c.code}>{translateValue(c.name, language, defaultCode) || c.code} ({c.code})</option>)}
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" onClick={onCancel} disabled={loading}>{t('common.cancel')}</Button>
        <Button onClick={submit} loading={loading}>{t('common.save')}</Button>
      </div>
    </div>
  );
}
