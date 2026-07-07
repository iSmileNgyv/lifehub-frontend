'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Check, Loader2, X, Calculator, Power } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { tradingFormulaService } from '@/services/tradingFormulaService';
import { applyFormula } from '@/lib/formula';
import { ApiError } from '@/lib/api';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import type { FormulaTier, TradingFormula } from '@/types';

export default function TradingPage() {
  const { t } = useLanguage();
  const { can } = useAuth();
  const canManage = can('TRADING_FORMULA_MANAGE');

  const [formulas, setFormulas] = useState<TradingFormula[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<TradingFormula | 'new' | null>(null);
  const [delTarget, setDelTarget] = useState<TradingFormula | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    tradingFormulaService.list().then((r) => setFormulas(r.data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const activate = async (f: TradingFormula) => {
    setBusy(true); setError('');
    try { await tradingFormulaService.activate(f.uid); load(); }
    catch (e) { setError(e instanceof ApiError ? e.message : t('common.error')); }
    finally { setBusy(false); }
  };
  const doDelete = async () => {
    if (!delTarget) return;
    setBusy(true); setError('');
    try { await tradingFormulaService.remove(delTarget.uid); setDelTarget(null); load(); }
    catch (e) { setError(e instanceof ApiError ? e.message : t('common.error')); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <PageHeader
        title={t('trading.formulasTitle')}
        subtitle={t('trading.formulasSubtitle')}
        actions={canManage && <Button onClick={() => setEditing('new')}><Plus className="w-4 h-4 mr-1" /> {t('trading.newFormula')}</Button>}
      />

      {error && (
        <div className="mb-4 flex items-center justify-between px-4 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
          {error}<button onClick={() => setError('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
      ) : formulas.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">{t('trading.noFormulas')}</div>
      ) : (
        <div className="space-y-3">
          {formulas.map((f) => (
            <div key={f.uid} className={cn('rounded-xl border p-4', f.is_active ? 'border-green-300 dark:border-green-800 bg-green-50/40 dark:bg-green-950/10' : 'border-gray-200 dark:border-gray-800')}>
              <div className="flex items-center gap-3 mb-3">
                <span className="font-semibold text-gray-900 dark:text-white">{f.name}</span>
                {f.is_active && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400">{t('trading.active')}</span>}
                <div className="ml-auto flex items-center gap-1">
                  {canManage && !f.is_active && (
                    <button onClick={() => activate(f)} disabled={busy} title={t('trading.activate')} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30"><Power className="w-4 h-4" /></button>
                  )}
                  {canManage && (
                    <>
                      <button onClick={() => setEditing(f)} title={t('common.edit')} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => setDelTarget(f)} title={t('common.delete')} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"><Trash2 className="w-4 h-4" /></button>
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                {f.tiers.map((tier, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="font-mono text-xs text-gray-400 w-28 shrink-0">{rangeLabel(tier)}</span>
                    <span className="font-mono text-gray-700 dark:text-gray-200">{tier.expr}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <FormulaModal
          formula={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}

      {delTarget && (
        <Modal open onClose={() => !busy && setDelTarget(null)} title={t('common.delete')} size="sm"
          footer={<>
            <Button variant="outline" onClick={() => setDelTarget(null)} disabled={busy}>{t('common.cancel')}</Button>
            <Button variant="danger" onClick={doDelete} loading={busy}>{t('common.delete')}</Button>
          </>}>
          <p className="text-sm text-gray-600 dark:text-gray-300">{t('trading.deleteConfirm').replace('{name}', delTarget.name)}</p>
        </Modal>
      )}
    </div>
  );
}

function rangeLabel(tier: FormulaTier): string {
  const from = tier.from ?? null;
  const to = tier.to ?? null;
  if (from === null && to === null) return '∀';
  if (from === null) return `< ${to}`;
  if (to === null) return `≥ ${from}`;
  return `${from} – ${to}`;
}

function FormulaModal({ formula, onClose, onSaved }: { formula: TradingFormula | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useLanguage();
  const [name, setName] = useState(formula?.name ?? '');
  const [tiers, setTiers] = useState<FormulaTier[]>(formula?.tiers ?? [{ from: null, to: null, expr: 'x / 1.75' }]);
  const [isActive, setIsActive] = useState(formula?.is_active ?? false);
  const [testAmount, setTestAmount] = useState('20');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const setTier = (i: number, patch: Partial<FormulaTier>) => setTiers((ts) => ts.map((tr, j) => (j === i ? { ...tr, ...patch } : tr)));
  const numOrNull = (v: string) => (v.trim() === '' ? null : Number(v));

  // Canlı önizləmə — cari pillələrlə
  const preview = useMemo(() => {
    const amt = Number(testAmount);
    if (testAmount.trim() === '' || Number.isNaN(amt)) return null;
    try { return { ...applyFormula(tiers, amt), error: '' }; }
    catch (e) { return { tier: -1, result: 0, error: e instanceof Error ? e.message : 'xəta' }; }
  }, [tiers, testAmount]);

  const save = async () => {
    setError('');
    if (!name.trim()) { setError(t('trading.nameRequired')); return; }
    setSaving(true);
    try {
      const payload = { name: name.trim(), tiers, is_active: isActive };
      if (formula) await tradingFormulaService.update(formula.uid, payload);
      else await tradingFormulaService.create(payload);
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common.error'));
    } finally { setSaving(false); }
  };

  return (
    <Modal open onClose={() => !saving && onClose()} size="xl"
      title={formula ? t('common.edit') : t('trading.newFormula')}
      footer={<>
        <Button variant="outline" onClick={onClose} disabled={saving}>{t('common.cancel')}</Button>
        <Button onClick={save} loading={saving}>{t('common.save')}</Button>
      </>}>
      <div className="space-y-4">
        {error && <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600 dark:text-red-400">{error}</div>}

        <Input label={t('trading.name')} value={name} onChange={(e) => setName(e.target.value)} placeholder="Cari kurs" />

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('trading.tiers')}</label>
            <span className="text-xs text-gray-400">{t('trading.exprHint')}</span>
          </div>
          <div className="space-y-2">
            {/* Başlıq */}
            <div className="grid grid-cols-[90px_90px_1fr_36px] gap-2 text-xs text-gray-400 px-1">
              <span>{t('trading.from')}</span><span>{t('trading.to')}</span><span>{t('trading.expr')} (x)</span><span></span>
            </div>
            {tiers.map((tier, i) => (
              <div key={i} className="grid grid-cols-[90px_90px_1fr_36px] gap-2 items-center">
                <input type="number" value={tier.from ?? ''} onChange={(e) => setTier(i, { from: numOrNull(e.target.value) })} placeholder="∞" className="h-9 px-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:border-blue-500" />
                <input type="number" value={tier.to ?? ''} onChange={(e) => setTier(i, { to: numOrNull(e.target.value) })} placeholder="∞" className="h-9 px-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:border-blue-500" />
                <input value={tier.expr} onChange={(e) => setTier(i, { expr: e.target.value })} placeholder="x / 1.75 - 1 + 0.15" className="h-9 px-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-mono outline-none focus:border-blue-500" />
                <button onClick={() => setTiers((ts) => ts.filter((_, j) => j !== i))} disabled={tiers.length === 1} className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 disabled:opacity-30"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
          <button onClick={() => setTiers((ts) => [...ts, { from: null, to: null, expr: 'x / 1.75' }])} className="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:underline">
            <Plus className="w-4 h-4" /> {t('trading.addTier')}
          </button>
        </div>

        {/* Canlı önizləmə */}
        <div className="rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/20 p-3">
          <div className="flex items-center gap-2 mb-2 text-sm font-medium text-blue-700 dark:text-blue-300"><Calculator className="w-4 h-4" /> {t('trading.preview')}</div>
          <div className="flex items-center gap-3">
            <div className="w-40">
              <label className="block text-xs text-gray-500 mb-1">{t('trading.testAmount')} (₼)</label>
              <input type="number" value={testAmount} onChange={(e) => setTestAmount(e.target.value)} className="w-full h-9 px-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:border-blue-500" />
            </div>
            <div className="text-2xl text-gray-300">→</div>
            <div className="flex-1">
              {preview === null ? (
                <span className="text-sm text-gray-400">—</span>
              ) : preview.error ? (
                <span className="text-sm text-red-500">{preview.error}</span>
              ) : (
                <span className="text-lg font-bold text-gray-900 dark:text-white">{preview.result} <span className="text-sm font-normal text-gray-400">USD · {t('trading.tier')} {preview.tier + 1}</span></span>
              )}
            </div>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 rounded" />
          {t('trading.setActive')}
        </label>
      </div>
    </Modal>
  );
}
