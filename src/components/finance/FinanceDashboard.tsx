'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, TrendingUp, TrendingDown, Scale, Wallet } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';
import { useContentLanguages } from '@/contexts/ContentLanguagesContext';
import { financeReportService, type SummaryReport, type CashReport, type TrendReport } from '@/services/financeReportService';
import { financeCategoryService } from '@/services/financeCategoryService';
import { translateValue } from '@/lib/translate';
import { cn } from '@/lib/utils';
import type { FinanceCategory } from '@/types';

const DONUT = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b'];

const money = (n: number) => Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const short = (n: number) => (Math.abs(n) >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));
const mLabel = (ym: string) => { const [y, m] = ym.split('-'); return `${m}.${y.slice(2)}`; };

/** Dashboard-un maliyyə bölməsi — KPI + aylıq trend + kateqoriya donut + kassa balansları. */
export default function FinanceDashboard() {
  const { t, language } = useLanguage();
  const { defaultCode } = useContentLanguages();

  const monthStart = useMemo(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); }, []);
  const monthEnd = useMemo(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10); }, []);

  const [summary, setSummary] = useState<SummaryReport | null>(null);
  const [cash, setCash] = useState<CashReport | null>(null);
  const [trend, setTrend] = useState<TrendReport | null>(null);
  const [cats, setCats] = useState<FinanceCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    financeCategoryService.list().then(setCats).catch(() => {});
    Promise.all([
      financeReportService.summary(monthStart, monthEnd).then(setSummary).catch(() => setSummary(null)),
      financeReportService.cash(monthStart, monthEnd).then(setCash).catch(() => setCash(null)),
      financeReportService.trend(6).then(setTrend).catch(() => setTrend(null)),
    ]).finally(() => setLoading(false));
  }, [monthStart, monthEnd]);

  const catName = (c: string | null) => (c ? translateValue(cats.find((k) => k.code === c)?.name, language, defaultCode) || c : t('finance.noCategory'));

  const cashTotal = useMemo(() => (cash?.desks ?? []).reduce((s, d) => s + Number(d.balance_lcy), 0), [cash]);
  const trendData = useMemo(() => (trend?.months ?? []).map((m) => ({ name: mLabel(m.month), income: m.income, expense: m.expense })), [trend]);
  const expenseCats = useMemo(() => {
    const rows = (summary?.rows ?? []).filter((r) => r.entry_type === 'expense' && r.total > 0);
    return rows.map((r) => ({ name: catName(r.category_code), value: r.total })).sort((a, b) => b.value - a.value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary, cats, language]);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-4">
      {/* KPI kartları */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={<TrendingUp className="w-4 h-4" />} label={t('finance.income')} value={summary?.income ?? 0} tone="emerald" />
        <Kpi icon={<TrendingDown className="w-4 h-4" />} label={t('finance.expense')} value={summary?.expense ?? 0} tone="red" />
        <Kpi icon={<Scale className="w-4 h-4" />} label={t('finance.net')} value={summary?.net ?? 0} tone={(summary?.net ?? 0) >= 0 ? 'emerald' : 'red'} />
        <Kpi icon={<Wallet className="w-4 h-4" />} label={t('dashboard.cashBalance')} value={cashTotal} tone="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Aylıq trend */}
        <div className="lg:col-span-2 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t('dashboard.monthlyTrend')}</h3>
          {trendData.length === 0 ? <Empty t={t} />
            : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={trendData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-800" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="currentColor" className="text-gray-400" />
                  <YAxis tickFormatter={short} tick={{ fontSize: 12 }} stroke="currentColor" className="text-gray-400" width={40} />
                  <Tooltip formatter={(v) => money(Number(v))} contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', fontSize: 13 }} />
                  <Bar dataKey="income" name={t('finance.income')} fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name={t('finance.expense')} fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
        </div>

        {/* Xərc — kateqoriya donut */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t('dashboard.expenseByCategory')}</h3>
          {expenseCats.length === 0 ? <Empty t={t} />
            : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={expenseCats} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={52} outerRadius={80} paddingAngle={2}>
                      {expenseCats.map((_, i) => <Cell key={i} fill={DONUT[i % DONUT.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => money(Number(v))} contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', fontSize: 13 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                  {expenseCats.slice(0, 6).map((c, i) => (
                    <div key={c.name} className="flex items-center gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: DONUT[i % DONUT.length] }} />
                      <span className="truncate flex-1 text-gray-600 dark:text-gray-300">{c.name}</span>
                      <span className="tabular-nums font-medium text-gray-800 dark:text-gray-100">{money(c.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
        </div>
      </div>

      {/* Kassa balansları */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t('dashboard.cashBalances')}</h3>
        {(cash?.desks ?? []).length === 0 ? <Empty t={t} />
          : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(cash?.desks ?? []).map((d) => {
                const bal = Number(d.balance_lcy);
                const pct = cashTotal > 0 ? Math.max(3, (bal / cashTotal) * 100) : 0;
                return (
                  <div key={d.code} className="rounded-xl border border-gray-100 dark:border-gray-800 p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{translateValue(d.description, language, defaultCode) || d.code}</span>
                      <span className={cn('text-sm font-bold tabular-nums', bal >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-500')}>{money(bal)} ₼</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <div className="h-full rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: 'emerald' | 'red' | 'blue' }) {
  const tones = {
    emerald: 'from-emerald-50 to-white dark:from-emerald-950/30 dark:to-gray-900 text-emerald-600 border-emerald-200 dark:border-emerald-900',
    red: 'from-red-50 to-white dark:from-red-950/30 dark:to-gray-900 text-red-500 border-red-200 dark:border-red-900',
    blue: 'from-blue-50 to-white dark:from-blue-950/30 dark:to-gray-900 text-blue-600 border-blue-200 dark:border-blue-900',
  }[tone];
  return (
    <div className={cn('rounded-2xl border bg-gradient-to-br p-4', tones)}>
      <div className="flex items-center gap-1.5 text-xs font-medium opacity-80">{icon}{label}</div>
      <p className="mt-1.5 text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{money(value)} <span className="text-sm text-gray-400">₼</span></p>
    </div>
  );
}

function Empty({ t }: { t: (k: string) => string }) {
  return <div className="py-10 text-center text-sm text-gray-400">{t('finance.noData')}</div>;
}
