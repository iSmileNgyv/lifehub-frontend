'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, X, Trash2, Plus, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useContentLanguages } from '@/contexts/ContentLanguagesContext';
import { useAuth } from '@/contexts/AuthContext';
import { tradingJournalService } from '@/services/tradingJournalService';
import { tradingFormulaService } from '@/services/tradingFormulaService';
import { applyFormula } from '@/lib/formula';
import { ApiError } from '@/lib/api';
import { translateValue } from '@/lib/translate';
import { fmtDate } from '@/lib/utils';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import type { FormulaTier, TradingEntryType, TradingJournal, TradingJournalEntry } from '@/types';

export default function TradingJournalDetailPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const { t, language } = useLanguage();
  const { defaultCode } = useContentLanguages();
  const { can } = useAuth();

  const [journal, setJournal] = useState<TradingJournal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTiers, setActiveTiers] = useState<FormulaTier[] | null>(null);

  const canEdit = can('TRADING_UPDATE');
  const canPost = can('TRADING_POST');
  const [posting, setPosting] = useState(false);
  const [postBusy, setPostBusy] = useState(false);

  const load = useCallback(() => {
    tradingJournalService.show(code).then(setJournal).catch((e) => setError(e instanceof ApiError ? e.message : 'error')).finally(() => setLoading(false));
  }, [code]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    tradingFormulaService.list().then((r) => setActiveTiers(r.data.find((f) => f.is_active)?.tiers ?? null)).catch(() => {});
  }, []);

  const removeEntry = async (uid: string) => {
    try { await tradingJournalService.removeEntry(code, uid); load(); }
    catch (e) { setError(e instanceof ApiError ? e.message : t('common.error')); }
  };

  const doPost = async () => {
    setPostBusy(true); setError('');
    try { await tradingJournalService.post(code); setPosting(false); load(); }
    catch (e) { setError(e instanceof ApiError ? e.message : t('common.error')); }
    finally { setPostBusy(false); }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>;
  if (!journal) return <div className="py-16 text-center text-sm text-gray-400">{error || t('common.error')}</div>;

  const isDraft = journal.status === 'draft';
  const entries = journal.entries ?? [];

  return (
    <div>
      <button onClick={() => router.push('/trading')} className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"><ArrowLeft className="w-4 h-4" /> {t('trading.journalsTitle')}</button>

      <PageHeader
        title={`${journal.code}${journal.descr ? ` · ${journal.descr}` : ''}`}
        subtitle={`${fmtDate(journal.posting_date)}${journal.cash_desk_name ? ` · ${translateValue(journal.cash_desk_name, language, defaultCode)}` : ''}`}
        actions={
          <div className="flex items-center gap-2">
            <span className={cn('text-xs px-2.5 py-1 rounded-full', journal.status === 'posted' ? 'bg-green-100 dark:bg-green-950/40 text-green-600' : 'bg-amber-100 dark:bg-amber-950/40 text-amber-600')}>
              {journal.status === 'posted' ? t('trading.posted') : t('trading.draft')}
            </span>
            {isDraft && canPost && entries.length > 0 && <Button onClick={() => setPosting(true)}>{t('trading.post')}</Button>}
          </div>
        }
      />

      {error && (
        <div className="mb-4 flex items-center justify-between px-4 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
          {error}<button onClick={() => setError('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Xülasə */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        <Stat label={t('trading.buyManat')} value={`${journal.buy_manat.toFixed(2)} ₼`} />
        <Stat label={t('trading.sellManat')} value={`${journal.sell_manat.toFixed(2)} ₼`} />
        <Stat label={t('trading.usdBought')} value={`${journal.usd_bought} $`} />
        <Stat label={t('trading.usdSold')} value={`${journal.usd_sold} $`} />
        <Stat label={t('trading.netCash')} value={`${journal.net_cash.toFixed(2)} ₼`} />
        <Stat label={t('trading.profit')} value={journal.status === 'posted' ? `${journal.profit.toFixed(2)} ₼` : '—'} highlight={journal.status === 'posted'} />
      </div>

      {/* Sətir əlavə etmə */}
      {isDraft && canEdit && <AddEntry code={code} activeTiers={activeTiers} onAdded={load} onError={setError} />}

      {/* Sətirlər */}
      {entries.length === 0 ? (
        <div className="py-10 text-center text-sm text-gray-400">{t('trading.noEntries')}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400">
              <tr>
                <th className="text-left font-medium px-4 py-2.5">{t('trading.type')}</th>
                <th className="text-right font-medium px-4 py-2.5">{t('trading.manat')}</th>
                <th className="text-right font-medium px-4 py-2.5">USD</th>
                <th className="text-right font-medium px-4 py-2.5">{t('trading.rate')}</th>
                <th className="text-left font-medium px-4 py-2.5">{t('trading.descr')}</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {entries.map((e) => (
                <tr key={e.uid} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <td className="px-4 py-2.5">
                    <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full', e.entry_type === 'buy' ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-600' : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600')}>
                      {e.entry_type === 'buy' ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                      {e.entry_type === 'buy' ? t('trading.buy') : t('trading.sell')}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono">{Number(e.manat_amount).toFixed(2)} ₼</td>
                  <td className="px-4 py-2.5 text-right font-mono">{Number(e.usd_qty)} $</td>
                  <td className="px-4 py-2.5 text-right font-mono text-gray-500">{Number(e.usd_qty) > 0 ? (Number(e.manat_amount) / Number(e.usd_qty)).toFixed(4) : '—'}</td>
                  <td className="px-4 py-2.5 text-gray-500">{e.descr || '—'}</td>
                  <td className="px-4 py-2.5 text-right">
                    {isDraft && canEdit && <button onClick={() => removeEntry(e.uid)} className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {posting && (
        <Modal open onClose={() => !postBusy && setPosting(false)} title={t('trading.post')} size="sm"
          footer={<>
            <Button variant="outline" onClick={() => setPosting(false)} disabled={postBusy}>{t('common.cancel')}</Button>
            <Button onClick={doPost} loading={postBusy}>{t('trading.post')}</Button>
          </>}>
          <p className="text-sm text-gray-600 dark:text-gray-300">{t('trading.postConfirm').replace('{code}', journal.code)}</p>
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">{t('trading.postWarn')}</p>
        </Modal>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn('rounded-xl border p-3', highlight ? 'border-green-300 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20' : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900')}>
      <p className="text-xs text-gray-400">{label}</p>
      <p className={cn('text-lg font-bold', highlight ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white')}>{value}</p>
    </div>
  );
}

function AddEntry({ code, activeTiers, onAdded, onError }: { code: string; activeTiers: FormulaTier[] | null; onAdded: () => void; onError: (m: string) => void }) {
  const { t } = useLanguage();
  const [type, setType] = useState<TradingEntryType>('sell');
  const [manat, setManat] = useState('');
  const [usd, setUsd] = useState('');
  const [saving, setSaving] = useState(false);

  // Satış üçün formuladan təxmini USD
  const suggestion = useMemo(() => {
    if (type !== 'sell' || !activeTiers) return null;
    const amt = Number(manat);
    if (manat.trim() === '' || Number.isNaN(amt)) return null;
    try { return applyFormula(activeTiers, amt); } catch { return null; }
  }, [type, activeTiers, manat]);

  const effectiveUsd = usd.trim() !== '' ? usd : (suggestion ? String(suggestion.result) : '');

  // Alışda kurs = manat / usd (neçədən alış)
  const buyRate = useMemo(() => {
    const m = Number(manat); const u = Number(usd);
    if (!m || !u || u <= 0) return null;
    return (m / u).toFixed(4);
  }, [manat, usd]);

  const add = async () => {
    const m = Number(manat);
    if (!m || m <= 0) return;
    setSaving(true);
    try {
      await tradingJournalService.addEntry(code, {
        entry_type: type,
        manat_amount: m,
        usd_qty: usd.trim() !== '' ? Number(usd) : undefined,
      });
      setManat(''); setUsd('');
      onAdded();
    } catch (e) {
      onError(e instanceof ApiError ? e.message : t('common.error'));
    } finally { setSaving(false); }
  };

  return (
    <div className="mb-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/30 p-4">
      <div className="flex gap-1 mb-3">
        {(['sell', 'buy'] as const).map((tk) => (
          <button key={tk} onClick={() => setType(tk)} className={cn('px-3 py-1.5 rounded-lg text-sm font-medium', type === tk ? (tk === 'buy' ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white') : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800')}>
            {tk === 'buy' ? t('trading.buy') : t('trading.sell')}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-40">
          <label className="block text-xs text-gray-500 mb-1">{t('trading.manat')} (₼)</label>
          <input type="number" value={manat} onChange={(e) => setManat(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }} className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-base outline-none focus:border-blue-500" />
        </div>
        <div className="w-40">
          <label className="block text-xs text-gray-500 mb-1">USD {type === 'sell' && <span className="text-gray-400">({t('trading.fromFormula')})</span>}</label>
          <input type="number" value={usd} onChange={(e) => setUsd(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
            placeholder={type === 'sell' && suggestion ? String(suggestion.result) : ''}
            className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-base outline-none focus:border-blue-500" />
        </div>
        {type === 'sell' && (
          <div className="text-sm text-gray-500 pb-2.5">
            {suggestion ? <>→ <span className="font-bold text-gray-800 dark:text-gray-100">{effectiveUsd} $</span> <span className="text-xs text-gray-400">({t('trading.tier')} {suggestion.tier + 1})</span></> : (manat.trim() && <span className="text-amber-500 text-xs">{t('trading.noActiveFormula')}</span>)}
          </div>
        )}
        {type === 'buy' && buyRate && (
          <div className="text-sm text-gray-500 pb-2.5">{t('trading.rate')}: <span className="font-bold text-gray-800 dark:text-gray-100">{buyRate}</span> <span className="text-xs text-gray-400">₼/$</span></div>
        )}
        <Button onClick={add} loading={saving} disabled={!manat || (type === 'buy' && !usd)} className="ml-auto"><Plus className="w-4 h-4 mr-1" /> {t('common.add')}</Button>
      </div>
    </div>
  );
}
