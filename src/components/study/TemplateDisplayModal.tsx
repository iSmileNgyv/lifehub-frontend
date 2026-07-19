'use client';

import { useEffect, useState } from 'react';
import { Copy, Send, Puzzle, X, GripVertical } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { templateService } from '@/services/studyService';
import { cn } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import type { ChannelDisplay, TemplateDisplay, TemplateField } from '@/types';

type Channel = 'telegram' | 'extension';
type Zone = 'front' | 'back';

/** value/ChannelDisplay → təmiz layout (yalnız mövcud sahələr, boş sətirlər atılır). */
function initLayout(fields: TemplateField[], ch?: ChannelDisplay | null): ChannelDisplay {
  const known = new Set(fields.map((f) => f.key));
  const clean = (rows?: string[][]) =>
    (rows ?? []).map((r) => (Array.isArray(r) ? r : [r]).filter((k) => known.has(k))).filter((r) => r.length);
  if (ch && ((ch.front && ch.front.length) || (ch.back && ch.back.length))) {
    return { front: clean(ch.front), back: clean(ch.back) };
  }
  // Default: template side-inə görə, hərəsi ayrı sətirdə
  return {
    front: fields.filter((f) => f.side === 'front').map((f) => [f.key]),
    back: fields.filter((f) => f.side !== 'front').map((f) => [f.key]),
  };
}

const keysOf = (l: ChannelDisplay) => [...l.front.flat(), ...l.back.flat()];

/** key-i hər iki zonadan çıxar, boş sətirləri təmizlə. */
function removeKey(l: ChannelDisplay, key: string): ChannelDisplay {
  const strip = (rows: string[][]) => rows.map((r) => r.filter((k) => k !== key)).filter((r) => r.length);
  return { front: strip(l.front), back: strip(l.back) };
}

