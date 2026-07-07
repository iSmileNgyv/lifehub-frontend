'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Loader2, X, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useContentLanguages } from '@/contexts/ContentLanguagesContext';
import { useAuth } from '@/contexts/AuthContext';
import { tradingJournalService } from '@/services/tradingJournalService';
import { cashDeskService } from '@/services/cashDeskService';
import { ApiError } from '@/lib/api';
import { translateValue } from '@/lib/translate';
import { fmtDate } from '@/lib/utils';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import type { CashDesk, TradingJournal } from '@/types';

export default function TradingJournalsPage() {
  const { t, language } = useLanguage();
  const { defaultCode } = useContentLanguages();
  const { can } = useAuth();

  const [journals, setJournals] = useState<TradingJournal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const load = () => {
    setLoading(true);
    tradingJournalService.list().then((r) => setJournals(r.data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  return (
    <div>
      <PageHeader
        title={t('trading.journalsTitle')}
        subtitle={t('trading.journalsSubtitle')}
        actions={can('TRADING_CREATE') && <Button onClick={() => setCreating(true)}><Plus className="w-4 h-4 mr-1" /> {t('trading.newJournal')}</Button>}
      />

      {error && (
        <div className="mb-4 flex items-center justify-between px-4 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
          {error}<button onClick={() => setError('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
      ) : journals.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">{t('trading.noJournals')}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400">
              <tr>
                <th className="text-left font-medium px-4 py-2.5">{t('common.code')}</th>
                <th className="text-left font-medium px-4 py-2.5">{t('common.date')}</th>
                <th className="text-left font-medium px-4 py-2.5">{t('trading.descr')}</th>
                <th className="text-right font-medium px-4 py-2.5">{t('trading.buyManat')}</th>
                <th className="text-right font-medium px-4 py-2.5">{t('trading.sellManat')}</th>
                <th className="text-left font-medium px-4 py-2.5">{t('common.status')}</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {journals.map((j) => (
                <tr key={j.code} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <td className="px-4 py-2.5 font-mono font-medium text-gray-800 dark:text-gray-100">
                    <Link href={`/trading/${j.code}`} className="hover:text-blue-600">{j.code}</Link>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{fmtDate(j.posting_date)}</td>
                  <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">{j.descr || '—'}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{j.buy_manat.toFixed(2)} ₼</td>
                  <td className="px-4 py-2.5 text-right font-mono">{j.sell_manat.toFixed(2)} ₼</td>
                  <td className="px-4 py-2.5">
                    <span className={cn('inline-block text-xs px-2 py-0.5 rounded-full', j.status === 'posted' ? 'bg-green-100 dark:bg-green-950/40 text-green-600' : 'bg-amber-100 dark:bg-amber-950/40 text-amber-600')}>
                      {j.status === 'posted' ? t('trading.posted') : t('trading.draft')}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Link href={`/trading/${j.code}`} className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-blue-500"><ChevronRight className="w-4 h-4" /></Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && <CreateJournalModal onClose={() => setCreating(false)} onCreated={() => { setCreating(false); load(); }} />}
    </div>
  );
}

function CreateJournalModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { t, language } = useLanguage();
  const { defaultCode } = useContentLanguages();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [descr, setDescr] = useState('');
  const [cashDesk, setCashDesk] = useState('');
  const [desks, setDesks] = useState<CashDesk[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { cashDeskService.list().then((r) => setDesks(r.data)).catch(() => {}); }, []);

  const submit = async () => {
    setError(''); setSaving(true);
    try {
      await tradingJournalService.create({ posting_date: date, descr: descr || null, cash_desk_code: cashDesk || null });
      onCreated();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common.error'));
    } finally { setSaving(false); }
  };

  return (
    <Modal open onClose={() => !saving && onClose()} title={t('trading.newJournal')} size="md"
      footer={<>
        <Button variant="outline" onClick={onClose} disabled={saving}>{t('common.cancel')}</Button>
        <Button onClick={submit} loading={saving}>{t('common.save')}</Button>
      </>}>
      <div className="space-y-3">
        {error && <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600 dark:text-red-400">{error}</div>}
        <Input label={t('trading.postingDate')} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Input label={t('trading.descr')} value={descr} onChange={(e) => setDescr(e.target.value)} placeholder="2 iyul" />
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('trading.cashDesk')}</label>
          <select value={cashDesk} onChange={(e) => setCashDesk(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:border-blue-500">
            <option value="">{t('trading.selectCashDesk')}</option>
            {desks.map((d) => <option key={d.code} value={d.code}>{translateValue(d.description, language, defaultCode) || d.code}</option>)}
          </select>
        </div>
      </div>
    </Modal>
  );
}
