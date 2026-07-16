'use client';

import { useEffect, useState } from 'react';
import { Loader2, Send, X, Check, Copy, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { telegramService, type TelegramSettings } from '@/services/telegramService';
import { deckService } from '@/services/studyService';
import { ApiError } from '@/lib/api';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import type { Deck } from '@/types';

export default function TelegramPage() {
  const { t } = useLanguage();
  const [linked, setLinked] = useState(false);
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [settings, setSettings] = useState<TelegramSettings | null>(null);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    telegramService.status()
      .then((s) => { setLinked(s.linked); setBotUsername(s.bot_username); setSettings(s.settings); })
      .catch((e) => setError(e instanceof ApiError ? e.message : t('common.error')))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); deckService.list().then((r) => setDecks(r.data)).catch(() => {}); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const genCode = async () => {
    setBusy(true); setError('');
    try { const r = await telegramService.linkCode(); setCode(r.code); setBotUsername(r.bot_username); }
    catch (e) { setError(e instanceof ApiError ? e.message : t('common.error')); }
    finally { setBusy(false); }
  };

  const unlink = async () => {
    setBusy(true); setError('');
    try { await telegramService.unlink(); setCode(null); load(); }
    catch (e) { setError(e instanceof ApiError ? e.message : t('common.error')); }
    finally { setBusy(false); }
  };

  const save = async () => {
    if (!settings) return;
    setBusy(true); setError(''); setSaved(false);
    try { const r = await telegramService.saveSettings(settings); setSettings(r.settings); setSaved(true); setTimeout(() => setSaved(false), 2000); }
    catch (e) { setError(e instanceof ApiError ? e.message : t('common.error')); }
    finally { setBusy(false); }
  };

  const set = (patch: Partial<TelegramSettings>) => setSettings((s) => (s ? { ...s, ...patch } : s));
  const inp = 'w-full h-9 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:border-blue-500';

  return (
    <div className="max-w-2xl">
      <PageHeader title={t('telegram.title')} subtitle={t('telegram.subtitle')} />
      {error && <div className="mb-4 flex items-center justify-between px-4 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600">{error}<button onClick={() => setError('')}><X className="w-4 h-4" /></button></div>}

      {loading ? <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div> : (
        <div className="space-y-4">
          {/* Bağlantı */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
            <div className="flex items-center gap-2 mb-3"><Send className="w-5 h-5 text-blue-500" /><h2 className="font-semibold text-gray-800 dark:text-gray-100">{t('telegram.connection')}</h2></div>

            {linked ? (
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-sm text-emerald-600"><Check className="w-4 h-4" /> {t('telegram.linked')}{botUsername ? ` · @${botUsername}` : ''}</span>
                <Button variant="outline" onClick={unlink} loading={busy}>{t('telegram.unlink')}</Button>
              </div>
            ) : code ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-300">{t('telegram.codeHint')}</p>
                <div className="flex items-center gap-3">
                  <code className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-lg font-bold font-mono tracking-widest">{code}</code>
                  <button onClick={() => navigator.clipboard?.writeText(`/start ${code}`)} title={t('telegram.copy')} className="text-gray-400 hover:text-blue-600"><Copy className="w-5 h-5" /></button>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  {botUsername && <a href={`https://t.me/${botUsername}?start=${code}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline"><Send className="w-4 h-4" /> @{botUsername}</a>}
                  <Button variant="outline" size="sm" onClick={load} leftIcon={<RefreshCw className="w-4 h-4" />}>{t('telegram.checkLinked')}</Button>
                </div>
                <p className="text-xs text-gray-400">{t('telegram.startInstruction').replace('{code}', code)}</p>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{t('telegram.notLinked')}</span>
                <Button onClick={genCode} loading={busy}>{t('telegram.generateCode')}</Button>
              </div>
            )}
          </div>

          {/* Study push konfiqurasiyası */}
          {settings && (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-4">
              <h2 className="font-semibold text-gray-800 dark:text-gray-100">{t('telegram.studyPush')}</h2>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-gray-700 dark:text-gray-200">{t('telegram.enabled')}</span>
                <input type="checkbox" checked={settings.study_enabled} onChange={(e) => set({ study_enabled: e.target.checked })} className="w-5 h-5 accent-blue-600" />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('telegram.deck')}</label>
                  <select value={settings.study_deck_uid ?? ''} onChange={(e) => set({ study_deck_uid: e.target.value || null })} className={inp}>
                    <option value="">{t('telegram.allDue')}</option>
                    {decks.map((d) => <option key={d.uid} value={d.uid}>{d.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('telegram.interval')}</label>
                  <Input type="number" value={String(settings.interval_min)} onChange={(e) => set({ interval_min: Number(e.target.value) || 0 })} />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('telegram.activeFrom')}</label>
                  <input type="time" value={settings.active_from} onChange={(e) => set({ active_from: e.target.value })} className={inp} />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('telegram.activeTo')}</label>
                  <input type="time" value={settings.active_to} onChange={(e) => set({ active_to: e.target.value })} className={inp} />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('telegram.cardsPerPush')}</label>
                  <Input type="number" value={String(settings.cards_per_push)} onChange={(e) => set({ cards_per_push: Number(e.target.value) || 1 })} />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button onClick={save} loading={busy}>{t('common.save')}</Button>
                {saved && <span className="inline-flex items-center gap-1 text-sm text-emerald-600"><Check className="w-4 h-4" /> {t('common.saved')}</span>}
                {!linked && <span className="text-xs text-amber-600">{t('telegram.linkFirst')}</span>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
