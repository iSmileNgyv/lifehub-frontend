'use client';

import { useEffect, useState } from 'react';
import { ChevronUp, ChevronDown, Copy, Send, Puzzle, ArrowLeftRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { templateService } from '@/services/studyService';
import { cn } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import type { ChannelDisplay, TemplateDisplay, TemplateField } from '@/types';

type Channel = 'telegram' | 'extension';
type Place = 'front' | 'back' | 'hidden';
interface Item { key: string; label: string; type: string; place: Place; inline: boolean }

function buildItems(fields: TemplateField[], ch?: ChannelDisplay): Item[] {
  const byKey = Object.fromEntries(fields.map((f) => [f.key, f]));
  const items: Item[] = [];
  const seen = new Set<string>();
  const push = (rows: string[][] | undefined, place: Place) => (rows ?? []).forEach((row) => {
    const keys = Array.isArray(row) ? row : [row];
    keys.forEach((k, i) => { if (byKey[k]) { items.push({ key: k, label: byKey[k].label, type: byKey[k].type, place, inline: i > 0 }); seen.add(k); } });
  });
  const hasCfg = !!(ch && ((ch.front && ch.front.length) || (ch.back && ch.back.length)));
  push(ch?.front, 'front');
  push(ch?.back, 'back');
  fields.forEach((f) => { if (!seen.has(f.key)) items.push({ key: f.key, label: f.label, type: f.type, place: hasCfg ? 'hidden' : (f.side === 'front' ? 'front' : 'back'), inline: false }); });
  return items;
}

// items → sətirlər (yan-yana): inline olan öncəki sətrə qoşulur
function toRows(items: Item[], place: Place): string[][] {
  const out: string[][] = [];
  items.filter((i) => i.place === place).forEach((it) => {
    if (it.inline && out.length) out[out.length - 1].push(it.key);
    else out.push([it.key]);
  });
  return out;
}
const toChannel = (items: Item[]): ChannelDisplay => ({ front: toRows(items, 'front'), back: toRows(items, 'back') });

export default function TemplateDisplayModal({ fields, value, templateUid, onClose, onSave }: {
  fields: TemplateField[];
  value: TemplateDisplay | null | undefined;
  templateUid: string | null;
  onClose: () => void;
  onSave: (d: TemplateDisplay) => void;
}) {
  const { t } = useLanguage();
  const [tab, setTab] = useState<Channel>('telegram');
  const [tg, setTg] = useState<Item[]>(() => buildItems(fields, value?.telegram));
  const [ext, setExt] = useState<Item[]>(() => buildItems(fields, value?.extension));
  const [sample, setSample] = useState<Record<string, string> | null>(null);
  const [sampleErr, setSampleErr] = useState('');

  useEffect(() => {
    if (!templateUid) { setSampleErr(t('study.sampleNeedsSave')); return; }
    templateService.sample(templateUid).then((r) => setSample(r.fields ?? {})).catch(() => setSampleErr(t('study.sampleNone')));
  }, [templateUid]); // eslint-disable-line react-hooks/exhaustive-deps

  const items = tab === 'telegram' ? tg : ext;
  const setItems = tab === 'telegram' ? setTg : setExt;
  const move = (i: number, d: -1 | 1) => setItems((arr) => { const j = i + d; if (j < 0 || j >= arr.length) return arr; const n = [...arr]; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const setPlace = (i: number, p: Place) => setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, place: p } : it)));
  const toggleInline = (i: number) => setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, inline: !it.inline } : it)));
  const copy = () => { if (tab === 'telegram') setExt(tg.map((x) => ({ ...x }))); else setTg(ext.map((x) => ({ ...x }))); };
  const save = () => onSave({ telegram: toChannel(tg), extension: toChannel(ext) });

  // Önizləmə üçün dəyər (real kart, yoxsa {label})
  const val = (key: string, label: string) => (sample && sample[key] != null && sample[key] !== '' ? sample[key] : `{${label}}`);
  const rowText = (row: string[]) => row.map((k) => { const f = fields.find((x) => x.key === k); return f ? val(k, f.label) : ''; }).filter(Boolean).join('  ·  ');
  const frontRows = toRows(items, 'front');
  const backRows = toRows(items, 'back');

  return (
    <Modal open onClose={onClose} title={t('study.displayTitle')} size="lg"
      footer={<><Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button><Button onClick={save}>{t('common.save')}</Button></>}>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
            {(['telegram', 'extension'] as const).map((c) => (
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Sahələr */}
          <div className="space-y-1.5">
            {items.map((it, i) => (
              <div key={it.key} className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-800 px-2 py-1.5">
                <div className="flex flex-col">
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="text-gray-300 hover:text-gray-600 disabled:opacity-30"><ChevronUp className="w-3.5 h-3.5" /></button>
                  <button onClick={() => move(i, 1)} disabled={i === items.length - 1} className="text-gray-300 hover:text-gray-600 disabled:opacity-30"><ChevronDown className="w-3.5 h-3.5" /></button>
                </div>
                <button onClick={() => toggleInline(i)} title={t('study.inline')}
                  className={cn('shrink-0 w-6 h-6 flex items-center justify-center rounded', it.inline && it.place !== 'hidden' ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-600' : 'text-gray-300 hover:text-gray-500')}>
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                </button>
                <span className="flex-1 min-w-0 truncate text-sm text-gray-800 dark:text-gray-100">{it.label}</span>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button onClick={() => setPlace(i, 'front')} className={cn('px-2 py-0.5 rounded text-[11px] font-medium', it.place === 'front' ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-600' : 'text-gray-400 hover:text-gray-600')}>{t('study.dFront')}</button>
                  <button onClick={() => setPlace(i, 'back')} className={cn('px-2 py-0.5 rounded text-[11px] font-medium', it.place === 'back' ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600' : 'text-gray-400 hover:text-gray-600')}>{t('study.dBack')}</button>
                  <button onClick={() => setPlace(i, 'hidden')} className={cn('px-2 py-0.5 rounded text-[11px] font-medium', it.place === 'hidden' ? 'bg-gray-200 dark:bg-gray-700 text-gray-600' : 'text-gray-400 hover:text-gray-600')}>{t('study.dHidden')}</button>
                </div>
              </div>
            ))}
          </div>

          {/* Önizləmə (real kart) */}
          <div>
            <div className="text-xs text-gray-400 mb-1.5">{t('study.preview')}{sampleErr && <span className="text-amber-600 ml-2">{sampleErr}</span>}</div>
            {tab === 'telegram' ? (
              <div className="rounded-2xl bg-[#e7f3ff] dark:bg-gray-800 p-3 text-sm whitespace-pre-wrap break-words">
                {frontRows.map((r, i) => <div key={i}>{rowText(r) || '—'}</div>)}
                {backRows.length > 0 && <><div className="my-1 text-gray-400">———</div>{backRows.map((r, i) => <div key={i}>{rowText(r)}</div>)}</>}
              </div>
            ) : (
              <div className="rounded-2xl bg-gray-900 text-white p-4 max-w-[280px]">
                {frontRows.map((r, i) => (
                  <div key={i} className="flex flex-wrap gap-x-3 gap-y-0.5 text-lg font-bold leading-tight">
                    {r.map((k) => { const f = fields.find((x) => x.key === k); return <span key={k}>{f ? val(k, f.label) : ''}</span>; })}
                  </div>
                ))}
                {backRows.length > 0 && <div className="mt-2 space-y-0.5">
                  {backRows.map((r, i) => (
                    <div key={i} className="flex flex-wrap gap-x-3 text-sm opacity-90">
                      {r.map((k) => { const f = fields.find((x) => x.key === k); return <span key={k}>{f ? val(k, f.label) : ''}</span>; })}
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
