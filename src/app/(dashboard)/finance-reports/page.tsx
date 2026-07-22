'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, TrendingUp, TrendingDown, Tag, Package, Wallet, ChevronDown, ChevronRight, ArrowUpRight, ArrowDownRight, FileDown, Printer, Search } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar, CartesianGrid } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';
import { useContentLanguages } from '@/contexts/ContentLanguagesContext';
import { financeReportService, type SummaryReport, type ItemsReport, type ItemsReportRow, type CashReport, type TrendReport, type EntriesReport } from '@/services/financeReportService';
import { financeCategoryService } from '@/services/financeCategoryService';
import { itemService } from '@/services/itemService';
import { ApiError } from '@/lib/api';
import { translateValue } from '@/lib/translate';
import { fmtDate, cn } from '@/lib/utils';
import PageHeader from '@/components/ui/PageHeader';
import type { FinanceCategory, Translatable, ItemPriceHistory } from '@/types';

type Tab = 'summary' | 'items' | 'cash';

// CSV ixrac (client-side): BOM + ';' ayırıcı (Excel AZ/RU lokalı üçün etibarlı)
function downloadCsv(filename: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => { const s = String(v ?? ''); return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const text = '﻿' + rows.map((r) => r.map(esc).join(';')).join('\n');
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

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
  const [trend, setTrend] = useState<TrendReport | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [priceHist, setPriceHist] = useState<Record<string, ItemPriceHistory[]>>({});
  const [cashDesk, setCashDesk] = useState('');
  const [catExpanded, setCatExpanded] = useState<string | null>(null);
  const [catEntries, setCatEntries] = useState<Record<string, EntriesReport>>({});
  const [catSearch, setCatSearch] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [measureFilter, setMeasureFilter] = useState('');

  useEffect(() => { financeCategoryService.list().then(setCats).catch(() => {}); }, []);
  useEffect(() => { financeReportService.trend(12).then(setTrend).catch(() => {}); }, []);

  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const setPreset = (p: 'thisMonth' | 'lastMonth' | 'last3' | 'thisYear') => {
    const d = new Date();
    if (p === 'thisMonth') { setFrom(iso(new Date(d.getFullYear(), d.getMonth(), 1))); setTo(iso(new Date(d.getFullYear(), d.getMonth() + 1, 0))); }
    else if (p === 'lastMonth') { setFrom(iso(new Date(d.getFullYear(), d.getMonth() - 1, 1))); setTo(iso(new Date(d.getFullYear(), d.getMonth(), 0))); }
    else if (p === 'last3') { setFrom(iso(new Date(d.getFullYear(), d.getMonth() - 2, 1))); setTo(iso(new Date(d.getFullYear(), d.getMonth() + 1, 0))); }
    else { setFrom(iso(new Date(d.getFullYear(), 0, 1))); setTo(iso(new Date(d.getFullYear(), 11, 31))); }
  };
  const activePreset = useMemo(() => {
    const d = new Date();
    const eq = (a: string, b: Date) => a === iso(b);
    if (eq(from, new Date(d.getFullYear(), d.getMonth(), 1)) && eq(to, new Date(d.getFullYear(), d.getMonth() + 1, 0))) return 'thisMonth';
    if (eq(from, new Date(d.getFullYear(), d.getMonth() - 1, 1)) && eq(to, new Date(d.getFullYear(), d.getMonth(), 0))) return 'lastMonth';
    if (eq(from, new Date(d.getFullYear(), d.getMonth() - 2, 1)) && eq(to, new Date(d.getFullYear(), d.getMonth() + 1, 0))) return 'last3';
    if (eq(from, new Date(d.getFullYear(), 0, 1)) && eq(to, new Date(d.getFullYear(), 11, 31))) return 'thisYear';
    return '';
  }, [from, to]);

  // Məhsul sətrini aç → variantın qiymət tarixçəsini gətir (keşlə)
  const toggleRow = (r: ItemsReportRow) => {
    const key = `${r.item_code}|${r.measure_code ?? ''}|${r.meas_weight ?? ''}`;
    setExpanded((cur) => (cur === key ? null : key));
    if (!priceHist[r.item_code]) {
      itemService.priceHistory(r.item_code).then((h) => setPriceHist((m) => ({ ...m, [r.item_code]: h }))).catch(() => {});
    }
  };

  const load = useCallback(() => {
    setLoading(true); setError('');
    const done = () => setLoading(false);
    const fail = (e: unknown) => setError(e instanceof ApiError ? e.message : t('common.error'));
    if (tab === 'summary') financeReportService.summary(from, to).then(setSummary).catch(fail).finally(done);
    else if (tab === 'items') financeReportService.items(from, to).then(setItems).catch(fail).finally(done);
    else financeReportService.cash(from, to, cashDesk).then(setCash).catch(fail).finally(done);
  }, [tab, from, to, cashDesk, t]);
  useEffect(() => { load(); }, [load]);
  // Dövr dəyişəndə drill-down keşi köhnəlir
  useEffect(() => { setCatEntries({}); setCatExpanded(null); }, [from, to]);

  // Kateqoriya sətrini aç → arxadakı əməliyyatlar (drill-down)
  const toggleCat = (type: 'income' | 'expense', category: string | null) => {
    const key = `${type}|${category ?? ''}|${from}|${to}`;
    setCatExpanded((cur) => (cur === key ? null : key));
    if (!catEntries[key]) {
      financeReportService.entries(from, to, type, category).then((r) => setCatEntries((m) => ({ ...m, [key]: r }))).catch(() => {});
    }
  };

  const catName = (c: string | null) => { if (!c) return t('finance.noCategory'); const x = cats.find((k) => k.code === c); return x ? tr(x.name, c) : c; };
  const deskName = (c: string, list: { code: string; description: Translatable }[]) => { const d = list.find((x) => x.code === c); return d ? tr(d.description, c) : c; };
  const money = (n: number | string) => Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  // Keçən dövrə görə dəyişmə %. prev=0 & cur≠0 → müqayisə mümkün deyil (null).
  const deltaPct = (cur: number, prev: number): number | null => (prev !== 0 ? ((cur - prev) / Math.abs(prev)) * 100 : (cur !== 0 ? null : 0));

  // Məhsul tab filtrləri (client-side)
  const measures = Array.from(new Set((items?.rows ?? []).map((r) => r.measure_code).filter((m): m is string => !!m)));
  const itemRows = (items?.rows ?? []).filter((r) => {
    const nameOk = !itemSearch || tr(r.item_name, r.item_code).toLowerCase().includes(itemSearch.toLowerCase());
    const measOk = !measureFilter || r.measure_code === measureFilter;
    return nameOk && measOk;
  });

  // Cari tab-ı CSV kimi endir
  const exportCsv = () => {
    const fn = (s: string) => `finance_${s}_${from}_${to}.csv`;
    if (tab === 'summary' && summary) {
      const rows: (string | number)[][] = [[t('finance.byCategory'), t('finance.qty'), t('finance.total')]];
      summary.rows.filter((r) => !catSearch || catName(r.category_code).toLowerCase().includes(catSearch.toLowerCase()))
        .forEach((r) => rows.push([`${t(`finance.${r.entry_type}`)} · ${catName(r.category_code)}`, r.cnt, r.total]));
      downloadCsv(fn('summary'), rows);
    } else if (tab === 'items' && items) {
      const rows: (string | number)[][] = [[t('finance.item'), t('finance.measure'), t('finance.qty'), t('finance.avgUnitPrice'), t('finance.lastPrice'), '%', t('finance.total')]];
      itemRows.forEach((r) => rows.push([tr(r.item_name, r.item_code), `${r.measure_code ?? ''}${r.meas_weight ? ' ×' + r.meas_weight : ''}`, r.qty, r.avg_price, r.last_price, r.price_change_pct ?? '', r.total]));
      downloadCsv(fn('items'), rows);
    } else if (tab === 'cash' && cash) {
      const rows: (string | number)[][] = [[t('finance.date'), t('finance.account'), t('finance.note'), t('finance.amount')]];
      cash.entries.forEach((e) => rows.push([e.posting_date, deskName(e.cash_desk_code, cash.desks), e.descr || e.doc_no || '', (e.entry_type === 'cash_in' ? '' : '-') + e.amount_lcy]));
      downloadCsv(fn('cash'), rows);
    }
  };

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
        <div className="flex gap-1">
          {([['thisMonth', 'presetThisMonth'], ['lastMonth', 'presetLastMonth'], ['last3', 'presetLast3'], ['thisYear', 'presetThisYear']] as const).map(([key, lbl]) => (
            <button key={key} onClick={() => setPreset(key)}
              className={cn('px-2.5 h-9 rounded-lg border text-xs font-medium transition', activePreset === key ? 'border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-950/30' : 'border-gray-300 dark:border-gray-700 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200')}>
              {t(`finance.${lbl}`)}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {tabs.map((tb) => (
            <button key={tb.key} onClick={() => setTab(tb.key)}
              className={cn('flex items-center gap-1.5 px-3 h-8 rounded-md text-sm font-medium transition', tab === tb.key ? 'bg-white dark:bg-gray-900 text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-800')}>
              <tb.icon className="w-4 h-4" /> {tb.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 ml-auto print:hidden">
          <button onClick={exportCsv} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
            <FileDown className="w-4 h-4" /> CSV
          </button>
          <button onClick={() => window.print()} title={t('finance.print')} className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && <div className="mb-4 px-4 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600">{error}</div>}

      {loading ? <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
        : tab === 'summary' && summary ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <Stat label={t('finance.income')} value={money(summary.income)} color="text-emerald-600" delta={deltaPct(summary.income, summary.prev_income)} />
              <Stat label={t('finance.expense')} value={money(summary.expense)} color="text-red-500" delta={deltaPct(summary.expense, summary.prev_expense)} invert />
              <Stat label={t('finance.net')} value={money(summary.net)} color={summary.net >= 0 ? 'text-emerald-600' : 'text-red-500'} delta={deltaPct(summary.net, summary.prev_net)} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">{trend && <NetTrendChart months={trend.months} t={t} money={money} />}</div>
              <CategoryDonut rows={summary.rows} catName={catName} t={t} money={money} />
            </div>
            <div className="relative max-w-xs print:hidden">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={catSearch} onChange={(e) => setCatSearch(e.target.value)} placeholder={t('finance.searchCategory')}
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:border-blue-500" />
            </div>
            {(['income', 'expense'] as const).map((tp) => {
              const rows = summary.rows.filter((r) => r.entry_type === tp && (!catSearch || catName(r.category_code).toLowerCase().includes(catSearch.toLowerCase()))).sort((a, b) => b.total - a.total);
              if (!rows.length) return null;
              const typeTotal = tp === 'income' ? summary.income : summary.expense;
              return (
                <div key={tp} className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                  <div className={cn('px-4 py-2 text-sm font-bold flex items-center gap-1.5', tp === 'income' ? 'text-emerald-600' : 'text-red-500')}>
                    {tp === 'income' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />} {t(`finance.${tp}`)}
                  </div>
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {rows.map((r, i) => {
                        const share = typeTotal > 0 ? r.total / typeTotal : 0;
                        const avg = r.cnt > 0 ? r.total / r.cnt : 0;
                        const key = `${tp}|${r.category_code ?? ''}|${from}|${to}`;
                        const isOpen = catExpanded === key;
                        const ent = catEntries[key];
                        return (
                          <Fragment key={i}>
                            <tr className="hover:bg-gray-50/60 dark:hover:bg-gray-800/30 cursor-pointer" onClick={() => toggleCat(tp, r.category_code)}>
                              <td className="px-4 py-2">
                                <div className="flex items-center gap-1.5">
                                  {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2"><span>{catName(r.category_code)}</span><span className="text-xs text-gray-400 tabular-nums">{(share * 100).toFixed(0)}%</span></div>
                                    <div className="mt-1 h-1 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden"><div className={cn('h-full rounded-full', tp === 'income' ? 'bg-emerald-500' : 'bg-red-400')} style={{ width: `${Math.min(100, share * 100)}%` }} /></div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-2 text-right text-xs text-gray-400 whitespace-nowrap">{r.cnt}× · {money(avg)}</td>
                              <td className="px-4 py-2 text-right tabular-nums font-semibold">{money(r.total)}</td>
                            </tr>
                            {isOpen && (
                              <tr className="bg-gray-50/40 dark:bg-gray-900/40">
                                <td colSpan={3} className="px-4 py-2">
                                  {!ent ? <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-blue-600" /></div>
                                    : ent.rows.length === 0 ? <p className="text-xs text-gray-400 text-center py-2">{t('finance.noData')}</p>
                                      : (
                                        <table className="w-full text-xs">
                                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                            {ent.rows.map((e) => (
                                              <tr key={e.uid}>
                                                <td className="py-1 pr-2 text-gray-500 whitespace-nowrap">{fmtDate(e.posting_date)}</td>
                                                <td className="py-1 px-2 text-gray-400">{e.descr || e.cash_desk_code || '—'}</td>
                                                <td className="py-1 pl-2 text-right tabular-nums">{money(e.amount_lcy)}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      )}
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        ) : tab === 'items' && items ? (
          <div className="space-y-3">
          <div className="flex flex-wrap gap-2 print:hidden">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={itemSearch} onChange={(e) => setItemSearch(e.target.value)} placeholder={t('finance.searchItem')}
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:border-blue-500" />
            </div>
            {measures.length > 1 && (
              <select value={measureFilter} onChange={(e) => setMeasureFilter(e.target.value)}
                className="h-9 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:border-blue-500">
                <option value="">{t('finance.allMeasures')}</option>
                {measures.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            )}
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-4 py-2 text-sm font-bold flex items-center justify-between">
              <span>{t('finance.byItem')}</span>
              <span className="tabular-nums text-gray-500 flex items-center gap-2">
                {money(items.total)}
                {(() => { const d = deltaPct(items.total, items.prev_total); if (d == null || Math.abs(d) < 0.05) return null; const up = d > 0; return <span className={cn('text-xs flex items-center gap-0.5 font-medium', up ? 'text-red-500' : 'text-emerald-600')}>{up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}{up ? '+' : ''}{d.toFixed(0)}%</span>; })()}
              </span>
            </div>
            {itemRows.length === 0 ? <p className="py-10 text-center text-sm text-gray-400">{t('finance.noData')}</p> : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/60 text-gray-500 text-xs uppercase"><tr>
                  <th className="w-8 px-2 py-2"></th>
                  <th className="text-left font-medium px-4 py-2">{t('finance.item')}</th>
                  <th className="text-right font-medium px-4 py-2">{t('finance.qty')}</th>
                  <th className="text-right font-medium px-4 py-2">{t('finance.avgUnitPrice')}</th>
                  <th className="text-right font-medium px-4 py-2">{t('finance.lastPrice')}</th>
                  <th className="text-right font-medium px-4 py-2">{t('finance.total')}</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {itemRows.map((r) => {
                    const key = `${r.item_code}|${r.measure_code ?? ''}|${r.meas_weight ?? ''}`;
                    const isOpen = expanded === key;
                    const chg = r.price_change_pct;
                    const variant = (priceHist[r.item_code] ?? []).find((h) =>
                      (h.measure_code ?? '') === (r.measure_code ?? '') &&
                      (h.meas_weight == null ? null : Number(h.meas_weight)) === (r.meas_weight == null ? null : r.meas_weight));
                    const share = items.total > 0 ? r.total / items.total : 0;
                    return (
                      <Fragment key={key}>
                        <tr className="hover:bg-gray-50/60 dark:hover:bg-gray-800/30 cursor-pointer" onClick={() => toggleRow(r)}>
                          <td className="px-2 py-2 text-gray-400">{isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</td>
                          <td className="px-4 py-2">
                            <div>{tr(r.item_name, r.item_code)}</div>
                            <div className="mt-1 h-1 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden max-w-[200px]"><div className="h-full bg-indigo-400 rounded-full" style={{ width: `${Math.min(100, share * 100)}%` }} /></div>
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums text-gray-500">{Number(r.qty).toLocaleString(undefined, { maximumFractionDigits: 4 })} {r.measure_code}{r.meas_weight ? ` ×${Number(r.meas_weight)}` : ''}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{money(r.avg_price)}</td>
                          <td className="px-4 py-2 text-right tabular-nums whitespace-nowrap">
                            <span className="inline-flex items-center gap-1">
                              {chg != null && chg !== 0 && (chg > 0 ? <ArrowUpRight className="w-3.5 h-3.5 text-red-500" /> : <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600" />)}
                              {money(r.last_price)}
                              {chg != null && chg !== 0 && <span className={cn('text-xs', chg > 0 ? 'text-red-500' : 'text-emerald-600')}>{chg > 0 ? '+' : ''}{chg}%</span>}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums font-semibold">{money(r.total)}</td>
                        </tr>
                        {isOpen && (
                          <tr className="bg-gray-50/40 dark:bg-gray-900/40">
                            <td colSpan={6} className="px-4 py-3">
                              <PriceHistoryPanel row={r} variant={variant} loaded={!!priceHist[r.item_code]} money={money} t={t} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          </div>
        ) : tab === 'cash' && cash ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <select value={cashDesk} onChange={(e) => setCashDesk(e.target.value)}
                className="h-9 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:border-blue-500">
                <option value="">{t('finance.allDesks')}</option>
                {cash.desks.map((d) => <option key={d.code} value={d.code}>{tr(d.description, d.code)}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Stat label={t('finance.cashIn')} value={money(cash.in)} color="text-emerald-600" delta={deltaPct(cash.in, cash.prev_in)} />
              <Stat label={t('finance.cashOut')} value={money(cash.out)} color="text-red-500" delta={deltaPct(cash.out, cash.prev_out)} invert />
              <Stat label={t('finance.net')} value={money(cash.net)} color={cash.net >= 0 ? 'text-emerald-600' : 'text-red-500'} delta={deltaPct(cash.net, cash.prev_net)} />
            </div>
            <div className="flex flex-wrap gap-2">
              {cash.desks.filter((d) => !cashDesk || d.code === cashDesk).map((d) => (
                <div key={d.code} className="rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-2 min-w-[170px]">
                  <p className="text-xs font-medium text-gray-500 mb-1">{tr(d.description, d.code)}</p>
                  <div className="space-y-0.5 text-xs tabular-nums">
                    <div className="flex justify-between gap-3"><span className="text-gray-400">{t('finance.opening')}</span><span>{money(d.opening)}</span></div>
                    <div className="flex justify-between gap-3"><span className="text-gray-400">{t('finance.cashIn')}</span><span className="text-emerald-600">+{money(d.period_in)}</span></div>
                    <div className="flex justify-between gap-3"><span className="text-gray-400">{t('finance.cashOut')}</span><span className="text-red-500">−{money(d.period_out)}</span></div>
                    <div className="flex justify-between gap-3 border-t border-gray-200 dark:border-gray-700 mt-0.5 pt-0.5 font-semibold"><span>{t('finance.closing')}</span><span className={cn(d.closing >= 0 ? '' : 'text-red-500')}>{money(d.closing)}</span></div>
                  </div>
                </div>
              ))}
            </div>
            {cash.flow.length > 0 && <CashFlowChart flow={cash.flow} t={t} money={money} />}
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

function Stat({ label, value, color, delta, invert }: { label: string; value: string; color: string; delta?: number | null; invert?: boolean }) {
  const showDelta = delta != null && Math.abs(delta) >= 0.05;
  const up = (delta ?? 0) > 0;
  const good = invert ? !up : up; // xərc/çıxış: artım pisdir
  return (
    <div className="rounded-lg bg-gray-50 dark:bg-gray-800/40 px-3 py-2.5">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={cn('text-lg font-bold tabular-nums', color)}>{value}</p>
      {showDelta && (
        <p className={cn('mt-0.5 text-xs font-medium tabular-nums flex items-center gap-0.5', good ? 'text-emerald-600' : 'text-red-500')}>
          {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {up ? '+' : ''}{(delta ?? 0).toFixed(0)}%
        </p>
      )}
    </div>
  );
}

function PriceHistoryPanel({ row, variant, loaded, money, t }: {
  row: ItemsReportRow;
  variant: ItemPriceHistory | undefined;
  loaded: boolean;
  money: (n: number | string) => string;
  t: (k: string) => string;
}) {
  if (!loaded) return <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-blue-600" /></div>;
  // changes ən yeni yuxarıda gəlir → qrafik üçün xronoloji (köhnədən yeniyə) çeviririk
  const data = (variant?.changes ?? []).slice().reverse().map((c) => ({ date: c.posting_date ?? '', price: Number(c.unit_price) }));
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
      <div className="md:col-span-3">
        <p className="text-xs font-medium text-gray-500 mb-1">{t('finance.priceHistory')}</p>
        {data.length >= 2 ? (
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => (v || '').slice(5)} />
              <YAxis tick={{ fontSize: 10 }} width={44} domain={['auto', 'auto']} />
              <Tooltip formatter={(v) => money(Number(v))} />
              <Line type="monotone" dataKey="price" stroke="#4f46e5" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : <p className="text-sm text-gray-400 py-6 text-center">{t('finance.noPriceChanges')}</p>}
      </div>
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between gap-4"><span className="text-gray-400">{t('finance.priceRange')}</span><span className="tabular-nums">{money(row.min_price)} – {money(row.max_price)}</span></div>
        <div className="flex justify-between gap-4"><span className="text-gray-400">{t('finance.avgUnitPrice')}</span><span className="tabular-nums">{money(row.avg_price)}</span></div>
        <div className="flex justify-between gap-4"><span className="text-gray-400">{t('finance.lastPrice')}</span><span className="tabular-nums font-semibold">{money(row.last_price)}</span></div>
      </div>
    </div>
  );
}

const DONUT_COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#64748b'];

function NetTrendChart({ months, t, money }: { months: TrendReport['months']; t: (k: string) => string; money: (n: number | string) => string }) {
  const data = months.map((m) => ({ month: m.month.slice(2), income: m.income, expense: m.expense, net: m.income - m.expense }));
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 h-full">
      <p className="text-sm font-semibold mb-3">{t('finance.netTrend')}</p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100 dark:stroke-gray-800" />
          <XAxis dataKey="month" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} width={44} />
          <Tooltip formatter={(v) => money(Number(v))} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} dot={false} name={t('finance.income')} />
          <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} dot={false} name={t('finance.expense')} />
          <Line type="monotone" dataKey="net" stroke="#4f46e5" strokeWidth={2} dot={false} name={t('finance.net')} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function CategoryDonut({ rows, catName, t, money }: { rows: SummaryReport['rows']; catName: (c: string | null) => string; t: (k: string) => string; money: (n: number | string) => string }) {
  const data = rows.filter((r) => r.entry_type === 'expense').map((r) => ({ name: catName(r.category_code), value: r.total })).sort((a, b) => b.value - a.value);
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 h-full">
      <p className="text-sm font-semibold mb-3">{t('finance.expenseByCategory')}</p>
      {data.length === 0 ? <p className="py-12 text-center text-sm text-gray-400">{t('finance.noData')}</p> : (
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2}>
              {data.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v) => money(Number(v))} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function CashFlowChart({ flow, t, money }: { flow: CashReport['flow']; t: (k: string) => string; money: (n: number | string) => string }) {
  const data = flow.map((f) => ({ date: f.date.slice(5), in: f.in, out: f.out }));
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
      <p className="text-sm font-semibold mb-3">{t('finance.cashFlowChart')}</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100 dark:stroke-gray-800" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} width={44} />
          <Tooltip formatter={(v) => money(Number(v))} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="in" fill="#10b981" name={t('finance.cashIn')} radius={[2, 2, 0, 0]} />
          <Bar dataKey="out" fill="#ef4444" name={t('finance.cashOut')} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
