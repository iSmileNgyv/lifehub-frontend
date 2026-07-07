'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, X, Ruler } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useContentLanguages } from '@/contexts/ContentLanguagesContext';
import { useAuth } from '@/contexts/AuthContext';
import { measureService } from '@/services/measureService';
import { ApiError } from '@/lib/api';
import { translateValue } from '@/lib/translate';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import TranslatableInput from '@/components/ui/TranslatableInput';
import type { Measurement, Translatable } from '@/types';

export default function MeasuresPage() {
  const { t, language } = useLanguage();
  const { defaultCode } = useContentLanguages();
  const { can } = useAuth();
  const [items, setItems] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState<Measurement | 'new' | null>(null);
  const [del, setDel] = useState<Measurement | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => { setLoading(true); measureService.list().then(setItems).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const doDelete = async () => {
    if (!del) return;
    setBusy(true); setError('');
    try { await measureService.remove(del.code); setDel(null); load(); }
    catch (e) { setError(e instanceof ApiError ? e.message : t('common.error')); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <PageHeader title={t('measures.title')} actions={can('MEASURE_CREATE') && <Button onClick={() => setForm('new')}><Plus className="w-4 h-4 mr-1" /> {t('measures.newUnit')}</Button>} />
      {error && <div className="mb-4 flex items-center justify-between px-4 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600">{error}<button onClick={() => setError('')}><X className="w-4 h-4" /></button></div>}

      {loading ? <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
        : items.length === 0 ? <div className="py-16 text-center text-sm text-gray-400">—</div>
          : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map((m) => (
                <div key={m.code} className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3">
                  <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center"><Ruler className="w-4 h-4 text-gray-400" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 dark:text-white truncate">{translateValue(m.name, language, defaultCode) || m.code}</p>
                    <p className="text-xs text-gray-400 font-mono">{m.code}</p>
                  </div>
                  {can('MEASURE_UPDATE') && !m.in_use && <button onClick={() => setForm(m)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>}
                  {can('MEASURE_DELETE') && !m.in_use && <button onClick={() => setDel(m)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>}
                </div>
              ))}
            </div>
          )}

      {form && <MeasureForm item={form === 'new' ? null : form} onClose={() => setForm(null)} onSaved={() => { setForm(null); load(); }} />}
      {del && (
        <Modal open onClose={() => !busy && setDel(null)} title={t('common.delete')} size="sm" footer={<><Button variant="outline" onClick={() => setDel(null)} disabled={busy}>{t('common.cancel')}</Button><Button variant="danger" onClick={doDelete} loading={busy}>{t('common.delete')}</Button></>}>
          <p className="text-sm text-gray-600 dark:text-gray-300">{del.code}</p>
        </Modal>
      )}
    </div>
  );
}

function MeasureForm({ item, onClose, onSaved }: { item: Measurement | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useLanguage();
  const [code, setCode] = useState(item?.code ?? '');
  const [name, setName] = useState<Translatable>(item?.name ?? {});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setSaving(true); setError('');
    try {
      if (item) await measureService.update(item.code, { name });
      else await measureService.create({ code: code.trim().toUpperCase(), name });
      onSaved();
    } catch (e) { setError(e instanceof ApiError ? e.message : t('common.error')); }
    finally { setSaving(false); }
  };

  return (
    <Modal open onClose={() => !saving && onClose()} title={item ? t('common.edit') : t('measures.newUnit')} size="sm" footer={<><Button variant="outline" onClick={onClose} disabled={saving}>{t('common.cancel')}</Button><Button onClick={submit} loading={saving}>{t('common.save')}</Button></>}>
      <div className="space-y-3">
        {error && <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600">{error}</div>}
        <Input label={t('common.code')} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} disabled={!!item} placeholder="LT" />
        <TranslatableInput label={t('common.name')} value={name} onChange={setName} />
      </div>
    </Modal>
  );
}
