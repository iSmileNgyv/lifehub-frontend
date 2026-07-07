'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { X, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { studyService, deckService, templateService } from '@/services/studyService';
import { fileUrl } from '@/services/fileService';
import Button from '@/components/ui/Button';
import TemplateSideView from '@/components/study/TemplateSideView';
import type { CardTemplate, Rating, StudyCard } from '@/types';

const RATINGS: { key: Rating; cls: string }[] = [
  { key: 'again', cls: 'bg-red-500 hover:bg-red-600' },
  { key: 'hard', cls: 'bg-amber-500 hover:bg-amber-600' },
  { key: 'good', cls: 'bg-green-600 hover:bg-green-700' },
  { key: 'easy', cls: 'bg-blue-600 hover:bg-blue-700' },
];

export default function StudyLearnPage() {
  const { deck } = useParams<{ deck: string }>();
  const router = useRouter();
  const { t } = useLanguage();
  const [queue, setQueue] = useState<StudyCard[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showBack, setShowBack] = useState(false);
  const [answering, setAnswering] = useState(false);
  const [done, setDone] = useState(0);
  const [template, setTemplate] = useState<CardTemplate | null>(null);

  const load = useCallback(() => {
    studyService.queue(deck).then((r) => { setQueue(r.data); setTotal(r.data.length); }).catch(() => {}).finally(() => setLoading(false));
  }, [deck]);
  useEffect(() => { load(); }, [load]);

  // Kolodanın şablonu (varsa) — şablonlu kartları render üçün
  useEffect(() => {
    deckService.list().then((r) => {
      const d = r.data.find((x) => x.uid === deck);
      if (d?.template_uid) templateService.list().then((tr) => setTemplate(tr.data.find((tp) => tp.uid === d.template_uid) ?? null)).catch(() => {});
    }).catch(() => {});
  }, [deck]);

  // Fon skrolunu blokla (tam ekran)
  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = ''; }; }, []);

  const card = queue[0];
  const close = () => router.push(`/study/${deck}`);

  const answer = async (rating: Rating) => {
    if (!card || answering) return;
    setAnswering(true);
    try {
      const r = await studyService.answer(deck, card.uid, rating);
      setQueue((q) => { const rest = q.slice(1); return r.interval === 0 ? [...rest, card] : rest; });
      if (r.interval > 0) setDone((d) => d + 1);
      setShowBack(false);
    } catch { /* ignore */ } finally { setAnswering(false); }
  };

  const fmt = (days: number) => (days === 0 ? t('study.soon') : `${days} ${t('study.day')}`);
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[100] bg-white dark:bg-gray-950 flex flex-col">
      {/* Başlıq */}
      <div className="h-14 shrink-0 flex items-center justify-between px-4">
        <button onClick={close} className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-5 h-5" /></button>
        {card && <span className="text-sm text-gray-400">{queue.length} {t('study.left')}</span>}
      </div>
      <div className="h-1 bg-gray-100 dark:bg-gray-800 shrink-0"><div className="h-full bg-indigo-600 transition-all" style={{ width: `${progress}%` }} /></div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center"><Loader2 className="w-7 h-7 animate-spin text-indigo-600" /></div>
      ) : !card ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-950/40 flex items-center justify-center mb-5"><Check className="w-10 h-10 text-green-600" /></div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{t('study.finished')}</p>
          <p className="text-sm text-gray-400 mt-1">{done} {t('study.reviewed')}</p>
          <Button className="mt-8" onClick={close}>{t('study.backToDeck')}</Button>
        </div>
      ) : (
        <>
          {/* Kart məzmunu — tam ekran */}
          <div
            onClick={() => !showBack && setShowBack(true)}
            className={cn('flex-1 overflow-y-auto px-6 py-8 flex flex-col items-center text-center', showBack ? 'justify-start' : 'justify-center cursor-pointer')}
          >
            {card.fields && template ? (
              <>
                {/* Ön (şablon) — ön-tərəf sahələri böyük */}
                <div className="w-full max-w-4xl flex flex-col items-center">
                  <div className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white text-center whitespace-pre-wrap break-words leading-tight">
                    {template.fields.filter((f) => f.side === 'front' && card.fields![f.key]).map((f) => card.fields![f.key]).join(' · ')}
                  </div>
                </div>
                {/* Arxa (şablon) — grid layout */}
                {showBack && (
                  <div className="w-full max-w-4xl mt-8 pt-8 border-t-2 border-dashed border-gray-200 dark:border-gray-800">
                    <TemplateSideView values={card.fields} template={template} side="back" />
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Ön */}
                <div className="w-full max-w-3xl flex flex-col items-center">
                  {card.front_image && <img src={fileUrl(card.front_image) ?? ''} alt="" className="max-h-[45vh] w-auto max-w-full rounded-2xl mb-6 object-contain" />}
                  {card.front && <div className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white whitespace-pre-wrap break-words leading-tight">{card.front}</div>}
                </div>
                {/* Arxa */}
                {showBack && (
                  <div className="w-full max-w-3xl flex flex-col items-center mt-8 pt-8 border-t-2 border-dashed border-gray-200 dark:border-gray-800">
                    {card.back_image && <img src={fileUrl(card.back_image) ?? ''} alt="" className="max-h-[45vh] w-auto max-w-full rounded-2xl mb-6 object-contain" />}
                    {card.back && <div className="text-2xl sm:text-3xl text-gray-800 dark:text-gray-100 whitespace-pre-wrap break-words leading-snug">{card.back}</div>}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Alt panel */}
          <div className="shrink-0 border-t border-gray-100 dark:border-gray-800 p-4">
            {!showBack ? (
              <button onClick={() => setShowBack(true)} className="w-full max-w-3xl mx-auto flex items-center justify-center h-14 rounded-2xl bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-base font-semibold hover:opacity-90">{t('study.show')}</button>
            ) : (
              <div className="grid grid-cols-4 gap-2 max-w-3xl mx-auto">
                {RATINGS.map(({ key, cls }) => (
                  <button key={key} onClick={() => answer(key)} disabled={answering} className={cn('flex flex-col items-center justify-center h-16 rounded-2xl text-white font-semibold disabled:opacity-60 transition-transform active:scale-95', cls)}>
                    <span className="text-sm">{t(`study.${key}`)}</span>
                    <span className="text-[11px] font-normal opacity-90">{fmt(card.preview[key])}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
