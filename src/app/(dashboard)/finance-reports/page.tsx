'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, TrendingUp, TrendingDown, Tag, Package, Wallet } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useContentLanguages } from '@/contexts/ContentLanguagesContext';
import { financeReportService, type SummaryReport, type ItemsReport, type CashReport } from '@/services/financeReportService';
import { financeCategoryService } from '@/services/financeCategoryService';
import { ApiError } from '@/lib/api';
import { translateValue } from '@/lib/translate';
import { fmtDate, cn } from '@/lib/utils';
import PageHeader from '@/components/ui/PageHeader';
import type { FinanceCategory, Translatable } from '@/types';

type Tab = 'summary' | 'items' | 'cash';

export default function FinanceReportsPage() {
  const { t, language } = useLanguage();
  const { defaultCode } = useContentLanguages();
  const tr = (v: Translatable | null | undefined, fb: string) => translateValue(v ?? undefined, language, defaultCode) || fb;

  const monthStart = useMemo(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); }, []);
  const monthEnd = useMemo(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10); }, []);

  const [tab, setTab] = useState<Tab>('summary');
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(monthEnd);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<SummaryReport | null>(null);
  const [items, setItems] = useState<ItemsReport | null>(null);
  const [cash, setCash] = useState<CashReport | null>(null);
  const [cats, setCats] = useState<FinanceCategory[]>([]);

  useEffect(() => { financeCategoryService.list().then(setCats).catch(() => {}); }, []);

  const load = useCallback(() => {
    setLoading(true); setError('');
    const done = () => setLoading(false);
    const fail = (e: unknown) => setError(e instanceof ApiError ? e.message : t('common.error'));
    if (tab === 'summary') financeReportService.summary(from, to).then(setSummary).catch(fail).finally(done);
    else if (tab === 'items') financeReportService.items(from, to).then(setItems).catch(fail).finally(done);
    else financeReportService.cash(from, to).then(setCash).catch(fail).finally(done);
  }, [tab, from, to, t]);
  useEffect(() => { load(); }, [load]);

  const catName = (c: string | null) => { if (!c) return t('finance.noCategory'); const x = cats.find((k) => k.code === c); return x ? tr(x.name, c) : c; };
  const deskName = (c: string, list: { code: string; description: Translatable }[]) => { const d = list.find((x) => x.code === c); return d ? tr(d.description, c) : c; };
  const money = (n: number | string) => Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const tabs: { key: Tab; icon: typeof Tag; label: string }[] = [
    { key: 'summary', icon: Tag, label: t('finance.byCategory') },
    { key: 'items', icon: Package, label: t('finance.byItem') },
    { key: 'cash', icon: Wallet, label: t('finance.cashFlow') },
  ];

  return (
    <div>
      <PageHeader title={t('finance.reports')} subtitle={t('finance.reportsSubtitle')} />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:border-blue-500" />
          <span className="text-gray-400">—</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:border-blue-500" />
        </div>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {tabs.map((tb) => (
            <button key={tb.key} onClick={() => setTab(tb.key)}
              className={cn('flex items-center gap-1.5 px-3 h-8 rounded-md text-sm font-medium transition', tab === tb.key ? 'bg-white dark:bg-gray-900 text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-800')}>
              <tb.icon className="w-4 h-4" /> {tb.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="mb-4 px-4 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600">{error}</div>}

      {loading ? <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
        : tab === 'summary' && summary ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <Stat label={t('finance.income')} value={money(summary.income)} color="text-emerald-600" />
              <Stat label={t('finance.expense')} value={money(summary.expense)} color="text-red-500" />
              <Stat label={t('finance.net')} value={money(summary.net)} color={summary.net >= 0 ? 'text-emerald-600' : 'text-red-500'} />
            </div>
            {(['income', 'expense'] as const).map((tp) => {
              const rows = summary.rows.filter((r) => r.entry_type === tp).sort((a, b) => b.total - a.total);
              if (!rows.length) return null;
              return (
                <div key={tp} className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                  <div className={cn('px-4 py-2 text-sm font-bold flex items-center gap-1.5', tp === 'income' ? 'text-emerald-600' : 'text-red-500')}>
                    {tp === 'income' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />} {t(`finance.${tp}`)}
                  </div>
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {rows.map((r, i) => (
                        <tr key={i} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/30">
                          <td className="px-4 py-2">{catName(r.category_code)}</td>
                          <td className="px-4 py-2 text-right text-xs text-gray-400">{r.cnt}</td>
                          <td className="px-4 py-2 text-right tabular-nums font-semibold">{money(r.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        ) : tab === 'items' && items ? (
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-4 py-2 text-sm font-bold flex items-center justify-between"><span>{t('finance.byItem')}</span><span className="tabular-nums text-gray-500">{money(items.total)}</span></div>
            {items.rows.length === 0 ? <p className="py-10 text-center text-sm text-gray-400">{t('finance.noData')}</p> : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/60 text-gray-500 text-xs uppercase"><tr>
                  <th className="text-left font-medium px-4 py-2">{t('finance.item')}</th>
                  <th className="text-right font-medium px-4 py-2">{t('finance.qty')}</th>
                  <th className="text-right font-medium px-4 py-2">{t('finance.total')}</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {items.rows.map((r) => (
                    <tr key={r.item_code} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/30">
                      <td className="px-4 py-2">{tr(r.item_name, r.item_code)}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-gray-500">{Number(r.qty).toLocaleString(undefined, { maximumFractionDigits: 4 })} {r.measure_code}</td>
                      <td className="px-4 py-2 text-right tabular-nums font-semibold">{money(r.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : tab === 'cash' && cash ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <Stat label={t('finance.cashIn')} value={money(cash.in)} color="text-emerald-600" />
              <Stat label={t('finance.cashOut')} value={money(cash.out)} color="text-red-500" />
              <Stat label={t('finance.net')} value={money(cash.net)} color={cash.net >= 0 ? 'text-emerald-600' : 'text-red-500'} />
            </div>
            <div className="flex flex-wrap gap-2">
              {cash.desks.map((d) => (
                <div key={d.code} className="rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-2">
                  <p className="text-xs text-gray-500">{tr(d.description, d.code)}</p>
                  <p className={cn('text-sm font-bold tabular-nums', Number(d.balance_lcy) >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-500')}>{money(d.balance_lcy)}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              {cash.entries.length === 0 ? <p className="py-10 text-center text-sm text-gray-400">{t('finance.noData')}</p> : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900/60 text-gray-500 text-xs uppercase"><tr>
                    <th className="text-left font-medium px-4 py-2">{t('finance.date')}</th>
                    <th className="text-left font-medium px-4 py-2">{t('finance.account')}</th>
                    <th className="text-left font-medium px-4 py-2">{t('finance.note')}</th>
                    <th className="text-right font-medium px-4 py-2">{t('finance.amount')}</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {cash.entries.map((e) => (
                      <tr key={e.uid} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/30">
                        <td className="px-4 py-2 text-gray-500">{fmtDate(e.posting_date)}</td>
                        <td className="px-4 py-2">{deskName(e.cash_desk_code, cash.desks)}</td>
                        <td className="px-4 py-2 text-gray-400">{e.descr || e.doc_no || '—'}</td>
                        <td className={cn('px-4 py-2 text-right tabular-nums font-semibold', e.entry_type === 'cash_in' ? 'text-emerald-600' : 'text-red-500')}>
                          {e.entry_type === 'cash_in' ? '+' : '−'}{money(e.amount_lcy)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : null}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg bg-gray-50 dark:bg-gray-800/40 px-3 py-2.5">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={cn('text-lg font-bold tabular-nums', color)}>{value}</p>
    </div>
  );
}
