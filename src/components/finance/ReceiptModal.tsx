'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Barcode } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useContentLanguages } from '@/contexts/ContentLanguagesContext';
import { itemService } from '@/services/itemService';
import { itemMeasurementService } from '@/services/itemMeasurementService';
import { measureService } from '@/services/measureService';
import { ApiError } from '@/lib/api';
import { translateValue } from '@/lib/translate';
import { cn } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import ItemPicker from '@/components/pickers/ItemPicker';
import { ItemFormModal } from '@/components/inventory/ItemForm';
import type { FinanceLine, Item, ItemLastPrice, ItemMeasurement, Measurement } from '@/types';

/** saveLines üçün sətir payload-u (çek redaktoru həm jurnalda, həm ledger-də işlədilir). */
export interface ReceiptLinePayload { item_code: string; measure_code: string | null; meas_weight: number | null; qty: number; unit_price: number }

interface Row {
  item_code: string;
  item_name: string;
  base_measure_code: string;      // məhsulun baza vahidi
  units: ItemMeasurement[];        // variantlar (items_measurement)
  measure_code: string;            // seçilmiş vahid
  meas_weight: string | null;      // seçilmiş variantın çəkisi (NULL = baza ×1)
  lastPrices: ItemLastPrice[];     // variant üzrə son qiymətlər (auto-fill)
  qty: string;
  price: string;
}

const emptyRow = (): Row => ({ item_code: '', item_name: '', base_measure_code: '', units: [], measure_code: '', meas_weight: null, lastPrices: [], qty: '1', price: '' });

// Variant açarı: vahid + normallaşdırılmış çəki ("ƏDƏD|5", baza → "LT|")
const normW = (w: string | null) => (w == null || w === '' ? '' : String(Number(w)));
const measKey = (mc: string, mw: string | null) => `${mc}|${normW(mw)}`;

