'use client';

import { useEffect, useState } from 'react';
import { Loader2, TrendingUp, TrendingDown, Wallet, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { tradingJournalService } from '@/services/tradingJournalService';
import PageHeader from '@/components/ui/PageHeader';

interface Stats { month: string; revenue: number; buy: number; cogs: number; profit: number; journals: number }

export default function DashboardPage() {
  const { t } = useLanguage();
  const { can } = useAuth();
  const canTrading = can('TRADING_VIEW');

  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [stats, setStats] = useState<Stats | null>(null);
  const [balance, setBalance] = useState<{ usd: number; cost_lcy: number; avg_cost: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!canTrading) { setLoading(false); return; }
    setLoading(true);
    tradingJournalService.stats(month).then(setStats).catch(() => setStats(null)).finally(() => setLoading(false));
  }, [month, canTrading]);
  useEffect(() => {
    if (canTrading) tradingJournalService.balance().then(setBalance).catch(() => setBalance(null));
  }, [canTrading]);

  return (
    <div>
      <PageHeader title={t('nav.dashboard')} />

      {canTrading && (
        <section className="mb-6">
          {/* USD balansı (cari qalıq) */}
          <div className="mb-4 rounded-2xl border border-blue-200 dark:border-blue-900 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-gray-900 p-5">
            <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300 mb-1"><DollarSign className="w-4 h-4" /> {t('dashboard.usdBalance')}</div>
            <div className="flex flex-wrap items-end gap-x-8 gap-y-2">
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{(balance?.usd ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-lg text-gray-400">$</span></p>
              <div className="text-sm">
                <span className="text-gray-400">{t('dashboard.balanceCost')}: </span>
                <span className="font-semibold text-gray-700 dark:text-gray-200">{(balance?.cost_lcy ?? 0).toFixed(2)} ₼</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-400">{t('dashboard.avgCost')}: </span>
                <span className="font-semibold text-gray-700 dark:text-gray-200">{(balance?.avg_cost ?? 0).toFixed(4)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('dashboard.monthlyTrading')}</h2>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="h-9 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:border-blue-500" />
          </div>

          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card icon={<Wallet className="w-5 h-5" />} label={t('dashboard.totalIn')} value={stats ? stats.revenue : 0} tone="blue" />
              <Card icon={<TrendingDown className="w-5 h-5" />} label={t('dashboard.totalBuy')} value={stats ? stats.buy : 0} tone="gray" />
              <Card icon={<TrendingUp className="w-5 h-5" />} label={t('dashboard.netProfit')} value={stats ? stats.profit : 0} tone="green" />
            </div>
          )}
          <p className="mt-2 text-xs text-gray-400">{t('dashboard.journalsPosted').replace('{n}', String(stats?.journals ?? 0))}</p>
        </section>
      )}

      {!canTrading && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.empty')}</p>
        </div>
      )}
    </div>
  );
}

function Card({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: 'blue' | 'gray' | 'green' }) {
  const tones = {
    blue: 'bg-blue-50 dark:bg-blue-950/30 text-blue-600',
    gray: 'bg-gray-100 dark:bg-gray-800 text-gray-500',
    green: 'bg-green-50 dark:bg-green-950/30 text-green-600',
  };
  return (
    <div className={cn('rounded-2xl border p-5', tone === 'green' ? 'border-green-200 dark:border-green-900 bg-green-50/40 dark:bg-green-950/10' : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900')}>
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', tones[tone])}>{icon}</div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className={cn('text-2xl font-bold', tone === 'green' ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white')}>{value.toFixed(2)} ₼</p>
    </div>
  );
}
