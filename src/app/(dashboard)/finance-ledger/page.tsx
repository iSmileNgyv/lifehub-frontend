'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Undo2, Receipt, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useContentLanguages } from '@/contexts/ContentLanguagesContext';
import { useAuth } from '@/contexts/AuthContext';
import { financeLedgerService, type LedgerEntry } from '@/services/financeLedgerService';
import { financeCategoryService } from '@/services/financeCategoryService';
import { cashDeskService } from '@/services/cashDeskService';
import { ApiError } from '@/lib/api';
import { translateValue } from '@/lib/translate';
import { fmtDate, cn } from '@/lib/utils';
import PageHeader from '@/components/ui/PageHeader';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import ReceiptModal from '@/components/finance/ReceiptModal';
import FinanceCategoryPicker from '@/components/pickers/FinanceCategoryPicker';
import type { CashDesk, FinanceCategory, Translatable } from '@/types';

export default function FinanceLedgerPage() {
  const { t, language } = useLanguage();
  const { defaultCode } = useContentLanguages();
  const { can } = useAuth();
  const tr = (v: Translatable | null | undefined, fb: string) => translateValue(v ?? undefined, language, defaultCode) || fb;

  const monthStart = useMemo(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); }, []);
  const monthEnd = useMemo(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10); }, []);

  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(monthEnd);
  const [deskFilter, setDeskFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [rows, setRows] = useState<LedgerEntry[]>([]);
  const [desks, setDesks] = useState<CashDesk[]>([]);
  const [cats, setCats] = useState<FinanceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<LedgerEntry | null>(null);
  const [reverseTarget, setReverseTarget] = useState<LedgerEntry | null>(null);

  const router = useRouter();

  useEffect(() => {
    cashDeskService.list().then((r) => setDesks(r.data)).catch(() => {});
    financeCategoryService.list().then(setCats).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true); setError('');
    financeLedgerService.list({ from, to, cash_desk: deskFilter || undefined, entry_type: typeFilter || undefined })
      .then((r) => setRows(r.data))
      .catch((e) => setError(e instanceof ApiError ? e.message : t('common.error')))
      .finally(() => setLoading(false));
  }, [from, to, deskFilter, typeFilter, t]);
  useEffect(() => { load(); }, [load]);

  const deskName = (c: string) => tr(desks.find((d) => d.code === c)?.description, c);
  const catName = (c: string | null) => (c ? tr(cats.find((k) => k.code === c)?.name ?? null, c) : '—');
  const money = (n: number | string) => Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const totals = useMemo(() => {
    let income = 0, expense = 0;
    for (const r of rows) { const a = Number(r.amount_lcy); if (r.entry_type === 'income') income += a; else expense += a; }
    return { income, expense, net: income - expense };
  }, [rows]);

  const saveField = async (e: LedgerEntry, patch: { category_code?: string | null; descr?: string | null }) => {
    try {
      const upd = await financeLedgerService.update(e.uid, {
        category_code: patch.category_code !== undefined ? patch.category_code : e.category_code,
        descr: patch.descr !== undefined ? patch.descr : e.descr,
      });
      setRows((rs) => rs.map((r) => (r.uid === e.uid ? upd : r)));
    } catch (err) { setError(err instanceof ApiError ? err.message : t('common.error')); }
  };

  const doReverse = async () => {
    if (!reverseTarget) return;
    const target = reverseTarget;
    setReverseTarget(null);
    try {
      const res = await financeLedgerService.reverse(target.uid);
      router.push(`/finance-journals/${res.jnl_code}`);
    } catch (err) { setError(err instanceof ApiError ? err.message : t('common.error')); }
  };

  const cellSel = 'w-full h-8 px-2 rounded-md border border-transparent hover:border-gray-300 dark:hover:border-gray-700 bg-transparent text-sm outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-gray-900';
  const canUpdate = can('FINANCE_UPDATE');
  const canReverse = can('FINANCE_POST');

  return (
    <div>
      <PageHeader title={t('finance.ledgerTitle')} subtitle={t('finance.ledgerSubtitle')} />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:border-blue-500" />
          <span className="text-gray-400">—</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:border-blue-500" />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-9 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:border-blue-500">
          <option value="">{t('finance.allTypes')}</option>
          <option value="income">{t('finance.income')}</option>
          <option value="expense">{t('finance.expense')}</option>
        </select>
        <select value={deskFilter} onChange={(e) => setDeskFilter(e.target.value)} className="h-9 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:border-blue-500">
          <option value="">{t('finance.allAccounts')}</option>
          {desks.map((d) => <option key={d.code} value={d.code}>{tr(d.description, d.code)}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 px-3 py-2"><p className="text-xs text-gray-500">{t('finance.income')}</p><p className="text-base font-bold text-emerald-600 tabular-nums">{money(totals.income)}</p></div>
        <div className="rounded-lg bg-red-50 dark:bg-red-950/20 px-3 py-2"><p className="text-xs text-gray-500">{t('finance.expense')}</p><p className="text-base font-bold text-red-500 tabular-nums">{money(totals.expense)}</p></div>
        <div className="rounded-lg bg-gray-50 dark:bg-gray-800/40 px-3 py-2"><p className="text-xs text-gray-500">{t('finance.net')}</p><p className={cn('text-base font-bold tabular-nums', totals.net >= 0 ? 'text-emerald-600' : 'text-red-500')}>{money(totals.net)}</p></div>
      </div>

      {error && <div className="mb-4 flex items-center justify-between px-4 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600">{error}<button onClick={() => setError('')}><X className="w-4 h-4" /></button></div>}

      {loading ? <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
        : rows.length === 0 ? <div className="py-16 text-center text-sm text-gray-400">{t('finance.noLedger')}</div>
          : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/60 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="text-left font-medium px-3 py-2.5">{t('finance.date')}</th>
                    <th className="text-left font-medium px-3 py-2.5">{t('finance.type')}</th>
                    <th className="text-left font-medium px-3 py-2.5">{t('finance.account')}</th>
                    <th className="text-left font-medium px-3 py-2.5">{t('finance.category')}</th>
                    <th className="text-left font-medium px-3 py-2.5">{t('finance.note')}</th>
                    <th className="text-right font-medium px-3 py-2.5">{t('finance.amount')}</th>
                    <th className="w-24" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {rows.map((e) => {
                    const amtColor = e.entry_type === 'income' ? 'text-emerald-600' : 'text-red-500';
                    return (
                      <tr key={e.uid} className="group hover:bg-gray-50/60 dark:hover:bg-gray-800/30">
                        <td className="px-3 py-1.5 whitespace-nowrap">{fmtDate(e.posting_date)}</td>
                        <td className={cn('px-3 py-1.5 font-medium', amtColor)}>{t(`finance.${e.entry_type}`)}</td>
                        <td className="px-3 py-1.5">{deskName(e.cash_desk_code)}</td>
                        <td className="px-2 py-1 min-w-[9rem]">
                          <FinanceCategoryPicker value={e.category_code ?? ''} type={e.entry_type} displayValue={e.category_code ? catName(e.category_code) : ''} onChange={(c) => saveField(e, { category_code: c || null })} disabled={!canUpdate} />
                        </td>
                        <td className="px-2 py-1">
                          <NoteCell entry={e} disabled={!canUpdate} onSave={(v) => saveField(e, { descr: v })} className={cellSel} />
                        </td>
                        <td className={cn('px-3 py-1.5 text-right tabular-nums font-semibold', amtColor)}>{money(e.amount_lcy)}</td>
                        <td className="px-2 py-1">
                          <div className="flex gap-1.5 items-center justify-end">
                            {(canUpdate || e.lines.length > 0) && (
                              <button onClick={() => setReceipt(e)} title={t('finance.receipt')} className={cn('relative', e.lines.length ? 'text-indigo-600' : 'text-gray-400 hover:text-indigo-600')}>
                                <Receipt className="w-[18px] h-[18px]" />
                                {e.lines.length > 0 && <span className="absolute -top-1.5 -right-1.5 text-[9px] font-bold bg-indigo-600 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center">{e.lines.length}</span>}
                              </button>
                            )}
                            {canReverse && <button onClick={() => setReverseTarget(e)} title={t('finance.reverse')} className="text-gray-400 hover:text-amber-600"><Undo2 className="w-[18px] h-[18px]" /></button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

      {receipt && (
        <ReceiptModal
          initialLines={receipt.lines}
          onClose={() => setReceipt(null)}
          onSubmit={async (lines) => { const upd = await financeLedgerService.saveLines(receipt.uid, lines); setRows((rs) => rs.map((r) => (r.uid === upd.uid ? upd : r))); }}
          onDone={() => setReceipt(null)}
        />
      )}
      <ConfirmDialog open={!!reverseTarget} message={t('finance.reverseConfirm')} onConfirm={doReverse} onCancel={() => setReverseTarget(null)} />
    </div>
  );
}

/** Qeyd xanası — dəyişəndə blur-da yadda saxla. */
function NoteCell({ entry, disabled, onSave, className }: { entry: LedgerEntry; disabled: boolean; onSave: (v: string | null) => void; className: string }) {
  const [val, setVal] = useState(entry.descr ?? '');
  useEffect(() => { setVal(entry.descr ?? ''); }, [entry.descr]);
  return (
    <input disabled={disabled} value={val} onChange={(e) => setVal(e.target.value)}
      onBlur={() => { if ((val || '') !== (entry.descr ?? '')) onSave(val || null); }}
      className={className} placeholder="—" />
  );
}