export default function TemplateDisplayModal({ fields, value, templateUid, onClose, onSave }: {
  fields: TemplateField[];
  value: TemplateDisplay | null | undefined;
  templateUid: string | null;
  onClose: () => void;
  onSave: (d: TemplateDisplay) => void;
}) {
  const { t } = useLanguage();
  const [tab, setTab] = useState<Channel>('extension');
  const [tg, setTg] = useState<ChannelDisplay>(() => initLayout(fields, value?.telegram));
  const [ext, setExt] = useState<ChannelDisplay>(() => initLayout(fields, value?.extension));
  const [sample, setSample] = useState<Record<string, string> | null>(null);
  const [sampleErr, setSampleErr] = useState('');
  const [drag, setDrag] = useState<string | null>(null);

  useEffect(() => {
    if (!templateUid) { setSampleErr(t('study.sampleNeedsSave')); return; }
    templateService.sample(templateUid).then((r) => setSample(r.fields ?? {})).catch(() => setSampleErr(t('study.sampleNone')));
  }, [templateUid]); // eslint-disable-line react-hooks/exhaustive-deps

  const byKey = Object.fromEntries(fields.map((f) => [f.key, f]));
  const layout = tab === 'telegram' ? tg : ext;
  const setLayout = tab === 'telegram' ? setTg : setExt;
  const hidden = fields.filter((f) => !keysOf(layout).includes(f.key));

  // key-i zonaya / sətrə yerləşdir (rowIdx='new' → yeni sətir; number → o sətrə yan-yana)
  const place = (zone: Zone, rowIdx: number | 'new', key: string) => setLayout((l) => {
    const base = removeKey(l, key);
    const rows = [...(zone === 'front' ? base.front : base.back)];
    if (rowIdx === 'new' || rowIdx >= rows.length) rows.push([key]);
    else rows[rowIdx] = [...rows[rowIdx], key];
    return zone === 'front' ? { ...base, front: rows } : { ...base, back: rows };
  });
  const unplace = (key: string) => setLayout((l) => removeKey(l, key));
  const copy = () => {
    if (tab === 'telegram') setExt({ front: tg.front.map((r) => [...r]), back: tg.back.map((r) => [...r]) });
    else setTg({ front: ext.front.map((r) => [...r]), back: ext.back.map((r) => [...r]) });
  };
  const save = () => onSave({ telegram: tg, extension: ext });

  const allow = (e: React.DragEvent) => { e.preventDefault(); };
  const dropTo = (e: React.DragEvent, zone: Zone, rowIdx: number | 'new') => { e.preventDefault(); e.stopPropagation(); if (drag) place(zone, rowIdx, drag); setDrag(null); };
  const dropHide = (e: React.DragEvent) => { e.preventDefault(); if (drag) unplace(drag); setDrag(null); };

  // Preview üçün dəyər (real kart, yoxsa {label})
  const val = (key: string, label: string) => (sample && sample[key] != null && sample[key] !== '' ? sample[key] : `{${label}}`);

  const Chip = ({ k, onX }: { k: string; onX?: () => void }) => {
    const f = byKey[k];
    return (
      <span draggable onDragStart={() => setDrag(k)} onDragEnd={() => setDrag(null)}
        className={cn('inline-flex items-center gap-1 pl-1.5 pr-1 py-1 rounded-md border bg-white dark:bg-gray-900 text-sm cursor-grab active:cursor-grabbing select-none',
          drag === k ? 'opacity-40 border-blue-400' : 'border-gray-300 dark:border-gray-700')}>
        <GripVertical className="w-3.5 h-3.5 text-gray-300" />
        <span className="truncate max-w-[120px]">{f?.label ?? k}</span>
        {onX && <button onClick={onX} className="text-gray-300 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>}
      </span>
    );
  };

  const ZoneEditor = ({ zone, title, color }: { zone: Zone; title: string; color: string }) => {
    const rows = zone === 'front' ? layout.front : layout.back;
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-2 space-y-1.5">
        <div className={cn('text-[11px] font-semibold uppercase tracking-wide', color)}>{title}</div>
        {rows.length === 0 && (
          <div onDragOver={allow} onDrop={(e) => dropTo(e, zone, 'new')}
            className="text-xs text-gray-400 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg py-3 text-center">
            {t('study.emptyZone')}
          </div>
        )}
        {rows.map((row, ri) => (
          <div key={ri} onDragOver={allow} onDrop={(e) => dropTo(e, zone, ri)}
            className="flex flex-wrap items-center gap-1.5 min-h-[38px] rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-1.5">
            {row.map((k) => <Chip key={k} k={k} onX={() => unplace(k)} />)}
          </div>
        ))}
        <div onDragOver={allow} onDrop={(e) => dropTo(e, zone, 'new')}
          className="text-xs text-gray-400 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg py-1.5 text-center hover:border-blue-400 hover:text-blue-500">
          {t('study.newRow')}
        </div>
      </div>
    );
  };

  return (
    <Modal open onClose={onClose} title={t('study.displayTitle')} size="xl"
      footer={<><Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button><Button onClick={save}>{t('common.save')}</Button></>}>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
            {(['extension', 'telegram'] as const).map((c) => (
              <button key={c} onClick={() => setTab(c)} className={cn('flex items-center gap-1.5 px-3 h-8 rounded-md text-sm font-medium', tab === c ? 'bg-white dark:bg-gray-900 text-blue-600 shadow-sm' : 'text-gray-500')}>
                {c === 'telegram' ? <Send className="w-4 h-4" /> : <Puzzle className="w-4 h-4" />} {t(`study.channel_${c}`)}
              </button>
            ))}
          </div>
          <button onClick={copy} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 ml-auto">
            <Copy className="w-4 h-4" /> {tab === 'telegram' ? t('study.copyTgToExt') : t('study.copyExtToTg')}
          </button>
        </div>
        <p className="text-xs text-gray-400">{t('study.displayHint2')}</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Redaktor: zonalar + gizli hovuz */}
          <div className="space-y-2">
            <ZoneEditor zone="front" title={t('study.dFront')} color="text-blue-600" />
            <ZoneEditor zone="back" title={t('study.dBack')} color="text-emerald-600" />
            <div onDragOver={allow} onDrop={dropHide}
              className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-2">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">{t('study.hiddenFields')}</div>
              <div className="flex flex-wrap gap-1.5 min-h-[30px]">
                {hidden.length === 0 ? <span className="text-xs text-gray-300 py-1">—</span> : hidden.map((f) => <Chip key={f.key} k={f.key} />)}
              </div>
            </div>
          </div>

          {/* Önizləmə (real kart) */}
          <div>
            <div className="text-xs text-gray-400 mb-1.5">{t('study.preview')}{sampleErr && <span className="text-amber-600 ml-2">{sampleErr}</span>}</div>
            {tab === 'telegram' ? (
              <div className="rounded-2xl bg-[#e7f3ff] dark:bg-gray-800 p-3 text-sm whitespace-pre-wrap break-words">
                {layout.front.map((r, i) => <div key={i}>{r.map((k) => val(k, byKey[k]?.label ?? k)).join('  ·  ') || '—'}</div>)}
                {layout.back.length > 0 && <><div className="my-1 text-gray-400">———</div>{layout.back.map((r, i) => <div key={i}>{r.map((k) => val(k, byKey[k]?.label ?? k)).join('  ·  ')}</div>)}</>}
              </div>
            ) : (
              <div className="rounded-2xl bg-gray-900 text-white p-4 max-w-[320px]">
                {layout.front.map((r, i) => (
                  <div key={i} className="flex flex-wrap gap-x-3 gap-y-0.5 text-lg font-bold leading-tight">
                    {r.map((k) => <span key={k}>{val(k, byKey[k]?.label ?? k)}</span>)}
                  </div>
                ))}
                {layout.back.length > 0 && <div className="mt-2 space-y-0.5">
                  {layout.back.map((r, i) => (
                    <div key={i} className="flex flex-wrap gap-x-3 text-sm opacity-90">
                      {r.map((k) => <span key={k}>{val(k, byKey[k]?.label ?? k)}</span>)}
                    </div>
                  ))}
                </div>}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
