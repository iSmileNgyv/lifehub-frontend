'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, Loader2, X, Trash2, Pencil, FileText, ArrowLeft, Upload, Copy, Download, Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { templateService } from '@/services/studyService';
import { ApiError } from '@/lib/api';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import TemplateBuilder from '@/components/study/TemplateBuilder';
import { toExport, parseImport } from '@/lib/templateIO';
import type { CardTemplate } from '@/types';

export default function TemplatesPage() {
  const { t } = useLanguage();
  const { can } = useAuth();
  const [templates, setTemplates] = useState<CardTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState<CardTemplate | 'new' | null>(null);
  const [del, setDel] = useState<CardTemplate | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importErr, setImportErr] = useState('');
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => { setLoading(true); templateService.list().then((r) => setTemplates(r.data)).catch((e) => setError(e instanceof ApiError ? e.message : '')).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const doDelete = async () => {
    if (!del) return;
    try { await templateService.remove(del.uid); setDel(null); load(); }
    catch (e) { setError(e instanceof ApiError ? e.message : t('common.error')); }
  };

  const copyJson = async (tpl: CardTemplate) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(toExport(tpl), null, 2));
      setCopied(tpl.uid);
      setTimeout(() => setCopied((c) => (c === tpl.uid ? null : c)), 1500);
    } catch { setError(t('common.error')); }
  };

  const downloadJson = (tpl: CardTemplate) => {
    const blob = new Blob([JSON.stringify(toExport(tpl), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tpl.name.replace(/[^\w.-]+/g, '_') || 'template'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pickFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => { setImportText(String(reader.result ?? '')); setImportErr(''); };
    reader.readAsText(file);
  };

  const doImport = async () => {
    const parsed = parseImport(importText);
    if (!parsed) { setImportErr(t('study.importInvalid')); return; }
    setImporting(true);
    setImportErr('');
    try {
      await templateService.create(parsed);
      setImportOpen(false);
      setImportText('');
      load();
    } catch (e) {
      setImportErr(e instanceof ApiError ? e.message : t('common.error'));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <button onClick={() => history.back()} className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft className="w-4 h-4" /> {t('study.title')}
      </button>
      <PageHeader
        title={t('study.templatesTitle')}
        subtitle={t('study.templatesSubtitle')}
        actions={can('STUDY_CREATE') && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => { setImportText(''); setImportErr(''); setImportOpen(true); }}><Upload className="w-4 h-4 mr-1" /> {t('study.importTemplate')}</Button>
            <Button onClick={() => setForm('new')}><Plus className="w-4 h-4 mr-1" /> {t('study.newTemplate')}</Button>
          </div>
        )}
      />
      {error && <div className="mb-4 flex items-center justify-between px-4 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600">{error}<button onClick={() => setError('')}><X className="w-4 h-4" /></button></div>}

      {loading ? <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-indigo-600" /></div>
        : templates.length === 0 ? <div className="py-16 text-center text-sm text-gray-400">{t('study.tplEmpty')}</div>
          : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((tpl) => (
                <div key={tpl.uid} className="group rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 hover:shadow-lg transition-all">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-violet-50 dark:bg-violet-950/30 flex items-center justify-center shrink-0"><FileText className="w-6 h-6 text-violet-600" /></div>
                    <button onClick={() => setForm(tpl)} className="min-w-0 flex-1 text-left">
                      <p className="font-semibold text-gray-900 dark:text-white truncate hover:text-violet-600">{tpl.name}</p>
                      <p className="text-xs text-gray-400 truncate">{tpl.description || `${tpl.fields.length} ${t('study.fieldCount')}`}</p>
                    </button>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                      <button title={t('study.exportJson')} onClick={() => copyJson(tpl)} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-violet-600">{copied === tpl.uid ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}</button>
                      <button title={t('study.downloadJson')} onClick={() => downloadJson(tpl)} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-violet-600"><Download className="w-4 h-4" /></button>
                      {can('STUDY_UPDATE') && <button onClick={() => setForm(tpl)} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>}
                      {can('STUDY_DELETE') && <button onClick={() => setDel(tpl)} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-gray-400">{tpl.fields.length} {t('study.fieldCount')}</p>
                </div>
              ))}
            </div>
          )}

      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setImportOpen(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">{t('study.importTitle')}</h3>
              <button onClick={() => setImportOpen(false)} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
            <textarea
              value={importText}
              onChange={(e) => { setImportText(e.target.value); setImportErr(''); }}
              placeholder={t('study.importHint')}
              rows={10}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3 font-mono text-xs text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); e.target.value = ''; }} />
            {importErr && <p className="mt-2 text-sm text-red-600">{importErr}</p>}
            <div className="mt-4 flex justify-between gap-2">
              <Button variant="secondary" onClick={() => fileRef.current?.click()}><Upload className="w-4 h-4 mr-1" /> {t('study.chooseFile')}</Button>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setImportOpen(false)}>{t('common.cancel')}</Button>
                <Button onClick={doImport} disabled={importing || !importText.trim()}>{importing ? <Loader2 className="w-4 h-4 animate-spin" /> : t('study.importBtn')}</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {form && <TemplateBuilder template={form === 'new' ? null : form} onClose={() => setForm(null)} onSaved={() => { setForm(null); load(); }} />}
      <ConfirmDialog open={!!del} message={del ? <><b>{del.name}</b><br />{t('study.deleteTplWarn')}</> : ''} onConfirm={doDelete} onCancel={() => setDel(null)} />
    </div>
  );
}
