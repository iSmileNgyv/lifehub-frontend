'use client';

import { useEffect, useState } from 'react';
import { Loader2, Check, GraduationCap, Send, Puzzle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { deckService, studyService, type StudySettings } from '@/services/studyService';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import type { Deck } from '@/types';

export default function StudySettingsPage() {
  const { t } = useLanguage();
  const [s, setS] = useState<StudySettings | null>(null);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    studyService.settings().then(setS).catch((e) => setError(e instanceof ApiError ? e.message : t('common.error'))).finally(() => setLoading(false));
    deckService.list().then((r) => setDecks(r.data)).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (patch: Partial<StudySettings>) => setS((v) => (v ? { ...v, ...patch } : v));

  const save = async () => {
    if (!s) return;
    setBusy(true); setError(''); setSaved(false);
    try { setS(await studyService.saveSettings(s)); setSaved(true); setTimeout(() => setSaved(false), 2000); }
    catch (e) { setError(e instanceof ApiError ? e.message : t('common.error')); }
    finally { setBusy(false); }
  };

  const inp = 'w-full h-9 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:border-blue-500';
  const hint = 'text-xs text-gray-400 mt-1';
  const secCls = 'rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-4';

  // Öyrənmə rejimi seçici — Telegram və Extension üçün ayrıca istifadə olunur
  const modePicker = (value: 'learning' | 'flashcard', onPick: (m: 'learning' | 'flashcard') => void) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('studyParams.mode')}</label>
      <div className="grid grid-cols-2 gap-2">
        {(['learning', 'flashcard'] as const).map((m) => (
          <button key={m} onClick={() => onPick(m)}
            className={cn('h-16 rounded-xl border text-left px-3 transition', value === m ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : 'border-gray-300 dark:border-gray-700')}>
            <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">{t(`studyParams.mode_${m}`)}</div>
            <div className="text-[11px] text-gray-400">{t(`studyParams.mode_${m}_hint`)}</div>
          </button>
        ))}
      </div>
    </div>
  );

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>;
  if (!s) return <div className="py-16 text-center text-sm text-gray-400">{error || t('common.error')}</div>;

  return (
    <div className="max-w-2xl">
      <PageHeader title={t('studyParams.title')} subtitle={t('studyParams.subtitle')} />
      {error && <div className="mb-4 px-4 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600">{error}</div>}

      <div className="space-y-4">
        {/* Ümumi */}
        <div className={secCls}>
          <div className="flex items-center gap-2"><GraduationCap className="w-5 h-5 text-blue-500" /><h2 className="font-semibold text-gray-800 dark:text-gray-100">{t('studyParams.general')}</h2></div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('studyParams.deck')}</label>
            <select value={s.study_deck_uid ?? ''} onChange={(e) => set({ study_deck_uid: e.target.value || null })} className={inp}>
              <option value="">{t('studyParams.allDue')}</option>
              {decks.map((d) => <option key={d.uid} value={d.uid}>{d.name}</option>)}
            </select>
            <p className={hint}>{t('studyParams.deckHint')}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('studyParams.activeFrom')}</label>
              <input type="time" value={s.active_from} onChange={(e) => set({ active_from: e.target.value })} className={inp} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('studyParams.activeTo')}</label>
              <input type="time" value={s.active_to} onChange={(e) => set({ active_to: e.target.value })} className={inp} />
            </div>
          </div>
          <p className={hint}>{t('studyParams.hoursHint')}</p>
        </div>

        {/* Telegram */}
        <div className={secCls}>
          <div className="flex items-center gap-2"><Send className="w-5 h-5 text-sky-500" /><h2 className="font-semibold text-gray-800 dark:text-gray-100">{t('studyParams.telegram')}</h2></div>
          {modePicker(s.mode, (m) => set({ mode: m }))}
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-gray-700 dark:text-gray-200">{t('studyParams.tgEnabled')}</span>
            <input type="checkbox" checked={s.study_enabled} onChange={(e) => set({ study_enabled: e.target.checked })} className="w-5 h-5 accent-blue-600" />
          </label>
          <p className={hint}>{t('studyParams.tgEnabledHint')}</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('studyParams.tgInterval')}</label>
              <Input type="number" value={String(s.interval_min)} onChange={(e) => set({ interval_min: Number(e.target.value) || 0 })} />
              <p className={hint}>{t('studyParams.tgIntervalHint')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('studyParams.tgCards')}</label>
              <Input type="number" value={String(s.cards_per_push)} onChange={(e) => set({ cards_per_push: Number(e.target.value) || 1 })} />
              <p className={hint}>{t('studyParams.tgCardsHint')}</p>
            </div>
          </div>
        </div>

        {/* Extension */}
        <div className={secCls}>
          <div className="flex items-center gap-2"><Puzzle className="w-5 h-5 text-emerald-500" /><h2 className="font-semibold text-gray-800 dark:text-gray-100">{t('studyParams.extension')}</h2></div>
          {modePicker(s.ext_mode, (m) => set({ ext_mode: m }))}
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-gray-700 dark:text-gray-200">{t('studyParams.extEnabled')}</span>
            <input type="checkbox" checked={s.ext_enabled} onChange={(e) => set({ ext_enabled: e.target.checked })} className="w-5 h-5 accent-blue-600" />
          </label>
          <p className={hint}>{t('studyParams.extEnabledHint')}</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('studyParams.extRotate')}</label>
              <Input type="number" value={String(s.ext_rotate_sec)} onChange={(e) => set({ ext_rotate_sec: Number(e.target.value) || 5 })} />
              <p className={hint}>{t('studyParams.extRotateHint')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('studyParams.extNotifyMin')}</label>
              <Input type="number" value={String(s.ext_notify_min)} onChange={(e) => set({ ext_notify_min: Number(e.target.value) || 1 })} />
              <p className={hint}>{t('studyParams.extNotifyHint')}</p>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={s.ext_notify} onChange={(e) => set({ ext_notify: e.target.checked })} className="w-4 h-4" />
            <span className="text-sm text-gray-700 dark:text-gray-200">{t('studyParams.extNotify')}</span>
          </label>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={save} loading={busy}>{t('common.save')}</Button>
          {saved && <span className="inline-flex items-center gap-1 text-sm text-emerald-600"><Check className="w-4 h-4" /> {t('common.saved')}</span>}
        </div>
      </div>
    </div>
  );
}
