'use client';

import { useCallback, useState } from 'react';
import PickerModal from './PickerModal';
import PickerField from './PickerField';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import TranslatableInput from '@/components/ui/TranslatableInput';
import { cashDeskService } from '@/services/cashDeskService';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useContentLanguages } from '@/contexts/ContentLanguagesContext';
import { translateValue } from '@/lib/translate';
import { ApiError } from '@/lib/api';
import type { CashDesk, Translatable } from '@/types';

/** Nağd hesab (kassa) seçici — search + oradaca yarat. `exclude` = kənara qoyulacaq kod (transfer hədəfi ≠ mənbə). */
export default function CashDeskPicker({
  value, displayValue, onChange, label, placeholder, disabled, exclude, error,
}: {
  value: string;
  displayValue?: string;
  onChange: (code: string, desk?: CashDesk) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  exclude?: string;
  error?: boolean;
}) {
  const { can } = useAuth();
  const { t, language } = useLanguage();
  const { defaultCode } = useContentLanguages();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<CashDesk | null>(null);

  const nm = (d: CashDesk) => translateValue(d.description, language, defaultCode) || d.code;

  const fetchPage = useCallback(async (q: string, page: number) => {
    const r = await cashDeskService.list({ page, q: q || undefined });
    return { data: r.data.filter((d) => d.code !== exclude), current_page: r.current_page, last_page: r.last_page };
  }, [exclude]);

  const display = picked && picked.code === value ? nm(picked) : (displayValue || value);

  return (
    <>
      <PickerField label={label} value={display} placeholder={placeholder || t('picker.choose')} onOpen={() => setOpen(true)} disabled={disabled} error={error} />
      <PickerModal<CashDesk>
        open={open}
        title={t('picker.selectAccount')}
        onClose={() => setOpen(false)}
        fetchPage={fetchPage}
        keyOf={(d) => d.code}
        layout="list"
        emptyText={t('picker.empty')}
        canCreate={can('CASHDESK_CREATE')}
        createLabel={t('common.create')}
        createTitle={t('picker.newAccount')}
        renderCreate={(onCreated, onCancel) => <CashDeskForm onSaved={onCreated} onCancel={onCancel} />}
        onPick={(d) => { setPicked(d); onChange(d.code, d); setOpen(false); }}
        renderItem={(d, pick) => (
          <button onClick={pick} className="w-full flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-2.5 text-left hover:border-blue-300 dark:hover:border-blue-700">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{nm(d)}</p>
              <p className="text-xs text-gray-400 font-mono">{d.code}</p>
            </div>
          </button>
        )}
      />
    </>
  );
}

/** Hesab yaratma (picker daxilində). */
function CashDeskForm({ onSaved, onCancel }: { onSaved: (d: CashDesk) => void; onCancel: () => void }) {
  const { t } = useLanguage();
  const [code, setCode] = useState('');
  const [description, setDescription] = useState<Translatable>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (!code.trim()) { setError(`${t('common.code')} *`); return; }
    setLoading(true);
    try { onSaved(await cashDeskService.create({ code: code.trim().toUpperCase(), description, address: null, resp_person: null, status: 'ACTIVE' })); }
    catch (e) { setError(e instanceof ApiError ? e.message : t('common.error')); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-3">
      {error && <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600">{error}</div>}
      <Input label={t('common.code')} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="CASH" />
      <TranslatableInput label={t('common.name')} value={description} onChange={setDescription} />
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" onClick={onCancel} disabled={loading}>{t('common.cancel')}</Button>
        <Button onClick={submit} loading={loading}>{t('common.save')}</Button>
      </div>
    </div>
  );
}
