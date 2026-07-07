'use client';

import { useEffect, useState } from 'react';
import { Plus, Loader2, X, Trash2, Pencil, FileText, ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { templateService } from '@/services/studyService';
import { ApiError } from '@/lib/api';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import TemplateBuilder from '@/components/study/TemplateBuilder';
import type { CardTemplate } from '@/types';

export default function TemplatesPage() {
  const { t } = useLanguage();
  const { can } = useAuth();
  const [templates, setTemplates] = useState<CardTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState<CardTemplate | 'new' | null>(null);
  const [del, setDel] = useState<CardTemplate | null>(null);

  const load = () => { setLoading(true); templateService.list().then((r) => setTemplates(r.data)).catch((e) => setError(e instanceof ApiError ? e.message : '')).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const doDelete = async () => {
    if (!del) return;
    try { await templateService.remove(del.uid); setDel(null); load(); }
    catch (e) { setError(e instanceof ApiError ? e.message : t('common.error')); }
  };

  return (
    <div>
      <button onClick={() => history.back()} className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft className="w-4 h-4" /> {t('study.title')}
      </button>
      <PageHeader
        title={t('study.templatesTitle')}
        subtitle={t('study.templatesSubtitle')}
        actions={can('STUDY_CREATE') && <Button onClick={() => setForm('new')}><Plus className="w-4 h-4 mr-1" /> {t('study.newTemplate')}</Button>}
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
                    {can('STUDY_UPDATE') && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                        <button onClick={() => setForm(tpl)} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
                        {can('STUDY_DELETE') && <button onClick={() => setDel(tpl)} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>}
                      </div>
                    )}
                  </div>
                  <p className="mt-3 text-xs text-gray-400">{tpl.fields.length} {t('study.fieldCount')}</p>
                </div>
              ))}
            </div>
          )}

      {form && <TemplateBuilder template={form === 'new' ? null : form} onClose={() => setForm(null)} onSaved={() => { setForm(null); load(); }} />}
      <ConfirmDialog open={!!del} message={del ? <><b>{del.name}</b><br />{t('study.deleteTplWarn')}</> : ''} onConfirm={doDelete} onCancel={() => setDel(null)} />
    </div>
  );
}
