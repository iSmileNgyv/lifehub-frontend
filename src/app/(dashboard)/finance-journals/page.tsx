'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2, X, Trash2, NotebookText } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { financeJournalService } from '@/services/financeJournalService';
import { ApiError } from '@/lib/api';
import { fmtDate } from '@/lib/utils';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import type { FinanceJournal } from '@/types';

export default function FinanceJournalsPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { can } = useAuth();

  const [journals, setJournals] = useState<FinanceJournal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [descr, setDescr] = useState('');
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState<FinanceJournal | null>(null);

  const load = useCallback(() => {
    financeJournalService.list().then((r) => setJournals(r.data))
      .catch((e) => setError(e instanceof ApiError ? e.message : '')).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    setBusy(true); setError('');
    try {
      const r = await financeJournalService.create({ journal_date: date, descr: descr || null });
      setCreating(false); setDescr('');
      router.push(`/finance-journals/${r.journal.code}`);
    } catch (e) { setError(e instanceof ApiError ? e.message : t('common.error')); }
    finally { setBusy(false); }
  };

  const doDelete = async () => {
    if (!del) return;
    try { await financeJournalService.remove(del.code); setDel(null); load(); }
    catch (e) { setError(e instanceof ApiError ? e.message : t('common.error')); }
  };

  return (
    <div>
      <PageHeader
        title={t('finance.title')}
        subtitle={t('finance.subtitle')}
        actions={can('FINANCE_CREATE') && <Button onClick={() => { setDate(new Date().toISOString().slice(0, 10)); setDescr(''); setError(''); setCreating(true); }}><Plus className="w-4 h-4 mr-1" /> {t('finance.newJournal')}</Button>}
      />
      {error && <div className="mb-4 flex items-center justify-between px-4 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600">{error}<button onClick={() => setError('')}><X className="w-4 h-4" /></button></div>}

      {loading ? <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
        : journals.length === 0 ? <div className="py-16 text-center text-sm text-gray-400">{t('finance.empty')}</div>
          : (
            <div className="space-y-2">
              {journals.map((j) => (
                <div key={j.code} className="group flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 hover:shadow-sm transition">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center shrink-0"><NotebookText className="w-5 h-5 text-indigo-600" /></div>
                  <button onClick={() => router.push(`/finance-journals/${j.code}`)} className="min-w-0 flex-1 text-left">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate hover:text-blue-600">{fmtDate(j.journal_date)}{j.descr ? ` · ${j.descr}` : ''}</p>
                    <p className="text-xs text-gray-400">{j.code} · {j.entries_count > 0 ? `${j.entries_count} ${t('finance.draftLines')}` : t('finance.posted')}</p>
                  </button>
                  {can('FINANCE_DELETE') && (
                    <button onClick={() => setDel(j)} className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500" title={t('common.delete')}><Trash2 className="w-[18px] h-[18px]" /></button>
                  )}
                </div>
              ))}
            </div>
          )}

      <Modal open={creating} onClose={() => setCreating(false)} title={t('finance.newJournal')} size="sm"
        footer={<><Button variant="outline" onClick={() => setCreating(false)}>{t('common.cancel')}</Button><Button onClick={create} loading={busy}>{t('common.create')}</Button></>}>
        <div className="space-y-3">
          <Input type="date" label={t('finance.journalDate')} value={date} onChange={(e) => setDate(e.target.value)} />
          <Input label={t('finance.note')} value={descr} onChange={(e) => setDescr(e.target.value)} placeholder={t('finance.notePlaceholder')} />
        </div>
      </Modal>

      <ConfirmDialog open={!!del} message={del ? <><b>{fmtDate(del.journal_date)}</b><br />{t('finance.deleteJournalWarn')}</> : ''} onConfirm={doDelete} onCancel={() => setDel(null)} />
    </div>
  );
}
