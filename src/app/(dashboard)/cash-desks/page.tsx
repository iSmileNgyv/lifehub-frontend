'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Search, Loader2, X, Wallet } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useContentLanguages } from '@/contexts/ContentLanguagesContext';
import { useAuth } from '@/contexts/AuthContext';
import { cashDeskService } from '@/services/cashDeskService';
import { ApiError } from '@/lib/api';
import { translateValue } from '@/lib/translate';
import PageHeader from '@/components/ui/PageHeader';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import TranslatableInput from '@/components/ui/TranslatableInput';
import type { CashDesk, CategoryStatus, Translatable } from '@/types';

export default function CashDesksPage() {
  const { t, language } = useLanguage();
  const { defaultCode } = useContentLanguages();
  const { can } = useAuth();
  const canManage = can('CASHDESK_CREATE') || can('CASHDESK_UPDATE');

  const [items, setItems] = useState<CashDesk[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<CashDesk | null>(null);
  const [delTarget, setDelTarget] = useState<CashDesk | null>(null);
  const [busy, setBusy] = useState(false);

  const nm = (d: CashDesk) => translateValue(d.description, language, defaultCode) || d.code;

  const load = useCallback((q: string) => {
    setLoading(true);
    cashDeskService.list({ q: q || undefined }).then((r) => setItems(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);
  useEffect(() => { const h = setTimeout(() => setDebounced(query.trim()), 300); return () => clearTimeout(h); }, [query]);
  useEffect(() => { load(debounced); }, [debounced, load]);

  const doDelete = async () => {
    if (!delTarget) return;
    setBusy(true); setError('');
    try { await cashDeskService.remove(delTarget.code); setDelTarget(null); load(debounced); }
    catch (e) { setError(e instanceof ApiError ? e.message : t('common.error')); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <PageHeader
        title={t('cashdesk.title')}
        actions={can('CASHDESK_CREATE') && <Button onClick={() => { setEditItem(null); setFormOpen(true); }}><Plus className="w-4 h-4 mr-1" /> {t('cashdesk.newCashDesk')}</Button>}
      />

      {error && (
        <div className="mb-4 flex items-center justify-between px-4 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
          {error}<button onClick={() => setError('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="relative max-w-xs mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('cashdesk.searchPlaceholder')} className="w-full h-9 pl-9 pr-4 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm outline-none focus:ring-1 focus:ring-blue-500" />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">{t('cashdesk.empty')}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((d) => (
            <div key={d.code} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center shrink-0"><Wallet className="w-5 h-5 text-blue-600" /></div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">{nm(d)}</p>
                  <p className="text-xs text-gray-400 font-mono">{d.code}</p>
                </div>
                {canManage && (
                  <div className="flex items-center gap-1">
                    {can('CASHDESK_UPDATE') && <button onClick={() => { setEditItem(d); setFormOpen(true); }} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"><Pencil className="w-4 h-4" /></button>}
                    {can('CASHDESK_DELETE') && <button onClick={() => setDelTarget(d)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"><Trash2 className="w-4 h-4" /></button>}
                  </div>
                )}
              </div>
              <div className="mt-3 flex items-end justify-between">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{Number(d.balance_lcy).toFixed(2)} ₼</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${d.status === 'ACTIVE' ? 'bg-green-100 dark:bg-green-950/40 text-green-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>{d.status === 'ACTIVE' ? t('common.active') : t('common.banned')}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {formOpen && <CashDeskForm item={editItem} onClose={() => setFormOpen(false)} onSaved={() => { setFormOpen(false); load(debounced); }} />}

      {delTarget && (
        <Modal open onClose={() => !busy && setDelTarget(null)} title={t('common.delete')} size="sm"
          footer={<>
            <Button variant="outline" onClick={() => setDelTarget(null)} disabled={busy}>{t('common.cancel')}</Button>
            <Button variant="danger" onClick={doDelete} loading={busy}>{t('common.delete')}</Button>
          </>}>
          <p className="text-sm text-gray-600 dark:text-gray-300">{t('cashdesk.deleteWarn')}</p>
        </Modal>
      )}
    </div>
  );
}

function CashDeskForm({ item, onClose, onSaved }: { item: CashDesk | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useLanguage();
  const [code, setCode] = useState(item?.code ?? '');
  const [description, setDescription] = useState<Translatable>(item?.description ?? {});
  const [address, setAddress] = useState(item?.address ?? '');
  const [respPerson, setRespPerson] = useState(item?.resp_person ?? '');
  const [status, setStatus] = useState<CategoryStatus>(item?.status ?? 'ACTIVE');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    setSaving(true);
    const data = { description, address: address || null, resp_person: respPerson || null, status };
    try {
      if (item) await cashDeskService.update(item.code, data);
      else await cashDeskService.create({ ...data, code: code.trim().toUpperCase() });
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common.error'));
    } finally { setSaving(false); }
  };

  return (
    <Modal open onClose={() => !saving && onClose()} title={item ? t('common.edit') : t('cashdesk.newCashDesk')} size="md"
      footer={<>
        <Button variant="outline" onClick={onClose} disabled={saving}>{t('common.cancel')}</Button>
        <Button onClick={submit} loading={saving}>{t('common.save')}</Button>
      </>}>
      <div className="space-y-3">
        {error && <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600 dark:text-red-400">{error}</div>}
        <Input label={t('common.code')} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} disabled={!!item} placeholder="MAIN" />
        <TranslatableInput label={t('cashdesk.description')} value={description} onChange={setDescription} />
        <Input label={t('cashdesk.respPerson')} value={respPerson} onChange={(e) => setRespPerson(e.target.value)} />
        <Input label={t('cashdesk.address')} value={address} onChange={(e) => setAddress(e.target.value)} />
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('common.status')}</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as CategoryStatus)} className="w-full h-9 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:border-blue-500">
            <option value="ACTIVE">{t('common.active')}</option>
            <option value="BLOCKED">{t('common.banned')}</option>
          </select>
        </div>
      </div>
    </Modal>
  );
}