/** Bir maliyyə sətrinin məhsul detalı (çek) — barkod skaner + vahid seçimi. Jurnal draft-ında və ledger-də (post olunmuş) işlədilir. */
export default function ReceiptModal({ initialLines, onClose, onSubmit, onDone }: {
  initialLines: FinanceLine[];
  onClose: () => void;
  onSubmit: (lines: ReceiptLinePayload[]) => Promise<void>;
  onDone: () => void;
}) {
  const { t, language } = useLanguage();
  const { defaultCode } = useContentLanguages();
  const nameOf = (item: Item) => translateValue(item.name, language, defaultCode) || item.code;

  const [rows, setRows] = useState<Row[]>(() =>
    initialLines.length
      ? initialLines.map((l) => ({
        item_code: l.item_code,
        item_name: translateValue(l.item_name ?? undefined, language, defaultCode) || l.item_code,
        // Variant sətrində measure_code vahiddir (baza deyil) → baza units yüklənəndə düzəlir
        base_measure_code: l.meas_weight ? '' : (l.measure_code ?? ''),
        units: [],
        measure_code: l.measure_code ?? '',
        meas_weight: l.meas_weight,
        lastPrices: [],
        qty: String(l.qty),
        price: String(l.unit_price),
      }))
      : [emptyRow()]);
  const [allMeasures, setAllMeasures] = useState<Measurement[]>([]);
  const [barcode, setBarcode] = useState('');
  const [notFoundBarcode, setNotFoundBarcode] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const barcodeRef = useRef<HTMLInputElement>(null);

  const focusBarcode = () => setTimeout(() => barcodeRef.current?.focus(), 0);

  // Vahid adları + mövcud sətirlərin vahid siyahısını (items_measurement) çək
  useEffect(() => {
    measureService.list().then(setAllMeasures).catch(() => {});
    initialLines.forEach((l, i) => {
      Promise.all([
        itemMeasurementService.list(l.item_code).catch(() => [] as ItemMeasurement[]),
        itemService.lastPrices(l.item_code).catch(() => [] as ItemLastPrice[]),
      ]).then(([us, prices]) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, units: us, lastPrices: prices, base_measure_code: us[0]?.base_measure_code ?? r.base_measure_code } : r))));
    });
    focusBarcode();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setRow = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () => setRows((rs) => [...rs, emptyRow()]);
  const delRow = (i: number) => setRows((rs) => (rs.length > 1 ? rs.filter((_, idx) => idx !== i) : [emptyRow()]));

  const measureLabel = (code2: string) => translateValue(allMeasures.find((m) => m.code === code2)?.name, language, defaultCode) || code2;

  // Sətir üçün vahid variantları: baza (×1) + hər items_measurement ("ƏDƏD (5 LT)")
  const rowMeasureOptions = (r: Row) => {
    const opts: { key: string; label: string; measure_code: string; meas_weight: string | null }[] = [];
    if (r.base_measure_code) opts.push({ key: measKey(r.base_measure_code, null), label: measureLabel(r.base_measure_code), measure_code: r.base_measure_code, meas_weight: null });
    for (const u of r.units) {
      const w = String(Number(u.meas_weight));
      opts.push({ key: measKey(u.measure_code, w), label: `${measureLabel(u.measure_code)} (${w} ${measureLabel(u.base_measure_code)})`, measure_code: u.measure_code, meas_weight: w });
    }
    // Seçilmiş variant hələ siyahıda yoxdursa (units yüklənməyib) əlavə et
    const selKey = measKey(r.measure_code, r.meas_weight);
    if (r.measure_code && ! opts.some((o) => o.key === selKey)) {
      opts.push({ key: selKey, label: r.meas_weight ? `${measureLabel(r.measure_code)} (${normW(r.meas_weight)})` : measureLabel(r.measure_code), measure_code: r.measure_code, meas_weight: r.meas_weight });
    }
    return opts;
  };

  // Variant üzrə son qiymət (price list-dən) → string | null
  const lastPriceFor = (prices: ItemLastPrice[], mc: string, mw: string | null): string | null => {
    const key = measKey(mc, mw);
    const lp = prices.find((p) => measKey(p.measure_code ?? '', p.meas_weight) === key);
    return lp ? String(Number(lp.unit_price)) : null;
  };

  // Sətrə məhsul təyin et (picker) — baza vahid + variantlar + son qiymət; say = 1
  const setRowItem = async (i: number, item: Item) => {
    setRow(i, { item_code: item.code, item_name: nameOf(item), base_measure_code: item.base_measure_code, units: [], measure_code: item.base_measure_code, meas_weight: null, qty: '1' });
    const [us, prices] = await Promise.all([
      itemMeasurementService.list(item.code).catch(() => [] as ItemMeasurement[]),
      itemService.lastPrices(item.code).catch(() => [] as ItemLastPrice[]),
    ]);
    const lp = lastPriceFor(prices, item.base_measure_code, null);
    setRow(i, { units: us, lastPrices: prices, ...(lp ? { price: lp } : {}) });
  };

  // Barkod/skaner → məhsulu tap, sətrə əlavə et (varsa say +1); default baza vahid + son qiymət
  const addItem = async (item: Item) => {
    const [us, prices] = await Promise.all([
      itemMeasurementService.list(item.code).catch(() => [] as ItemMeasurement[]),
      itemService.lastPrices(item.code).catch(() => [] as ItemLastPrice[]),
    ]);
    const lp = lastPriceFor(prices, item.base_measure_code, null);
    setRows((rs) => {
      const hit = rs.findIndex((r) => r.item_code === item.code && r.measure_code === item.base_measure_code && !r.meas_weight);
      if (hit >= 0) return rs.map((r, idx) => (idx === hit ? { ...r, qty: String((Number(r.qty) || 0) + 1) } : r));
      const nr: Row = { item_code: item.code, item_name: nameOf(item), base_measure_code: item.base_measure_code, units: us, measure_code: item.base_measure_code, meas_weight: null, lastPrices: prices, qty: '1', price: lp ?? '' };
      const empty = rs.findIndex((r) => !r.item_code);
      return empty >= 0 ? rs.map((r, idx) => (idx === empty ? nr : r)) : [...rs, nr];
    });
  };

  // Variant dəyişəndə → həmin variantın son qiyməti düşür (varsa)
  const onMeasureChange = (i: number, key: string) => {
    const r = rows[i];
    const opt = rowMeasureOptions(r).find((o) => o.key === key);
    if (!opt) return;
    const lp = lastPriceFor(r.lastPrices, opt.measure_code, opt.meas_weight);
    setRow(i, { measure_code: opt.measure_code, meas_weight: opt.meas_weight, ...(lp ? { price: lp } : {}) });
  };

  const onBarcode = async () => {
    const v = barcode.trim();
    if (!v) return;
    setError('');
    try {
      const item = await itemService.byBarcode(v);
      await addItem(item);
      setBarcode('');
      focusBarcode();
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) setNotFoundBarcode(v);
      else setError(e instanceof ApiError ? e.message : t('common.error'));
      setBarcode('');
    }
  };

  const lineAmount = (r: Row) => (Number(r.qty) || 0) * (Number(r.price) || 0);
  const total = rows.reduce((s, r) => s + lineAmount(r), 0);
  const money = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const submit = async () => {
    const valid = rows.filter((r) => r.item_code && Number(r.qty) > 0);
    setSaving(true); setError('');
    try {
      await onSubmit(valid.map((r) => ({ item_code: r.item_code, measure_code: r.measure_code || null, meas_weight: r.meas_weight ? Number(r.meas_weight) : null, qty: Number(r.qty), unit_price: Number(r.price) || 0 })));
      onDone();
    } catch (e) { setError(e instanceof ApiError ? e.message : t('common.error')); setSaving(false); }
  };

  const cell = 'h-9 px-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:border-blue-500';

  return (
    <Modal open onClose={() => !saving && onClose()} title={t('finance.receipt')} size="lg"
      footer={<>
        <div className="mr-auto text-sm">{t('finance.total')}: <span className="font-bold text-gray-900 dark:text-white tabular-nums">{money(total)}</span></div>
        <Button variant="outline" onClick={onClose} disabled={saving}>{t('common.cancel')}</Button>
        <Button onClick={submit} loading={saving}>{t('common.save')}</Button>
      </>}>
      <div className="space-y-2">
        {error && <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600">{error}</div>}

        {/* Barkod skaner — həmişə fokuslu, Enter → axtar */}
        <div className="relative">
          <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            ref={barcodeRef}
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onBarcode(); } }}
            placeholder={t('finance.scanPlaceholder')}
            className="w-full h-11 pl-10 pr-4 rounded-lg border-2 border-dashed border-blue-300 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/20 text-sm outline-none focus:border-blue-500"
          />
        </div>

        <p className="text-xs text-gray-400">{t('finance.receiptHint')}</p>

        <div className="space-y-1.5">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <ItemPicker
                  value={r.item_code}
                  displayValue={r.item_name}
                  placeholder={t('finance.item')}
                  onChange={(_code, item) => { if (item) setRowItem(i, item); }}
                />
              </div>
              <select
                value={measKey(r.measure_code, r.meas_weight)}
                onChange={(e) => onMeasureChange(i, e.target.value)}
                disabled={!r.item_code}
                title={t('finance.measure')}
                className={cn(cell, 'w-40 disabled:opacity-50')}
              >
                {rowMeasureOptions(r).length === 0 && <option value="|">—</option>}
                {rowMeasureOptions(r).map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
              <input type="number" inputMode="decimal" value={r.qty} onChange={(e) => setRow(i, { qty: e.target.value })} className={cn(cell, 'w-16 text-right')} placeholder={t('finance.qty')} />
              <span className="text-gray-400 text-xs">×</span>
              <input type="number" inputMode="decimal" value={r.price} onChange={(e) => setRow(i, { price: e.target.value })} className={cn(cell, 'w-24 text-right')} placeholder={t('finance.price')} />
              <span className="w-24 text-right text-sm tabular-nums text-gray-600 dark:text-gray-300">{money(lineAmount(r))}</span>
              <button onClick={() => delRow(i)} className="text-gray-400 hover:text-red-500 shrink-0"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>

        <button onClick={addRow} className="text-sm text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 pt-1"><Plus className="w-4 h-4" /> {t('finance.addLine')}</button>
      </div>

      {/* Barkod tapılmadı → yeni məhsul yarat (barkod öncədən dolu) */}
      {notFoundBarcode !== null && (
        <ItemFormModal
          initialBarcode={notFoundBarcode}
          onClose={() => { setNotFoundBarcode(null); focusBarcode(); }}
          onSaved={(item) => { setNotFoundBarcode(null); addItem(item); focusBarcode(); }}
        />
      )}
    </Modal>
  );
}
