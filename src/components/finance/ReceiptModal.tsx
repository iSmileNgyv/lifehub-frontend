'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useContentLanguages } from '@/contexts/ContentLanguagesContext';
import { financeJournalService } from '@/services/financeJournalService';
import { ApiError } from '@/lib/api';
import { translateValue } from '@/lib/translate';
import { cn } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import ItemPicker from '@/components/pickers/ItemPicker';
import type { FinanceJournalEntry, FinanceJournalShow, Item } from '@/types';

interface Row { item_code: string; item_name: string; qty: string; price: string }

/** Bir maliyyə sətrinin məhsul detalı (çek) — item kataloqundan sətirlər; cəm = entry məbləği. */
export default function ReceiptModal({ code, entry, onClose, onSaved }: {
  code: string;
  entry: FinanceJournalEntry;
  onClose: () => void;
  onSaved: (d: FinanceJournalShow) => void;
}) {
  const { t, language } = useLanguage();
  const { defaultCode } = useContentLanguages();

  const [rows, setRows] = useState<Row[]>(() =>
    entry.lines.length
      ? entry.lines.map((l) => ({ item_code: l.item_code, item_name: translateValue(l.item_name ?? undefined, language, defaultCode) || l.item_code, qty: String(l.qty), price: String(l.unit_price) }))
      : [{ item_code: '', item_name: '', qty: '1', price: '' }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const setRow = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () => setRows((rs) => [...rs, { item_code: '', item_name: '', qty: '1', price: '' }]);
  const delRow = (i: number) => setRows((rs) => rs.filter((_, idx) => idx !== i));

  const lineAmount = (r: Row) => (Number(r.qty) || 0) * (Number(r.price) || 0);
  const total = rows.reduce((s, r) => s + lineAmount(r), 0);
  const money = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const submit = async () => {
    const valid = rows.filter((r) => r.item_code && Number(r.qty) > 0);
    setSaving(true); setError('');
    try {
      const d = await financeJournalService.saveLines(code, entry.uid,
        valid.map((r) => ({ item_code: r.item_code, qty: Number(r.qty), unit_price: Number(r.price) || 0 })));
      onSaved(d);
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
        <p className="text-xs text-gray-400">{t('finance.receiptHint')}</p>

        <div className="space-y-1.5">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <ItemPicker
                  value={r.item_code}
                  displayValue={r.item_name}
                  placeholder={t('finance.item')}
                  onChange={(code2, item?: Item) => setRow(i, { item_code: code2, item_name: item ? (translateValue(item.name, language, defaultCode) || code2) : code2 })}
                />
              </div>
              <input type="number" inputMode="decimal" value={r.qty} onChange={(e) => setRow(i, { qty: e.target.value })} className={cn(cell, 'w-20 text-right')} placeholder={t('finance.qty')} />
              <span className="text-gray-400 text-xs">×</span>
              <input type="number" inputMode="decimal" value={r.price} onChange={(e) => setRow(i, { price: e.target.value })} className={cn(cell, 'w-24 text-right')} placeholder={t('finance.price')} />
              <span className="w-24 text-right text-sm tabular-nums text-gray-600 dark:text-gray-300">{money(lineAmount(r))}</span>
              <button onClick={() => delRow(i)} className="text-gray-400 hover:text-red-500 shrink-0"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>

        <button onClick={addRow} className="text-sm text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 pt-1"><Plus className="w-4 h-4" /> {t('finance.addLine')}</button>
      </div>
    </Modal>
  );
}
