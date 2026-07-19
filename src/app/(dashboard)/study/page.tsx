'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Loader2, X, Layers, Play, Pencil, Trash2, FileText, Share2, Download, RefreshCw, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { deckService, deckShareService, templateService } from '@/services/studyService';
import { ApiError } from '@/lib/api';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import type { Deck, CardTemplate } from '@/types';

export default function StudyPage() {
  const { t } = useLanguage();
  const { can } = useAuth();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState<Deck | 'new' | null>(null);
  const [del, setDel] = useState<Deck | null>(null);
  const [share, setShare] = useState<Deck | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [pulling, setPulling] = useState<string | null>(null);

  const load = () => { setLoading(true); deckService.list().then((r) => setDecks(r.data)).catch((e) => setError(e instanceof ApiError ? e.message : '')).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const doPull = async (d: Deck) => {
    setPulling(d.uid); setError('');
    try { await deckShareService.pull(d.uid); load(); }
    catch (e) { setError(e instanceof ApiError ? e.message : t('common.error')); }
    finally { setPulling(null); }
  };

  const doDelete = async () => {
    if (!del) return;
    try { await deckService.remove(del.uid); setDel(null); load(); }
    catch (e) { setError(e instanceof ApiError ? e.message : t('common.error')); }
  };

  return (
    <div>
      <PageHeader title={t('study.title')} subtitle={t('study.subtitle')} actions={
        <div className="flex gap-2">
          <Link href="/study/templates"><Button variant="outline"><FileText className="w-4 h-4 mr-1" /> {t('study.templatesTitle')}</Button></Link>
          {can('STUDY_CREATE') && <Button variant="outline" onClick={() => setImportOpen(true)}><Download className="w-4 h-4 mr-1" /> {t('study.importDeck')}</Button>}
          {can('STUDY_CREATE') && <Button onClick={() => setForm('new')}><Plus className="w-4 h-4 mr-1" /> {t('study.newDeck')}</Button>}
        </div>
      } />
      {error && <div className="mb-4 flex items-center justify-between px-4 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600">{error}<button onClick={() => setError('')}><X className="w-4 h-4" /></button></div>}

      {loading ? <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
        : decks.length === 0 ? <div className="py-16 text-center text-sm text-gray-400">{t('study.empty')}</div>
          : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {decks.map((d) => (
                <div key={d.uid} className="group rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 hover:shadow-lg transition-all">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center shrink-0"><Layers className="w-6 h-6 text-indigo-600" /></div>
                    <Link href={`/study/${d.uid}`} className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 dark:text-white truncate hover:text-indigo-600 flex items-center gap-1.5">
                        <span className="truncate">{d.name}</span>
                        {d.imported && <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">{t('study.importedBadge')}</span>}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{d.description || `${d.cards_total} ${t('study.cards')}`}</p>
                    </Link>
                    {can('STUDY_UPDATE') && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                        <button onClick={() => setShare(d)} title={t('study.shareDeck')} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-indigo-600"><Share2 className="w-4 h-4" /></button>
                        <button onClick={() => setForm(d)} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
                        {can('STUDY_DELETE') && <button onClick={() => setDel(d)} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-sm">
                      <span className={cn('font-semibold', d.due_count > 0 ? 'text-orange-600' : 'text-gray-400')}>{d.due_count} {t('study.due')}</span>
                      <span className="text-gray-400">{d.cards_total} {t('study.cards')}</span>
                    </div>
                    {d.imported && d.pending_updates > 0 && can('STUDY_UPDATE') ? (
                      <button onClick={() => doPull(d)} disabled={pulling === d.uid} title={`${d.pending_updates} ${t('study.newCardsAvail')}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60">
                        {pulling === d.uid ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} {t('study.updateDeck')} ({d.pending_updates})
                      </button>
                    ) : (
                      <Link href={`/study/${d.uid}/learn`} className={cn('inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium', d.due_count > 0 ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 pointer-events-none')}>
                        <Play className="w-3.5 h-3.5" /> {t('study.study')}
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

      {form && <DeckForm deck={form === 'new' ? null : form} onClose={() => setForm(null)} onSaved={() => { setForm(null); load(); }} />}
      {share && <ShareModal deck={share} onClose={() => setShare(null)} />}
      {importOpen && <ImportModal onClose={() => setImportOpen(false)} onImported={() => { setImportOpen(false); load(); }} />}
      <ConfirmDialog open={!!del} message={del ? <><b>{del.name}</b><br />{t('study.deleteWarn')}</> : ''} onConfirm={doDelete} onCancel={() => setDel(null)} />
    </div>
  );
}

function DeckForm({ deck, onClose, onSaved }: { deck: Deck | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useLanguage();
  const [name, setName] = useState(deck?.name ?? '');
  const [description, setDescription] = useState(deck?.description ?? '');
  const [templateUid, setTemplateUid] = useState<string>(deck?.template_uid ?? '');
  const [templates, setTemplates] = useState<CardTemplate[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { templateService.list().then((r) => setTemplates(r.data)).catch(() => {}); }, []);

  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true); setError('');
    const data = { name: name.trim(), description: description || null, template_uid: templateUid || null };
    try {
      if (deck) await deckService.update(deck.uid, data);
      else await deckService.create(data);
      onSaved();
    } catch (e) { setError(e instanceof ApiError ? e.message : t('common.error')); }
    finally { setSaving(false); }
  };

  return (
    <Modal open onClose={() => !saving && onClose()} title={deck ? t('common.edit') : t('study.newDeck')} size="sm"
      footer={<><Button variant="outline" onClick={onClose} disabled={saving}>{t('common.cancel')}</Button><Button onClick={submit} loading={saving}>{t('common.save')}</Button></>}>
      <div className="space-y-3">
        {error && <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600">{error}</div>}
        <Input label={t('study.deckName')} value={name} onChange={(e) => setName(e.target.value)} placeholder="Rus dili — feillər" />
        <Input label={t('study.deckDesc')} value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('study.deckTemplate')}</label>
          <select value={templateUid} onChange={(e) => setTemplateUid(e.target.value)}
            className="w-full h-9 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:border-violet-500">
            <option value="">{t('study.noTemplate')}</option>
            {templates.map((tpl) => <option key={tpl.uid} value={tpl.uid}>{tpl.name}</option>)}
          </select>
          <p className="text-xs text-gray-400">{t('study.deckTemplateHint')}</p>
        </div>
      </div>
    </Modal>
  );
}

function ShareModal({ deck, onClose }: { deck: Deck; onClose: () => void }) {
  const { t } = useLanguage();
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    deckShareService.get(deck.uid).then((r) => setCode(r.code)).catch(() => {}).finally(() => setLoading(false));
  }, [deck.uid]);

  const generate = async () => {
    setBusy(true); setError('');
    try { const r = await deckShareService.create(deck.uid); setCode(r.code); }
    catch (e) { setError(e instanceof ApiError ? e.message : t('common.error')); }
    finally { setBusy(false); }
  };

  const revoke = async () => {
    setBusy(true); setError('');
    try { await deckShareService.revoke(deck.uid); setCode(null); }
    catch (e) { setError(e instanceof ApiError ? e.message : t('common.error')); }
    finally { setBusy(false); }
  };

  const copy = () => { if (code) { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); } };

  return (
    <Modal open onClose={onClose} title={t('study.shareTitle')} size="sm"
      footer={<Button variant="outline" onClick={onClose}>{t('common.close')}</Button>}>
      <div className="space-y-3">
        {error && <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600">{error}</div>}
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('study.shareHint')}</p>
        {loading ? <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-indigo-600" /></div>
          : code ? (
            <>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-11 px-3 flex items-center rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 font-mono text-lg tracking-widest text-center justify-center select-all">{code}</div>
                <button onClick={copy} className="h-11 px-3 flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />} {copied ? t('study.copied') : t('study.copyCode')}
                </button>
              </div>
              <button onClick={revoke} disabled={busy} className="text-sm text-red-600 hover:underline disabled:opacity-60">{t('study.revokeShare')}</button>
            </>
          ) : (
            <Button onClick={generate} loading={busy}><Share2 className="w-4 h-4 mr-1" /> {t('study.shareDeck')}</Button>
          )}
      </div>
    </Modal>
  );
}

function ImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const { t } = useLanguage();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!code.trim()) return;
    setBusy(true); setError('');
    try { await deckShareService.import(code.trim().toUpperCase()); onImported(); }
    catch (e) { setError(e instanceof ApiError ? e.message : t('common.error')); }
    finally { setBusy(false); }
  };

  return (
    <Modal open onClose={() => !busy && onClose()} title={t('study.importDeckTitle')} size="sm"
      footer={<><Button variant="outline" onClick={onClose} disabled={busy}>{t('common.cancel')}</Button><Button onClick={submit} loading={busy}><Download className="w-4 h-4 mr-1" /> {t('study.importDeck')}</Button></>}>
      <div className="space-y-3">
        {error && <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600">{error}</div>}
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('study.importDeckHint')}</p>
        <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder={t('study.importCodePlaceholder')}
          className="font-mono tracking-widest text-center" onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
      </div>
    </Modal>
  );
}
