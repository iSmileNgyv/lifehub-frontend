'use client';

import { useCallback, useState } from 'react';
import PickerModal from './PickerModal';
import PickerField from './PickerField';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import TranslatableInput from '@/components/ui/TranslatableInput';
import { measureService } from '@/services/measureService';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useContentLanguages } from '@/contexts/ContentLanguagesContext';
import { translateValue } from '@/lib/translate';
import { ApiError } from '@/lib/api';
import type { Measurement, Translatable } from '@/types';

/** Ölçü vahidi seçici — search + yoxdursa oradaca yarat (select əvəzinə). */
export default function MeasurePicker({
  value, onChange, label, placeholder, disabled, error,
}: {
  value: string;
  onChange: (code: string, measure?: Measurement) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
}) {
  const { can } = useAuth();
  const { t, language } = useLanguage();
  const { defaultCode } = useContentLanguages();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Measurement | null>(null);

  const nm = (m: Measurement) => translateValue(m.name, language, defaultCode) || m.code;

  // Ölçülər paginate olunmur → hamısını çək, client-side filtr et
  const fetchPage = useCallback(async (q: string) => {
    const all = await measureService.list();
    const ql = q.trim().toLowerCase();
    const data = ql
      ? all.filter((m) => m.code.toLowerCase().includes(ql) || (translateValue(m.name, language, defaultCode) || '').toLowerCase().includes(ql))
      : all;
    return { data, current_page: 1, last_page: 1 };
  }, [language, defaultCode]);

  const display = picked && picked.code === value ? nm(picked) : value;

  return (
    <>
      <PickerField label={label} value={display} placeholder={placeholder || t('picker.choose')} onOpen={() => setOpen(true)} disabled={disabled} error={error} />
      <PickerModal<Measurement>
        open={open}
        title={t('picker.selectMeasure')}
        onClose={() => setOpen(false)}
        fetchPage={fetchPage}
        keyOf={(m) => m.code}
        layout="list"
        emptyText={t('picker.empty')}
        canCreate={can('MEASURE_CREATE')}
        createLabel={t('common.create')}
        createTitle={t('picker.newMeasure')}
        renderCreate={(onCreated, onCancel) => <MeasureForm onSaved={onCreated} onCancel={onCancel} />}
        onPick={(m) => { setPicked(m); onChange(m.code, m); setOpen(false); }}
        renderItem={(m, pick) => (
          <button onClick={pick} className="w-full flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-2.5 text-left hover:border-blue-300 dark:hover:border-blue-700">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{nm(m)}</p>
              <p className="text-xs text-gray-400 font-mono">{m.code}</p>
            </div>
          </button>
        )}
      />
    </>
  );
}

/** Vahid yaratma forması (picker daxilində). */
function MeasureForm({ onSaved, onCancel }: { onSaved: (m: Measurement) => void; onCancel: () => void }) {
  const { t } = useLanguage();
  const [code, setCode] = useState('');
  const [name, setName] = useState<Translatable>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (!code.trim()) { setError(`${t('common.code')} *`); return; }
    setLoading(true);
    try { onSaved(await measureService.create({ code: code.trim().toUpperCase(), name })); }
    catch (e) { setError(e instanceof ApiError ? e.message : t('common.error')); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-3">
      {error && <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600">{error}</div>}
      <Input label={t('common.code')} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="LT" />
      <TranslatableInput label={t('common.name')} value={name} onChange={setName} />
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" onClick={onCancel} disabled={loading}>{t('common.cancel')}</Button>
        <Button onClick={submit} loading={loading}>{t('common.save')}</Button>
      </div>
    </div>
  );
}
