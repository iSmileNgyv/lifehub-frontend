'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, X, Search, Ruler, Tag } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useContentLanguages } from '@/contexts/ContentLanguagesContext';
import { useAuth } from '@/contexts/AuthContext';
import { itemService } from '@/services/itemService';
import { itemCategoryService } from '@/services/itemCategoryService';
import { itemMeasurementService } from '@/services/itemMeasurementService';
import { measureService } from '@/services/measureService';
import { ApiError } from '@/lib/api';
import { translateValue } from '@/lib/translate';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { EntityImage } from '@/components/ui/EntityImage';
import { ItemFormModal } from '@/components/inventory/ItemForm';
import { fmtDate } from '@/lib/utils';
import type { Item, ItemCategory, ItemMeasurement, ItemPriceHistory, Measurement, Translatable } from '@/types';

export default function ProductsPage() {
  const { t, language } = useLanguage();
  const { defaultCode } = useContentLanguages();
  const { can } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [cats, setCats] = useState<ItemCategory[]>([]);
  const [measures, setMeasures] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState<Item | 'new' | null>(null);
  const [del, setDel] = useState<Item | null>(null);
  const [unitsItem, setUnitsItem] = useState<Item | null>(null);
  const [priceItem, setPriceItem] = useState<Item | null>(null);
  const [busy, setBusy] = useState(false);

  const tr = (v: Translatable | null, fb: string) => translateValue(v ?? undefined, language, defaultCode) || fb;
  const catName = (code: string | null) => (code ? tr(cats.find((c) => c.code === code)?.name ?? null, code) : null);

  const load = useCallback((q: string) => { setLoading(true); itemService.list({ q: q || undefined }).then((r) => setItems(r.data)).catch(() => {}).finally(() => setLoading(false)); }, []);
  useEffect(() => { itemCategoryService.list().then(setCats).catch(() => {}); measureService.list().then(setMeasures).catch(() => {}); }, []);
  useEffect(() => { const h = setTimeout(() => setDebounced(query.trim()), 300); return () => clearTimeout(h); }, [query]);
  useEffect(() => { load(debounced); }, [debounced, load]);

  const doDelete = async () => {
    if (!del) return;
    setBusy(true); setError('');
    try { await itemService.remove(del.code); setDel(null); load(debounced); }
    catch (e) { setError(e instanceof ApiError ? e.message : t('common.error')); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <PageHeader title={t('products.title')} actions={can('PRODUCT_CREATE') && <Button onClick={() => setForm('new')}><Plus className="w-4 h-4 mr-1" /> {t('products.newProduct')}</Button>} />
      {error && <div className="mb-4 flex items-center justify-between px-4 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600">{error}<button onClick={() => setError('')}><X className="w-4 h-4" /></button></div>}

      <div className="relative max-w-xs mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('products.searchPlaceholder')} className="w-full h-9 pl-9 pr-4 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm outline-none focus:ring-1 focus:ring-blue-500" />
      </div>

      {loading ? <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
        : items.length === 0 ? <div className="py-16 text-center text-sm text-gray-400">{t('products.empty')}</div>
          : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {items.map((it) => (
                <div key={it.code} className="group relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all">
                  <div className="relative aspect-square"><EntityImage uid={it.image} initial={tr(it.name, it.code).charAt(0).toUpperCase()} size="lg" className="absolute inset-0 w-full h-full" /></div>
                  <div className="p-3">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm leading-tight truncate">{tr(it.name, it.code)}</p>
                    {catName(it.category_code) && <p className="text-xs text-gray-400 truncate">{catName(it.category_code)}</p>}
                    <p className="text-[11px] text-gray-400 font-mono">{it.code} · {it.base_measure_code}</p>
                  </div>
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {can('PRODUCT_VIEW') && <button onClick={() => setPriceItem(it)} title={t('products.priceList')} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/90 dark:bg-gray-800/90 text-gray-500 hover:text-amber-600 shadow"><Tag className="w-3.5 h-3.5" /></button>}
                    {can('PRODUCT_VIEW') && <button onClick={() => setUnitsItem(it)} title={t('products.units')} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/90 dark:bg-gray-800/90 text-gray-500 hover:text-emerald-600 shadow"><Ruler className="w-3.5 h-3.5" /></button>}
                    {can('PRODUCT_UPDATE') && <button onClick={() => setForm(it)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/90 dark:bg-gray-800/90 text-gray-500 hover:text-blue-600 shadow"><Pencil className="w-3.5 h-3.5" /></button>}
                    {can('PRODUCT_DELETE') && !it.in_use && <button onClick={() => setDel(it)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/90 dark:bg-gray-800/90 text-gray-500 hover:text-red-500 shadow"><Trash2 className="w-3.5 h-3.5" /></button>}
                  </div>
                </div>
              ))}
            </div>
          )}

      {form && <ItemFormModal item={form === 'new' ? null : form} onClose={() => setForm(null)} onSaved={() => { setForm(null); load(debounced); }} />}
      {unitsItem && <ItemMeasurementsModal item={unitsItem} measures={measures} onClose={() => setUnitsItem(null)} />}
      {priceItem && <PriceHistoryModal item={priceItem} measures={measures} onClose={() => setPriceItem(null)} />}
      {del && (
        <Modal open onClose={() => !busy && setDel(null)} title={t('common.delete')} size="sm" footer={<><Button variant="outline" onClick={() => setDel(null)} disabled={busy}>{t('common.cancel')}</Button><Button variant="danger" onClick={doDelete} loading={busy}>{t('common.delete')}</Button></>}>
          <p className="text-sm text-gray-600 dark:text-gray-300">{t('products.deleteWarn')}</p>
        </Modal>
      )}
    </div>
  );
}

function ItemMeasurementsModal({ item, measures, onClose }: { item: Item; measures: Measurement[]; onClose: () => void }) {
  const { t, language } = useLanguage();
  const { defaultCode } = useContentLanguages();
  const [rows, setRows] = useState<ItemMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMeasure, setNewMeasure] = useState('');
  const [newWeight, setNewWeight] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const measLabel = (code: string) => translateValue(measures.find((m) => m.code === code)?.name, language, defaultCode) || code;
  const base = item.base_measure_code;

  const load = () => { setLoading(true); itemMeasurementService.list(item.code).then(setRows).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const add = async () => {
    if (!newMeasure || !newWeight) return;
    setSaving(true); setError('');
    try { await itemMeasurementService.create(item.code, { measure_code: newMeasure, meas_weight: Number(newWeight) }); setNewMeasure(''); setNewWeight(''); load(); }
    catch (e) { setError(e instanceof ApiError ? e.message : t('common.error')); }
    finally { setSaving(false); }
  };
  const del = async (uid: string) => {
    try { await itemMeasurementService.remove(item.code, uid); load(); }
    catch (e) { setError(e instanceof ApiError ? e.message : t('common.error')); }
  };

  // Eyni vahid təkrar əlavə oluna bilər (5L "ədəd" vs 8L "ədəd") — yalnız baza istisna
  const available = measures.filter((m) => m.code !== base);

  return (
    <Modal open onClose={onClose} title={`${t('products.units')} — ${translateValue(item.name, language, defaultCode) || item.code}`} size="md">
      <div className="space-y-3">
        {error && <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600">{error}</div>}
        <p className="text-xs text-gray-400">{t('products.unitsHint')}</p>

        <div className="flex items-end gap-2">
          <div className="w-16 text-center text-sm text-gray-500 pb-2">1</div>
          <div className="flex-1 space-y-1">
            <label className="block text-xs text-gray-500">{t('products.unit')}</label>
            <select value={newMeasure} onChange={(e) => setNewMeasure(e.target.value)} className="w-full h-9 px-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm">
              <option value="">—</option>
              {available.map((m) => <option key={m.code} value={m.code}>{measLabel(m.code)}</option>)}
            </select>
          </div>
          <div className="text-gray-400 pb-2">=</div>
          <div className="w-24 space-y-1">
            <label className="block text-xs text-gray-500">{t('products.weight')}</label>
            <input type="number" value={newWeight} onChange={(e) => setNewWeight(e.target.value)} className="w-full h-9 px-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" />
          </div>
          <div className="text-sm text-gray-500 pb-2 font-mono">{base}</div>
          <Button onClick={add} loading={saving} disabled={!newMeasure || !newWeight}><Plus className="w-4 h-4" /></Button>
        </div>

        {loading ? <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-blue-600" /></div>
          : rows.length === 0 ? <div className="py-6 text-center text-sm text-gray-400">{t('products.unitsEmpty')}</div>
            : (
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
                {rows.map((r) => (
                  <div key={r.uid} className="flex items-center gap-2 px-4 py-2 text-sm">
                    <span className="font-medium text-gray-800 dark:text-gray-100">1 {measLabel(r.measure_code)}</span>
                    <span className="text-gray-400">=</span>
                    <span className="font-mono">{Number(r.meas_weight)} {base}</span>
                    {!r.in_use && <button onClick={() => del(r.uid)} className="ml-auto text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>}
                  </div>
                ))}
              </div>
            )}
      </div>
    </Modal>
  );
}

/** Məhsulun qiymət tarixçəsi — variant üzrə qiymət dəyişmələri (post olunmuş çeklərdən). */
function PriceHistoryModal({ item, measures, onClose }: { item: Item; measures: Measurement[]; onClose: () => void }) {
  const { t, language } = useLanguage();
  const { defaultCode } = useContentLanguages();
  const [rows, setRows] = useState<ItemPriceHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const measLabel = (code: string | null) => (code ? translateValue(measures.find((m) => m.code === code)?.name, language, defaultCode) || code : '—');
  const base = item.base_measure_code;
  // Variant başlığı: baza → "LT", variant → "1 ƏDƏD = 5 LT"
  const variantLabel = (measure_code: string | null, meas_weight: string | null) =>
    (meas_weight ? `1 ${measLabel(measure_code)} = ${Number(meas_weight)} ${measLabel(base)}` : measLabel(measure_code));

  useEffect(() => { itemService.priceHistory(item.code).then(setRows).catch(() => {}).finally(() => setLoading(false)); }, [item.code]);

  return (
    <Modal open onClose={onClose} title={`${t('products.priceList')} — ${translateValue(item.name, language, defaultCode) || item.code}`} size="md">
      <div className="space-y-3">
        {loading ? <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-blue-600" /></div>
          : rows.length === 0 ? <div className="py-6 text-center text-sm text-gray-400">{t('products.priceEmpty')}</div>
            : (
              <div className="space-y-3">
                {rows.map((v) => (
                  <div key={`${v.measure_code ?? ''}|${v.meas_weight ?? ''}`} className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 text-sm font-medium text-gray-800 dark:text-gray-100">{variantLabel(v.measure_code, v.meas_weight)}</div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                      {v.changes.map((c, i) => (
                        <div key={i} className="flex items-center justify-between px-4 py-2 text-sm">
                          <span className="text-gray-500">{fmtDate(c.posting_date)}</span>
                          <span className="font-semibold tabular-nums">{Number(c.unit_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
      </div>
    </Modal>
  );
}
