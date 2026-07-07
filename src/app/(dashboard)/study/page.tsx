'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Loader2, X, Layers, Play, Pencil, Trash2, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { deckService, templateService } from '@/services/studyService';
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

  const load = () => { setLoading(true); deckService.list().then((r) => setDecks(r.data)).catch((e) => setError(e instanceof ApiError ? e.message : '')).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

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
                      <p className="font-semibold text-gray-900 dark:text-white truncate hover:text-indigo-600">{d.name}</p>
                      <p className="text-xs text-gray-400 truncate">{d.description || `${d.cards_total} ${t('study.cards')}`}</p>
                    </Link>
                    {can('STUDY_UPDATE') && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100">
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
                    <Link href={`/study/${d.uid}/learn`} className={cn('inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium', d.due_count > 0 ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 pointer-events-none')}>
                      <Play className="w-3.5 h-3.5" /> {t('study.study')}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

      {form && <DeckForm deck={form === 'new' ? null : form} onClose={() => setForm(null)} onSaved={() => { setForm(null); load(); }} />}
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
