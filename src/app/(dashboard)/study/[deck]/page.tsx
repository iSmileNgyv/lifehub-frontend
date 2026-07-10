'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, X, Plus, Play, Pencil, Trash2, ImagePlus, Upload, Search, Eye, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { cardService, deckService, templateService, aiService } from '@/services/studyService';
import { fileService } from '@/services/fileService';
import { ApiError } from '@/lib/api';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { EntityImage } from '@/components/ui/EntityImage';
import { RichInput, RichView } from '@/components/study/RichText';
import TemplateSideView from '@/components/study/TemplateSideView';
import type { AiBulkResult } from '@/services/studyService';
import type { Card, CardTemplate, TemplateField } from '@/types';

export default function DeckCardsPage() {
  const { deck } = useParams<{ deck: string }>();
  const router = useRouter();
  const { t } = useLanguage();
  const { can } = useAuth();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [form, setForm] = useState<Card | 'new' | null>(null);
  const [del, setDel] = useState<Card | null>(null);
  const [previewCard, setPreviewCard] = useState<Card | null>(null);
  const [template, setTemplate] = useState<CardTemplate | null>(null);
  const [bulkAi, setBulkAi] = useState(false);
  const [confirmFill, setConfirmFill] = useState(false);
  const [fillState, setFillState] = useState<{ done: number; total: number } | null>(null);

  const load = useCallback(() => { setLoading(true); cardService.list(deck).then((r) => setCards(r.data)).catch((e) => setError(e instanceof ApiError ? e.message : '')).finally(() => setLoading(false)); }, [deck]);
  useEffect(() => { load(); }, [load]);

  // Kolodanın şablonunu tap (varsa) → dinamik forma/görünüş üçün
  useEffect(() => {
    deckService.list().then((r) => {
      const d = r.data.find((x) => x.uid === deck);
      if (d?.template_uid) {
        templateService.list().then((tr) => setTemplate(tr.data.find((tp) => tp.uid === d.template_uid) ?? null)).catch(() => {});
      } else setTemplate(null);
    }).catch(() => {});
  }, [deck]);

  const doDelete = async () => {
    if (!del) return;
    try { await cardService.remove(deck, del.uid); setDel(null); load(); }
    catch (e) { setError(e instanceof ApiError ? e.message : t('common.error')); }
  };

  // Deck-də bütün kartların BOŞ sahələrini AI ilə doldur (doldurulmuşa toxunmur)
  const runFillBlanksAll = async () => {
    setConfirmFill(false);
    if (!template) return;
    const aiKeys = template.fields.filter((f) => ['text', 'textarea', 'rich'].includes(f.type)).map((f) => f.key);
    const frontKey = template.fields.find((f) => f.side === 'front' && ['text', 'textarea', 'rich'].includes(f.type))?.key;
    if (!frontKey) { setError(t('common.error')); return; }
    const emptyOf = (c: Card) => aiKeys.filter((k) => !String(c.fields?.[k] ?? '').trim());
    const targets = cards.filter((c) => c.fields && String(c.fields[frontKey] ?? '').trim() && emptyOf(c).length);
    if (!targets.length) { setError(t('study.noBlanks')); return; }
    const only = Array.from(new Set(targets.flatMap(emptyOf)));
    const byWord = new Map<string, Card>();
    targets.forEach((c) => byWord.set(String(c.fields![frontKey]).trim(), c));
    const words = Array.from(byWord.keys());

    setError(''); setFillState({ done: 0, total: targets.length });
    let done = 0;
    try {
      for (let i = 0; i < words.length; i += 40) {
        const chunk = words.slice(i, i + 40);
        const r = await aiService.generateBulk(template.uid, chunk, only);
        for (const res of r.results) {
          const c = byWord.get(res.word);
          if (!c || !res.fields) continue;
          const merged = { ...(c.fields ?? {}) };
          let changed = false;
          for (const k of emptyOf(c)) { const v = res.fields[k]; if (v != null && v !== '') { merged[k] = v; changed = true; } }
          if (changed) { await cardService.update(deck, c.uid, { fields: merged }); }
          done++; setFillState({ done, total: targets.length });
        }
      }
    } catch (e) { setError(e instanceof ApiError ? e.message : t('common.error')); }
    finally { setFillState(null); load(); }
  };

  return (
    <div>
      <button onClick={() => router.push('/study')} className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"><ArrowLeft className="w-4 h-4" /> {t('study.title')}</button>
      <PageHeader title={t('study.cards')} subtitle={`${cards.length}`}
        actions={<div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push(`/study/${deck}/learn`)}><Play className="w-4 h-4 mr-1" /> {t('study.study')}</Button>
          {template && can('STUDY_CREATE') && <Button variant="outline" onClick={() => setBulkAi(true)}><Sparkles className="w-4 h-4 mr-1" /> {t('study.aiBulk')}</Button>}
          {template && can('STUDY_UPDATE') && cards.length > 0 && (
            <Button variant="outline" onClick={() => setConfirmFill(true)} loading={!!fillState}>
              <Sparkles className="w-4 h-4 mr-1" /> {fillState ? `${fillState.done}/${fillState.total}` : t('study.aiFillBlanksAll')}
            </Button>
          )}
          {can('STUDY_CREATE') && <Button onClick={() => setForm('new')}><Plus className="w-4 h-4 mr-1" /> {t('study.newCard')}</Button>}
        </div>} />
      {error && <div className="mb-4 flex items-center justify-between px-4 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600">{error}<button onClick={() => setError('')}><X className="w-4 h-4" /></button></div>}

      <div className="relative max-w-xs mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('study.searchCards')} className="w-full h-9 pl-9 pr-4 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm outline-none focus:ring-1 focus:ring-blue-500" />
      </div>

      {(() => { const q = query.trim().toLowerCase(); const strip = (s: string) => (s || '').replace(/<[^>]*>/g, ' '); const hay = (c: Card) => strip([c.front ?? '', c.back ?? '', ...Object.values(c.fields ?? {})].join(' ')).toLowerCase(); const shown = q ? cards.filter((c) => hay(c).includes(q)) : cards; return (
      loading ? <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
        : shown.length === 0 ? <div className="py-16 text-center text-sm text-gray-400">{t('study.noCards')}</div>
          : (
            <div className="space-y-2">
              {shown.map((c) => (
                <div key={c.uid} className="group flex items-start gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3">
                  {c.front_image && <EntityImage uid={c.front_image} initial="?" className="w-12 h-12 rounded-lg shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">{c.fields ? (() => {
                      const strip = (s: string) => (s || '').replace(/<[^>]*>/g, '');
                      const lf = (template?.fields.filter((f) => f.list) ?? []).filter((f) => c.fields![f.key]);
                      const parts = lf.length ? lf.map((f) => c.fields![f.key]) : [Object.values(c.fields).find((v) => v) ?? '—'];
                      return strip(parts.join('  ·  '));
                    })() : c.front}</p>
                    <p className="text-xs text-gray-400 line-clamp-1">{c.fields ? `${Object.values(c.fields).filter((v) => v).length} ${t('study.fieldCount')}` : c.back}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 uppercase shrink-0">{c.state}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setPreviewCard(c)} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-green-500" title={t('common.view')}><Eye className="w-4 h-4" /></button>
                    {can('STUDY_UPDATE') && (
                      <button onClick={() => setForm(c)} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600" title={t('common.edit')}><Pencil className="w-4 h-4" /></button>
                    )}
                    {can('STUDY_DELETE') && (
                      <button onClick={() => setDel(c)} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500" title={t('common.delete')}><Trash2 className="w-4 h-4" /></button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
      ); })()}

      {form && (template
        ? <TemplateCardForm deck={deck} template={template} card={form === 'new' ? null : form} onClose={() => setForm(null)} onSaved={() => { setForm(null); load(); }} />
        : <CardForm deck={deck} card={form === 'new' ? null : form} onClose={() => setForm(null)} onSaved={() => { setForm(null); load(); }} />)}
      {bulkAi && template && <BulkAiModal deck={deck} template={template} onClose={() => setBulkAi(false)} onDone={() => { setBulkAi(false); load(); }} />}
      {previewCard && <CardPreviewModal card={previewCard} template={template} onClose={() => setPreviewCard(null)} />}
      <ConfirmDialog open={!!del} message={del ? t('study.deleteCardWarn') : ''} onConfirm={doDelete} onCancel={() => setDel(null)} />
      <ConfirmDialog open={confirmFill} message={t('study.aiFillBlanksAllConfirm')} onConfirm={runFillBlanksAll} onCancel={() => setConfirmFill(false)} />
    </div>
  );
}

function ImageField({ value, onChange, label }: { value: string | null; onChange: (uid: string | null) => void; label: string }) {
  const { t } = useLanguage();
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const handle = async (file: File) => {
    setPreview(URL.createObjectURL(file)); setUploading(true); setProgress(0);
    try { const r = await fileService.upload(file, setProgress); onChange(r.uid); } catch { setPreview(null); } finally { setUploading(false); }
  };

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => !uploading && fileRef.current?.click()} className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-400 shrink-0">
        {preview ? <img src={preview} alt="" className="w-full h-full object-cover" /> : value ? <EntityImage uid={value} initial="?" className="w-full h-full" /> : <div className="w-full h-full flex items-center justify-center text-gray-400"><ImagePlus className="w-5 h-5" /></div>}
        {uploading && <div className="absolute inset-0 bg-black/55 flex items-center justify-center text-white text-xs"><Upload className="w-4 h-4 animate-pulse" /></div>}
      </button>
      <span className="text-xs text-gray-400">{label}</span>
      {value && !uploading && <button type="button" onClick={() => { onChange(null); setPreview(null); }} className="text-xs text-red-500">{t('common.delete')}</button>}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handle(f); e.target.value = ''; }} />
    </div>
  );
}

function TemplateCardForm({ deck, template, card, onClose, onSaved }: { deck: string; template: CardTemplate; card: Card | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useLanguage();
  const [values, setValues] = useState<Record<string, string>>(() => ({ ...(card?.fields ?? {}) }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  // AI-nın dolduracağı mətn sahələri; söz mənbəyi = ön sahə
  const aiKeys = template.fields.filter((f) => ['text', 'textarea', 'rich'].includes(f.type)).map((f) => f.key);
  const frontKey = template.fields.find((f) => f.side === 'front' && ['text', 'textarea', 'rich'].includes(f.type))?.key;
  const [aiWord, setAiWord] = useState(() => (frontKey ? String(card?.fields?.[frontKey] ?? '') : ''));
  const [aiLoading, setAiLoading] = useState<false | 'all' | 'blanks'>(false);
  const [aiError, setAiError] = useState('');

  const set = (key: string, v: string) => setValues((s) => ({ ...s, [key]: v }));

  // Bütün sahələri doldur (mövcudları da əvəz edir)
  const aiFill = async () => {
    if (!aiWord.trim()) return;
    setAiLoading('all'); setAiError('');
    try {
      const r = await aiService.generate(template.uid, aiWord.trim());
      setValues((v) => ({ ...v, ...r.fields }));
    } catch (e) { setAiError(e instanceof ApiError ? e.message : t('common.error')); }
    finally { setAiLoading(false); }
  };

  // Yalnız boş sahələri doldur (doldurulmuşlara toxunmur) — şablona yeni sahə əlavə edəndə
  const fillBlanks = async () => {
    if (!aiWord.trim()) return;
    const empty = aiKeys.filter((k) => !String(values[k] ?? '').trim());
    if (!empty.length) { setAiError(t('study.noBlanks')); return; }
    setAiLoading('blanks'); setAiError('');
    try {
      const r = await aiService.generate(template.uid, aiWord.trim(), empty);
      setValues((v) => {
        const nv = { ...v };
        for (const k of empty) { const val = r.fields[k]; if (val != null && val !== '') nv[k] = val; }
        return nv;
      });
    } catch (e) { setAiError(e instanceof ApiError ? e.message : t('common.error')); }
    finally { setAiLoading(false); }
  };

  const sections: { name: string; fields: TemplateField[] }[] = [];
  for (const f of template.fields) {
    if (f.type === 'heading') continue; // statik başlıq — doldurulmur
    const name = f.section || '';
    let sec = sections.find((s) => s.name === name);
    if (!sec) { sec = { name, fields: [] }; sections.push(sec); }
    sec.fields.push(f);
  }

  const submit = async () => {
    const fields: Record<string, string> = {};
    for (const f of template.fields) { const v = values[f.key]; if (v && String(v).trim()) fields[f.key] = String(v).trim(); }
    if (Object.keys(fields).length === 0) { setError(t('study.needFields')); return; }
    setSaving(true); setError('');
    try {
      if (card) await cardService.update(deck, card.uid, { fields });
      else await cardService.create(deck, { fields });
      onSaved();
    } catch (e) { setError(e instanceof ApiError ? e.message : t('common.error')); }
    finally { setSaving(false); }
  };

  const inp = 'w-full h-9 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:border-violet-500';
  const ta = 'w-full min-h-[70px] px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:border-violet-500 resize-y';

  return (
    <Modal open onClose={() => !saving && onClose()} title={`${card ? t('common.edit') : t('study.newCard')} · ${template.name}`} size="lg"
      footer={<><Button variant="outline" onClick={onClose} disabled={saving}>{t('common.cancel')}</Button><Button onClick={submit} loading={saving}>{t('common.save')}</Button></>}>
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {error && <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600">{error}</div>}

        <div className="rounded-xl border border-violet-200 dark:border-violet-900 bg-violet-50/50 dark:bg-violet-950/20 p-3">
          <p className="text-xs font-medium text-violet-700 dark:text-violet-300 mb-1.5 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> {t('study.aiFill')}</p>
          <div className="flex flex-wrap gap-2">
            <input value={aiWord} onChange={(e) => setAiWord(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); fillBlanks(); } }}
              placeholder={t('study.aiWordPlaceholder')} className="flex-1 min-w-[140px] h-9 px-3 rounded-lg border border-violet-200 dark:border-violet-800 bg-white dark:bg-gray-900 text-sm outline-none focus:border-violet-500" />
            <Button variant="outline" onClick={fillBlanks} loading={aiLoading === 'blanks'} disabled={aiLoading === 'all'}><Sparkles className="w-4 h-4 mr-1" /> {t('study.aiFillBlanks')}</Button>
            <Button variant="outline" onClick={aiFill} loading={aiLoading === 'all'} disabled={aiLoading === 'blanks'}>{t('study.aiGenerate')}</Button>
          </div>
          <p className="mt-1.5 text-[11px] text-violet-600/70 dark:text-violet-300/60">{t('study.aiFillBlanksHint')}</p>
          {aiError && <p className="mt-1.5 text-xs text-red-500">{aiError}</p>}
        </div>

        {sections.map((sec) => (
          <div key={sec.name} className="space-y-2.5">
            {sec.name && <p className="text-xs font-semibold uppercase tracking-wide text-violet-600 pt-1">{sec.name}</p>}
            {sec.fields.map((f) => (
              <div key={f.key} className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {f.label}
                  <span className="ml-1 text-[10px] font-normal text-gray-400">({f.side === 'front' ? t('study.sideFront') : t('study.sideBack')})</span>
                </label>
                {f.description && <p className="text-xs text-gray-400">{f.description}</p>}
                {f.type === 'image'
                  ? <ImageField value={values[f.key] || null} onChange={(uid) => set(f.key, uid ?? '')} label={f.label} />
                  : f.type === 'rich'
                    ? <RichInput value={values[f.key] ?? ''} onChange={(html) => set(f.key, html)} />
                    : f.type === 'textarea'
                      ? <textarea value={values[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} className={ta} />
                      : <input value={values[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} className={inp} />}
              </div>
            ))}
          </div>
        ))}
      </div>
    </Modal>
  );
}

function CardForm({ deck, card, onClose, onSaved }: { deck: string; card: Card | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useLanguage();
  const [front, setFront] = useState(card?.front ?? '');
  const [back, setBack] = useState(card?.back ?? '');
  const [frontImage, setFrontImage] = useState<string | null>(card?.front_image ?? null);
  const [backImage, setBackImage] = useState<string | null>(card?.back_image ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if ((!front.trim() && !frontImage) || (!back.trim() && !backImage)) { setError(t('study.needFrontBack')); return; }
    setSaving(true); setError('');
    const data = { front: front.trim(), back: back.trim(), front_image: frontImage, back_image: backImage };
    try {
      if (card) await cardService.update(deck, card.uid, data);
      else await cardService.create(deck, data);
      onSaved();
    } catch (e) { setError(e instanceof ApiError ? e.message : t('common.error')); }
    finally { setSaving(false); }
  };

  const ta = 'w-full min-h-[90px] px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:border-blue-500 resize-y';

  return (
    <Modal open onClose={() => !saving && onClose()} title={card ? t('common.edit') : t('study.newCard')} size="lg"
      footer={<><Button variant="outline" onClick={onClose} disabled={saving}>{t('common.cancel')}</Button><Button onClick={submit} loading={saving}>{t('common.save')}</Button></>}>
      <div className="space-y-4">
        {error && <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600">{error}</div>}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('study.front')}</label>
          <textarea value={front} onChange={(e) => setFront(e.target.value)} className={ta} placeholder={t('study.frontPlaceholder')} />
          <ImageField value={frontImage} onChange={setFrontImage} label={t('study.frontImage')} />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('study.back')}</label>
          <textarea value={back} onChange={(e) => setBack(e.target.value)} className={ta} placeholder={t('study.backPlaceholder')} />
          <ImageField value={backImage} onChange={setBackImage} label={t('study.backImage')} />
        </div>
      </div>
    </Modal>
  );
}

function CardPreviewModal({ card, template, onClose }: { card: Card; template: CardTemplate | null; onClose: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="fixed inset-0 z-[110] bg-white dark:bg-gray-950 flex flex-col">
      <div className="h-14 shrink-0 flex items-center justify-between px-4 border-b border-gray-100 dark:border-gray-800">
        <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-5 h-5" /></button>
        <span className="text-sm font-medium text-gray-500">{t('common.view')}</span>
        <div className="w-9" />
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col items-center justify-start">
        {card.fields && template
          ? <TemplateCardView card={card} template={template} />
          : (
            <div className="w-full max-w-3xl flex flex-col items-center text-center">
              <div className="flex flex-col items-center">
                {card.front_image && <EntityImage uid={card.front_image} initial="?" className="max-h-[45vh] w-auto max-w-full rounded-2xl mb-6 object-contain" />}
                {card.front && <div className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white whitespace-pre-wrap break-words leading-tight">{card.front}</div>}
              </div>
              <div className="w-full flex flex-col items-center mt-8 pt-8 border-t-2 border-dashed border-gray-200 dark:border-gray-800">
                {card.back_image && <EntityImage uid={card.back_image} initial="?" className="max-h-[45vh] w-auto max-w-full rounded-2xl mb-6 object-contain" />}
                {card.back && <div className="text-2xl sm:text-3xl text-gray-800 dark:text-gray-100 whitespace-pre-wrap break-words leading-snug">{card.back}</div>}
              </div>
            </div>
          )}
      </div>
    </div>
  );
}

// Kətan layout görünüşü — sahələr x/y/w/h grid mövqelərində (TemplateSideView vasitəsilə)
function GridCardView({ card, template }: { card: Card; template: CardTemplate }) {
  const values = card.fields ?? {};
  const hasBack = template.fields.some((f) => f.side === 'back' && (f.type === 'heading' || values[f.key]));
  return (
    <div className="w-full max-w-4xl">
      <TemplateSideView values={values} template={template} side="front" />
      {hasBack && <div className="mt-6 pt-6 border-t-2 border-dashed border-gray-200 dark:border-gray-800"><TemplateSideView values={values} template={template} side="back" /></div>}
    </div>
  );
}

function BulkAiModal({ deck, template, onClose, onDone }: { deck: string; template: CardTemplate; onClose: () => void; onDone: () => void }) {
  const { t } = useLanguage();
  const [text, setText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState<AiBulkResult[] | null>(null);
  const [error, setError] = useState('');

  const generate = async () => {
    const words = text.split('\n').map((w) => w.trim()).filter(Boolean);
    if (!words.length) return;
    setGenerating(true); setError('');
    try { const r = await aiService.generateBulk(template.uid, words); setResults(r.results); }
    catch (e) { setError(e instanceof ApiError ? e.message : t('common.error')); }
    finally { setGenerating(false); }
  };

  const saveAll = async () => {
    if (!results) return;
    setSaving(true); setError('');
    try {
      for (const r of results) {
        if (!r.error && Object.keys(r.fields).length) await cardService.create(deck, { fields: r.fields });
      }
      onDone();
    } catch (e) { setError(e instanceof ApiError ? e.message : t('common.error')); }
    finally { setSaving(false); }
  };

  const okCount = results ? results.filter((r) => !r.error && Object.keys(r.fields).length).length : 0;

  return (
    <Modal open onClose={() => !generating && !saving && onClose()} title={`${t('study.aiBulk')} · ${template.name}`} size="lg"
      footer={results
        ? <><Button variant="outline" onClick={() => setResults(null)} disabled={saving}>{t('common.back')}</Button><Button onClick={saveAll} loading={saving} disabled={okCount === 0}>{t('study.aiSaveAll')} ({okCount})</Button></>
        : <><Button variant="outline" onClick={onClose} disabled={generating}>{t('common.cancel')}</Button><Button onClick={generate} loading={generating}><Sparkles className="w-4 h-4 mr-1" /> {t('study.aiGenerate')}</Button></>}>
      <div className="space-y-3">
        {error && <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600">{error}</div>}
        {!results ? (
          <>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('study.aiBulkHint')}</p>
            <textarea value={text} onChange={(e) => setText(e.target.value)}
              className="w-full min-h-[220px] px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:border-violet-500 resize-y"
              placeholder={t('study.aiBulkPlaceholder')} />
          </>
        ) : (
          <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
            {results.map((r, i) => (
              <div key={i} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800">
                <span className="font-medium text-gray-900 dark:text-white truncate">{r.word}</span>
                {r.error
                  ? <span className="text-xs text-red-500 shrink-0">{r.error}</span>
                  : <span className="text-xs text-green-600 shrink-0">{Object.keys(r.fields).length} {t('study.fieldCount')} ✓</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

// Şablonlu kartın görünüşü: ön sahələr (böyük prompt) + arxa sahələr (bölmələrə görə cədvəl)
export function TemplateCardView({ card, template }: { card: Card; template: CardTemplate }) {
  const values = card.fields ?? {};
  // Kətan layout (x/y/w/h) varsa grid ilə render; yoxsa köhnə bölmə axını
  if (template.fields.some((f) => f.x != null)) return <GridCardView card={card} template={template} />;
  const frontFields = template.fields.filter((f) => f.side === 'front' && values[f.key]);
  const backFields = template.fields.filter((f) => f.side === 'back' && values[f.key]);
  const sections: { name: string; fields: TemplateField[] }[] = [];
  for (const f of backFields) {
    const name = f.section || '';
    let sec = sections.find((s) => s.name === name);
    if (!sec) { sec = { name, fields: [] }; sections.push(sec); }
    sec.fields.push(f);
  }
  const render = (f: TemplateField) =>
    f.type === 'image'
      ? <EntityImage uid={values[f.key]} initial="?" className="max-h-40 w-auto rounded-xl object-contain" />
      : f.type === 'rich'
        ? <RichView html={values[f.key]} className="whitespace-pre-wrap break-words" />
        : <span className="whitespace-pre-wrap break-words">{values[f.key]}</span>;

  return (
    <div className="w-full max-w-3xl">
      <div className="text-center flex flex-col items-center gap-1">
        {frontFields.map((f) => (
          <div key={f.key} className={f.type === 'image' ? 'mb-2' : 'text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white'}>{render(f)}</div>
        ))}
      </div>
      <div className="mt-8 pt-6 border-t-2 border-dashed border-gray-200 dark:border-gray-800 space-y-5">
        {sections.map((sec) => (
          <div key={sec.name}>
            {sec.name && <p className="text-xs font-semibold uppercase tracking-wide text-violet-600 mb-2">{sec.name}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              {sec.fields.map((f) => (
                <div key={f.key} className="flex justify-between gap-3 border-b border-gray-100 dark:border-gray-800 py-1.5">
                  <span className="text-sm text-gray-500 dark:text-gray-400">{f.label}</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 text-right">{render(f)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
