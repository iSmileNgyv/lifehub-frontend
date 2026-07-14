'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus, ChevronRight, ChevronDown, Pencil, Trash2, GripVertical,
  Loader2, X, Lock, CornerDownRight, TrendingUp, TrendingDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useContentLanguages } from '@/contexts/ContentLanguagesContext';
import { financeCategoryService } from '@/services/financeCategoryService';
import { ApiError } from '@/lib/api';
import { translateValue } from '@/lib/translate';
import PageHeader from '@/components/ui/PageHeader';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import TranslatableInput from '@/components/ui/TranslatableInput';
import type { FinanceCategory, FinanceCategoryType, Translatable } from '@/types';

const childrenOf = (items: FinanceCategory[], parent: string | null) =>
  items.filter((i) => i.parent_code === parent).sort((a, b) => a.sort_order - b.sort_order || a.code.localeCompare(b.code));

function isAncestorOf(items: FinanceCategory[], ancestor: string, code: string): boolean {
  const parentOf = new Map(items.map((i) => [i.code, i.parent_code]));
  let cur: string | null | undefined = parentOf.get(code);
  while (cur) { if (cur === ancestor) return true; cur = parentOf.get(cur); }
  return false;
}

export default function FinanceCategoriesPage() {
  const { can } = useAuth();
  const { t, language } = useLanguage();
  const { defaultCode } = useContentLanguages();

  const [items, setItems] = useState<FinanceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceCategory | null>(null);
  const [newParent, setNewParent] = useState<string | null>(null);
  const [newType, setNewType] = useState<FinanceCategoryType>('expense');
  const [delTarget, setDelTarget] = useState<FinanceCategory | null>(null);

  const [dragCode, setDragCode] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const canUpdate = can('FINCATEGORY_UPDATE');
  const canDelete = can('FINCATEGORY_DELETE');
  const canCreate = can('FINCATEGORY_CREATE');

  const load = useCallback(() => {
    financeCategoryService.list().then(setItems)
      .catch((e) => setError(e instanceof ApiError ? e.message : t('common.error')))
      .finally(() => setLoading(false));
  }, [t]);
  useEffect(() => { load(); }, [load]);

  const label = (c: FinanceCategory) => translateValue(c.name, language, defaultCode) || c.code;
  const typeOf = (code: string) => items.find((i) => i.code === code)?.type;

  const toggle = (code: string) => setExpanded((p) => { const n = new Set(p); n.has(code) ? n.delete(code) : n.add(code); return n; });
  const upsert = (c: FinanceCategory) =>
    setItems((prev) => (prev.some((x) => x.code === c.code) ? prev.map((x) => (x.code === c.code ? c : x)) : [...prev, c]));

  const applyReorder = async (parent: string | null, ordered: FinanceCategory[]) => {
    const payload = ordered.map((c, idx) => ({ code: c.code, parent_code: parent, sort_order: idx }));
    setItems((prev) => prev.map((c) => { const hit = payload.find((p) => p.code === c.code); return hit ? { ...c, parent_code: parent, sort_order: hit.sort_order } : c; }));
    try { await financeCategoryService.reorder(payload); }
    catch (e) { setError(e instanceof ApiError ? e.message : t('common.error')); load(); }
  };

  const dropBefore = (targetCode: string) => {
    const dragged = dragCode;
    setDragCode(null); setDragOver(null);
    if (!dragged || dragged === targetCode) return;
    if (typeOf(dragged) !== typeOf(targetCode)) return; // type sərhədi keçmə
    if (isAncestorOf(items, dragged, targetCode)) return;
    const target = items.find((i) => i.code === targetCode);
    if (!target) return;
    const parent = target.parent_code;
    const sibs = childrenOf(items, parent).filter((c) => c.code !== dragged);
    const idx = sibs.findIndex((c) => c.code === targetCode);
    sibs.splice(idx, 0, items.find((i) => i.code === dragged)!);
    applyReorder(parent, sibs);
  };

  const dropToRoot = (type: FinanceCategoryType) => {
    const dragged = dragCode;
    setDragCode(null); setDragOver(null);
    if (!dragged || typeOf(dragged) !== type) return;
    const roots = childrenOf(items, null).filter((c) => c.type === type && c.code !== dragged);
    roots.push(items.find((i) => i.code === dragged)!);
    applyReorder(null, roots);
  };

  const remove = async () => {
    if (!delTarget) return;
    try { await financeCategoryService.remove(delTarget.code); setItems((p) => p.filter((x) => x.code !== delTarget.code)); setDelTarget(null); }
    catch (e) { setError(e instanceof ApiError ? e.message : t('common.error')); setDelTarget(null); load(); }
  };

  const openCreate = (type: FinanceCategoryType, parent: string | null) => { setEditing(null); setNewType(type); setNewParent(parent); setFormOpen(true); };
  const openEdit = (c: FinanceCategory) => { setEditing(c); setFormOpen(true); };

  const renderTree = (type: FinanceCategoryType, parent: string | null, depth: number): React.ReactNode =>
    childrenOf(items, parent).filter((c) => c.type === type).map((c) => {
      const kids = childrenOf(items, c.code);
      const isOpen = expanded.has(c.code);
      return (
        <div key={c.code}>
          <div
            draggable={canUpdate}
            onDragStart={() => setDragCode(c.code)}
            onDragOver={(e) => { if (dragCode && dragCode !== c.code && typeOf(dragCode) === c.type) { e.preventDefault(); setDragOver(c.code); } }}
            onDragLeave={() => setDragOver((d) => (d === c.code ? null : d))}
            onDrop={(e) => { e.preventDefault(); dropBefore(c.code); }}
            className={cn('group flex items-center gap-1.5 pr-3 py-2 rounded-lg border border-transparent',
              dragOver === c.code ? 'border-blue-400 border-t-2' : 'hover:bg-gray-50 dark:hover:bg-gray-800/40')}
            style={{ paddingLeft: depth * 22 + 8 }}
          >
            {canUpdate && <GripVertical className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 shrink-0 cursor-grab" />}
            {kids.length > 0 ? (
              <button onClick={() => toggle(c.code)} className="w-5 h-5 flex items-center justify-center text-gray-400 shrink-0">
                {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            ) : <span className="w-5 shrink-0" />}

            <span className="font-medium text-gray-800 dark:text-gray-100 text-sm truncate">{label(c)}</span>
            <span className="text-[11px] text-gray-400 font-mono shrink-0">{c.code}</span>
            {c.in_use && <Lock className="w-3 h-3 text-amber-500 shrink-0" />}

            <div className="ml-auto flex items-center gap-0.5">
              {canCreate && (
                <button onClick={() => openCreate(c.type, c.code)} title={t('finCategories.addChild')} className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"><CornerDownRight className="w-4 h-4" /></button>
              )}
              {canUpdate && <button onClick={() => openEdit(c)} title={t('common.edit')} className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20"><Pencil className="w-4 h-4" /></button>}
              {canDelete && <button onClick={() => setDelTarget(c)} title={t('common.delete')} className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"><Trash2 className="w-4 h-4" /></button>}
            </div>
          </div>
          {isOpen && kids.length > 0 && renderTree(type, c.code, depth + 1)}
        </div>
      );
    });

  const section = (type: FinanceCategoryType, Icon: typeof TrendingUp, color: string) => (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-2">
      <div className="flex items-center justify-between px-2 py-1.5 mb-1">
        <span className={cn('flex items-center gap-1.5 text-sm font-bold', color)}>
          <Icon className="w-4 h-4" /> {t(`finCategories.${type}`)}
        </span>
        {canCreate && <button onClick={() => openCreate(type, null)} className="text-xs text-gray-500 hover:text-blue-600 inline-flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> {t('finCategories.new')}</button>}
      </div>
      {dragCode && typeOf(dragCode) === type && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(`__root_${type}`); }}
          onDragLeave={() => setDragOver((d) => (d === `__root_${type}` ? null : d))}
          onDrop={(e) => { e.preventDefault(); dropToRoot(type); }}
          className={cn('mb-1 text-center text-xs py-2 rounded-lg border border-dashed', dragOver === `__root_${type}` ? 'border-blue-400 bg-blue-50/60 dark:bg-blue-950/20 text-blue-600' : 'border-gray-300 dark:border-gray-700 text-gray-400')}
        >{t('finCategories.rootOption')}</div>
      )}
      {childrenOf(items, null).filter((c) => c.type === type).length === 0
        ? <p className="py-8 text-center text-sm text-gray-400">—</p>
        : renderTree(type, null, 0)}
    </div>
  );

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>;

  return (
    <div>
      <PageHeader title={t('finCategories.title')} subtitle={t('finCategories.subtitle')} />
      {error && (
        <div className="mb-4 flex items-center justify-between px-4 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
          {error}<button onClick={() => setError('')}><X className="w-4 h-4" /></button>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {section('income', TrendingUp, 'text-emerald-600')}
        {section('expense', TrendingDown, 'text-red-500')}
      </div>

      {formOpen && (
        <CategoryForm
          category={editing}
          parentCode={newParent}
          type={editing?.type ?? newType}
          all={items}
          onClose={() => setFormOpen(false)}
          onSaved={(c) => { upsert(c); if (c.parent_code) setExpanded((p) => new Set(p).add(c.parent_code!)); setFormOpen(false); }}
        />
      )}
      <ConfirmDialog
        open={delTarget !== null}
        message={delTarget ? <><b>{label(delTarget)}</b> ({delTarget.code})<br />{t('common.delete')}?</> : ''}
        onConfirm={remove}
        onCancel={() => setDelTarget(null)}
      />
    </div>
  );
}

function CategoryForm({ category, parentCode, type, all, onClose, onSaved }: {
  category: FinanceCategory | null;
  parentCode: string | null;
  type: FinanceCategoryType;
  all: FinanceCategory[];
  onClose: () => void;
  onSaved: (c: FinanceCategory) => void;
}) {
  const { t, language } = useLanguage();
  const { defaultCode } = useContentLanguages();
  const [code, setCode] = useState(category?.code ?? '');
  const [name, setName] = useState<Translatable>(category?.name ?? {});
  const [parent, setParent] = useState<string | null>(category ? category.parent_code : parentCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Yalnız eyni type-lı kateqoriyalar parent ola bilər (öz alt-budağı istisna)
  const parentOptions = useMemo(() => {
    const banned = new Set<string>();
    if (category) {
      banned.add(category.code);
      const parentOf = new Map(all.map((i) => [i.code, i.parent_code]));
      for (const c of all) { let cur: string | null | undefined = c.code; while (cur) { if (cur === category.code) { banned.add(c.code); break; } cur = parentOf.get(cur); } }
    }
    return all.filter((c) => c.type === type && !banned.has(c.code));
  }, [all, category, type]);

  const submit = async () => {
    setError(''); setLoading(true);
    try {
      const saved = category
        ? await financeCategoryService.update(category.code, { name, parent_code: parent })
        : await financeCategoryService.create({ code: code.trim().toUpperCase(), parent_code: parent, name, type });
      onSaved(saved);
    } catch (e) { setError(e instanceof ApiError ? e.message : t('common.error')); }
    finally { setLoading(false); }
  };

  return (
    <Modal open onClose={() => !loading && onClose()} title={category ? t('common.edit') : t('finCategories.new')} size="sm"
      footer={<><Button variant="outline" onClick={onClose} disabled={loading}>{t('common.cancel')}</Button><Button onClick={submit} loading={loading}>{t('common.save')}</Button></>}>
      <div className="space-y-3">
        {error && <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600 dark:text-red-400">{error}</div>}
        <div className={cn('text-xs font-medium px-2 py-1 rounded inline-block', type === 'income' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30' : 'bg-red-50 text-red-500 dark:bg-red-950/30')}>
          {t(`finCategories.${type}`)}
        </div>
        <Input label={t('common.code')} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} disabled={!!category} placeholder="MARKET" />
        <TranslatableInput label={t('common.name')} value={name} onChange={setName} />
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('finCategories.parentCategory')}</label>
          <select value={parent ?? ''} onChange={(e) => setParent(e.target.value || null)}
            className="w-full h-9 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:border-blue-500">
            <option value="">{t('finCategories.rootOption')}</option>
            {parentOptions.map((c) => (
              <option key={c.code} value={c.code}>{translateValue(c.name, language, defaultCode) || c.code} ({c.code})</option>
            ))}
          </select>
        </div>
      </div>
    </Modal>
  );
}
