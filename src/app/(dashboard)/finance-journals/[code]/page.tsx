'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, Plus, Pencil, Trash2, X, CheckCircle2, Receipt } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useContentLanguages } from '@/contexts/ContentLanguagesContext';
import { useAuth } from '@/contexts/AuthContext';
import { financeJournalService, type EntryPayload } from '@/services/financeJournalService';
import { financeCategoryService } from '@/services/financeCategoryService';
import { cashDeskService } from '@/services/cashDeskService';
import { ApiError } from '@/lib/api';
import { translateValue } from '@/lib/translate';
import { fmtDate, cn } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import ReceiptModal from '@/components/finance/ReceiptModal';
import FinanceCategoryPicker from '@/components/pickers/FinanceCategoryPicker';
import CashDeskPicker from '@/components/pickers/CashDeskPicker';
import type { CashDesk, FinanceCategory, FinanceJournalEntry, FinanceJournalShow, Translatable } from '@/types';

export default function FinanceJournalDetailPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const { t, language } = useLanguage();
  const { defaultCode } = useContentLanguages();
  const { can } = useAuth();
  const tr = (v: Translatable | null | undefined, fb: string) => translateValue(v ?? undefined, language, defaultCode) || fb;

  const [data, setData] = useState<FinanceJournalShow | null>(null);
  const [desks, setDesks] = useState<CashDesk[]>([]);
  const [cats, setCats] = useState<FinanceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState<FinanceJournalEntry | 'new' | null>(null);
  const [receipt, setReceipt] = useState<FinanceJournalEntry | null>(null);
  const [del, setDel] = useState<FinanceJournalEntry | null>(null);
  const [confirmPost, setConfirmPost] = useState(false);
  const [posting, setPosting] = useState(false);

  const load = useCallback(() => {
    financeJournalService.get(code).then(setData)
      .catch((e) => setError(e instanceof ApiError ? e.message : '')).finally(() => setLoading(false));
  }, [code]);

  useEffect(() => {
    load();
    cashDeskService.list().then((r) => setDesks(r.data)).catch(() => {});
    financeCategoryService.list().then(setCats).catch(() => {});
  }, [load]);

  const entries = data?.entries ?? [];
  const totals = useMemo(() => {
    let income = 0, expense = 0;
    for (const e of entries) { const a = Number(e.amount_lcy); if (e.entry_type === 'income') income += a; else if (e.entry_type === 'expense') expense += a; } // transfer atlanır
    return { income, expense, net: income - expense };
  }, [entries]);

  const doDelete = async () => {
    if (!del) return;
    try { setData(await financeJournalService.deleteEntry(code, del.uid)); setDel(null); }
    catch (e) { setError(e instanceof ApiError ? e.message : t('common.error')); }
  };

  const doPost = async () => {
    setConfirmPost(false); setPosting(true); setError('');
    try { await financeJournalService.post(code); router.push('/finance-journals'); }
    catch (e) { setError(e instanceof ApiError ? e.message : t('common.error')); setPosting(false); }
  };

  const money = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div>
      <button onClick={() => router.push('/finance-journals')} className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft className="w-4 h-4" /> {t('finance.back')}
      </button>

      {loading ? <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
        : !data ? <div className="py-16 text-center text-sm text-gray-400">{t('common.error')}</div>
          : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">{fmtDate(data.journal.journal_date)}</h1>
                  <p className="text-sm text-gray-500">{data.journal.code}{data.journal.descr ? ` · ${data.journal.descr}` : ''}</p>
                </div>
                <div className="flex gap-2">
                  {can('FINANCE_CREATE') && <Button variant="outline" onClick={() => setForm('new')}><Plus className="w-4 h-4 mr-1" /> {t('finance.addEntry')}</Button>}
                  {can('FINANCE_POST') && <Button onClick={() => setConfirmPost(true)} loading={posting} disabled={entries.length === 0}><CheckCircle2 className="w-4 h-4 mr-1" /> {t('finance.post')}</Button>}
                </div>
              </div>

              {error && <div className="mb-4 flex items-center justify-between px-4 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600">{error}<button onClick={() => setError('')}><X className="w-4 h-4" /></button></div>}

              {/* Cəmlər */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 px-3 py-2"><p className="text-xs text-gray-500">{t('finance.income')}</p><p className="text-base font-bold text-emerald-600 tabular-nums">{money(totals.income)}</p></div>
                <div className="rounded-lg bg-red-50 dark:bg-red-950/20 px-3 py-2"><p className="text-xs text-gray-500">{t('finance.expense')}</p><p className="text-base font-bold text-red-500 tabular-nums">{money(totals.expense)}</p></div>
                <div className="rounded-lg bg-gray-50 dark:bg-gray-800/40 px-3 py-2"><p className="text-xs text-gray-500">{t('finance.net')}</p><p className={cn('text-base font-bold tabular-nums', totals.net >= 0 ? 'text-emerald-600' : 'text-red-500')}>{money(totals.net)}</p></div>
              </div>

              {entries.length === 0 && !can('FINANCE_CREATE') ? <div className="py-12 text-center text-sm text-gray-400">{t('finance.noEntries')}</div>
                : (
                  <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-900/60 text-gray-500 text-xs uppercase">
                        <tr>
                          <th className="text-left font-medium px-3 py-2.5">{t('finance.date')}</th>
                          <th className="text-left font-medium px-3 py-2.5">{t('finance.type')}</th>
                          <th className="text-left font-medium px-3 py-2.5">{t('finance.account')}</th>
                          <th className="text-left font-medium px-3 py-2.5">{t('finance.category')}</th>
                          <th className="text-left font-medium px-3 py-2.5">{t('finance.note')}</th>
                          <th className="text-right font-medium px-3 py-2.5">{t('finance.amount')}</th>
                          <th className="w-16" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {entries.map((e) => (
                          <EntryRow
                            key={e.uid}
                            entry={e}
                            code={code}
                            desks={desks}
                            cats={cats}
                            tr={tr}
                            canUpdate={can('FINANCE_UPDATE')}
                            canDelete={can('FINANCE_DELETE')}
                            onSaved={setData}
                            onEdit={() => setForm(e)}
                            onReceipt={() => setReceipt(e)}
                            onDelete={() => setDel(e)}
                            onError={setError}
                          />
                        ))}
                        {can('FINANCE_CREATE') && desks.length > 0 && (
                          <NewEntryRow code={code} journalDate={data.journal.journal_date} desks={desks} cats={cats} tr={tr} lastEntry={entries[entries.length - 1]} onSaved={setData} onError={setError} />
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
            </>
          )}

      {form && (
        <EntryForm
          code={code}
          entry={form === 'new' ? null : form}
          desks={desks}
          cats={cats}
          tr={tr}
          onClose={() => setForm(null)}
          onSaved={(d) => { setData(d); setForm(null); }}
        />
      )}
      {receipt && (
        <ReceiptModal
          initialLines={receipt.lines}
          onClose={() => setReceipt(null)}
          onSubmit={async (lines) => { setData(await financeJournalService.saveLines(code, receipt.uid, lines)); }}
          onDone={() => setReceipt(null)}
        />
      )}
      <ConfirmDialog open={!!del} message={t('finance.deleteEntryWarn')} onConfirm={doDelete} onCancel={() => setDel(null)} />
      <ConfirmDialog open={confirmPost} message={t('finance.postConfirm')} onConfirm={doPost} onCancel={() => setConfirmPost(false)} />
    </div>
  );
}

/** İnline redaktə olunan sətir — xanalar birbaşa dəyişilir (modal da paralel qalır). */
function EntryRow({ entry, code, desks, cats, tr, canUpdate, canDelete, onSaved, onEdit, onReceipt, onDelete, onError }: {
  entry: FinanceJournalEntry;
  code: string;
  desks: CashDesk[];
  cats: FinanceCategory[];
  tr: (v: Translatable | null | undefined, fb: string) => string;
  canUpdate: boolean;
  canDelete: boolean;
  onSaved: (d: FinanceJournalShow) => void;
  onEdit: () => void;
  onReceipt: () => void;
  onDelete: () => void;
  onError: (m: string) => void;
}) {
  const { t } = useLanguage();
  const [amount, setAmount] = useState(String(entry.amount_lcy));
  const hasLines = entry.lines.length > 0;
  const [descr, setDescr] = useState(entry.descr ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setAmount(String(entry.amount_lcy)); setDescr(entry.descr ?? ''); }, [entry.amount_lcy, entry.descr]);

  const type = entry.entry_type;
  const cellSel = 'w-full h-8 px-2 rounded-md border border-transparent hover:border-gray-300 dark:hover:border-gray-700 bg-transparent text-sm outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-gray-900';
  const amtColor = type === 'income' ? 'text-emerald-600' : type === 'expense' ? 'text-red-500' : 'text-blue-500';

  const save = async (over: Partial<EntryPayload>) => {
    if (!canUpdate) return;
    const payload: EntryPayload = {
      posting_date: entry.posting_date,
      entry_type: type,
      cash_desk_code: entry.cash_desk_code,
      to_cash_desk_code: entry.to_cash_desk_code,
      category_code: entry.category_code,
      amount_lcy: Number(amount) || 0,
      descr: descr || null,
      ...over,
    };
    setSaving(true);
    try { onSaved(await financeJournalService.updateEntry(code, entry.uid, payload)); }
    catch (e) { onError(e instanceof ApiError ? e.message : t('common.error')); }
    finally { setSaving(false); }
  };

  return (
    <tr className={cn('group hover:bg-gray-50/60 dark:hover:bg-gray-800/30', saving && 'opacity-60')}>
      <td className="px-2 py-1">
        <input disabled={!canUpdate} type="date" value={entry.posting_date ?? ''} onChange={(e) => save({ posting_date: e.target.value || null })} className={cn(cellSel, 'w-36')} />
      </td>
      <td className="px-2 py-1">
        <select disabled={!canUpdate} value={type}
          onChange={(e) => { const nt = e.target.value as EntryPayload['entry_type']; save(nt === 'transfer' ? { entry_type: nt, category_code: null } : { entry_type: nt, category_code: null, to_cash_desk_code: null }); }}
          className={cn(cellSel, 'font-medium', amtColor)}>
          <option value="income">{t('finance.income')}</option>
          <option value="expense">{t('finance.expense')}</option>
          <option value="transfer">{t('finance.transfer')}</option>
        </select>
      </td>
      <td className="px-2 py-1 min-w-[9rem]">
        <CashDeskPicker value={entry.cash_desk_code} displayValue={tr(desks.find((d) => d.code === entry.cash_desk_code)?.description, entry.cash_desk_code)} onChange={(c) => save({ cash_desk_code: c })} disabled={!canUpdate} />
      </td>
      <td className="px-2 py-1 min-w-[9rem]">
        {type === 'transfer' ? (
          <CashDeskPicker value={entry.to_cash_desk_code ?? ''} displayValue={entry.to_cash_desk_code ? tr(desks.find((d) => d.code === entry.to_cash_desk_code)?.description, entry.to_cash_desk_code) : ''} onChange={(c) => save({ to_cash_desk_code: c || null })} exclude={entry.cash_desk_code} disabled={!canUpdate} placeholder={`→ ${t('finance.toAccount')}`} />
        ) : (
          <FinanceCategoryPicker value={entry.category_code ?? ''} type={type as 'income' | 'expense'} displayValue={entry.category_code ? tr(cats.find((c) => c.code === entry.category_code)?.name, entry.category_code) : ''} onChange={(c) => save({ category_code: c || null })} disabled={!canUpdate} />
        )}
      </td>
      <td className="px-2 py-1">
        <input disabled={!canUpdate} value={descr} onChange={(e) => setDescr(e.target.value)}
          onBlur={() => { if ((descr || '') !== (entry.descr ?? '')) save({ descr: descr || null }); }}
          className={cellSel} placeholder="—" />
      </td>
      <td className="px-2 py-1">
        <input disabled={!canUpdate || hasLines} type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)}
          onBlur={() => { if (!hasLines && Number(amount) !== Number(entry.amount_lcy)) save({ amount_lcy: Number(amount) || 0 }); }}
          title={hasLines ? t('finance.amountFromReceipt') : undefined}
          className={cn(cellSel, 'text-right tabular-nums font-semibold', amtColor, hasLines && 'cursor-not-allowed')} />
      </td>
      <td className="px-2 py-1">
        <div className="flex gap-1.5 items-center justify-end">
          {canUpdate && type !== 'transfer' && (
            <button onClick={onReceipt} title={t('finance.receipt')} className={cn('relative', hasLines ? 'text-indigo-600' : 'text-gray-400 hover:text-indigo-600')}>
              <Receipt className="w-[18px] h-[18px]" />
              {hasLines && <span className="absolute -top-1.5 -right-1.5 text-[9px] font-bold bg-indigo-600 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center">{entry.lines.length}</span>}
            </button>
          )}
          {canUpdate && type !== 'transfer' && <button onClick={onEdit} title={t('common.edit')} className="text-gray-400 hover:text-blue-600"><Pencil className="w-[18px] h-[18px]" /></button>}
          {canDelete && <button onClick={onDelete} title={t('common.delete')} className="text-gray-400 hover:text-red-500"><Trash2 className="w-[18px] h-[18px]" /></button>}
        </div>
      </td>
    </tr>
  );
}

/** Cədvəlin sonundakı həmişə boş sətir — doldurulanda avtomatik insert (Excel kimi). */
function NewEntryRow({ code, journalDate, desks, cats, tr, lastEntry, onSaved, onError }: {
  code: string;
  journalDate: string;
  desks: CashDesk[];
  cats: FinanceCategory[];
  tr: (v: Translatable | null | undefined, fb: string) => string;
  lastEntry?: FinanceJournalEntry;
  onSaved: (d: FinanceJournalShow) => void;
  onError: (m: string) => void;
}) {
  const { t } = useLanguage();
  const [date, setDate] = useState(lastEntry?.posting_date ?? journalDate);
  const [type, setType] = useState<'income' | 'expense' | 'transfer'>('expense');
  const [desk, setDesk] = useState(lastEntry?.cash_desk_code ?? desks[0]?.code ?? '');
  const [toDesk, setToDesk] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [descr, setDescr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!desk && desks[0]) setDesk(desks[0].code); }, [desks, desk]);
  // Yeni sətir üstdəki (sonuncu) sətrin tarixi + hesabını götürsün (hər dəfə dəyişməyəsən)
  useEffect(() => {
    if (lastEntry) { setDate(lastEntry.posting_date ?? journalDate); setDesk(lastEntry.cash_desk_code); }
  }, [lastEntry?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const cellSel = 'w-full h-8 px-2 rounded-md border border-transparent hover:border-gray-300 dark:hover:border-gray-700 bg-transparent text-sm outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-gray-900';
  const amtColor = type === 'income' ? 'text-emerald-600' : type === 'expense' ? 'text-red-500' : 'text-blue-500';

  // amount>0 (+ transfer üçün hədəf hesab) olanda → yeni entry yarat, sonra sıfırla (type/hesab/tarix saxlanır)
  const tryInsert = async (over: Partial<EntryPayload> = {}) => {
    if (saving) return;
    const a = over.amount_lcy ?? Number(amount);
    const dk = over.cash_desk_code ?? desk;
    const td = over.to_cash_desk_code !== undefined ? over.to_cash_desk_code : (toDesk || null);
    if (!(a > 0) || !dk) return;
    if (type === 'transfer' && (!td || td === dk)) return; // transfer üçün fərqli hədəf lazım
    const payload: EntryPayload = {
      posting_date: date || journalDate,
      entry_type: over.entry_type ?? type,
      cash_desk_code: dk,
      to_cash_desk_code: type === 'transfer' ? td : null,
      category_code: type === 'transfer' ? null : (over.category_code !== undefined ? over.category_code : (category || null)),
      amount_lcy: a,
      descr: over.descr !== undefined ? over.descr : (descr || null),
    };
    setSaving(true);
    try {
      const d = await financeJournalService.addEntry(code, payload);
      setCategory(''); setAmount(''); setDescr(''); setToDesk(''); // type/desk/tarix saxla
      onSaved(d);
    } catch (e) { onError(e instanceof ApiError ? e.message : t('common.error')); }
    finally { setSaving(false); }
  };

  return (
    <tr className={cn('bg-blue-50/30 dark:bg-blue-950/10', saving && 'opacity-60')}>
      <td className="px-2 py-1">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={cn(cellSel, 'w-36')} />
      </td>
      <td className="px-2 py-1">
        <select value={type} onChange={(e) => { setType(e.target.value as 'income' | 'expense' | 'transfer'); setCategory(''); setToDesk(''); }}
          className={cn(cellSel, 'font-medium', amtColor)}>
          <option value="income">{t('finance.income')}</option>
          <option value="expense">{t('finance.expense')}</option>
          <option value="transfer">{t('finance.transfer')}</option>
        </select>
      </td>
      <td className="px-2 py-1 min-w-[9rem]">
        <CashDeskPicker value={desk} displayValue={tr(desks.find((d) => d.code === desk)?.description, desk)} onChange={(c) => setDesk(c)} />
      </td>
      <td className="px-2 py-1 min-w-[9rem]">
        {type === 'transfer' ? (
          <CashDeskPicker value={toDesk} displayValue={toDesk ? tr(desks.find((d) => d.code === toDesk)?.description, toDesk) : ''} exclude={desk} placeholder={`→ ${t('finance.toAccount')}`} onChange={(c) => { setToDesk(c); tryInsert({ to_cash_desk_code: c || null }); }} />
        ) : (
          <FinanceCategoryPicker value={category} type={type as 'income' | 'expense'} displayValue={category ? tr(cats.find((c) => c.code === category)?.name, category) : ''} onChange={(c) => { setCategory(c); tryInsert({ category_code: c || null }); }} />
        )}
      </td>
      <td className="px-2 py-1">
        <input value={descr} onChange={(e) => setDescr(e.target.value)} onBlur={() => tryInsert()} className={cellSel} placeholder={t('finance.newRowHint')} />
      </td>
      <td className="px-2 py-1">
        <input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)}
          onBlur={() => tryInsert()}
          onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); } }}
          className={cn(cellSel, 'text-right tabular-nums font-semibold', amtColor)} placeholder="0.00" />
      </td>
      <td className="px-2 py-1">{saving && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}</td>
    </tr>
  );
}

function EntryForm({ code, entry, desks, cats, tr, onClose, onSaved }: {
  code: string;
  entry: FinanceJournalEntry | null;
  desks: CashDesk[];
  cats: FinanceCategory[];
  tr: (v: Translatable | null | undefined, fb: string) => string;
  onClose: () => void;
  onSaved: (d: FinanceJournalShow) => void;
}) {
  const { t } = useLanguage();
  const [type, setType] = useState<'income' | 'expense'>(entry?.entry_type === 'income' ? 'income' : 'expense');
  const [desk, setDesk] = useState(entry?.cash_desk_code ?? desks[0]?.code ?? '');
  const [category, setCategory] = useState<string>(entry?.category_code ?? '');
  const [amount, setAmount] = useState(entry ? String(entry.amount_lcy) : '');
  const [descr, setDescr] = useState(entry?.descr ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');


  const submit = async () => {
    setError(''); setLoading(true);
    const payload: EntryPayload = { entry_type: type, cash_desk_code: desk, category_code: category || null, amount_lcy: Number(amount), descr: descr || null };
    try {
      const d = entry ? await financeJournalService.updateEntry(code, entry.uid, payload) : await financeJournalService.addEntry(code, payload);
      onSaved(d);
    } catch (e) { setError(e instanceof ApiError ? e.message : t('common.error')); }
    finally { setLoading(false); }
  };

  return (
    <Modal open onClose={() => !loading && onClose()} title={entry ? t('common.edit') : t('finance.addEntry')} size="sm"
      footer={<><Button variant="outline" onClick={onClose} disabled={loading}>{t('common.cancel')}</Button><Button onClick={submit} loading={loading} disabled={!desk || !amount}>{t('common.save')}</Button></>}>
      <div className="space-y-3">
        {error && <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600">{error}</div>}
        {/* gəlir/xərc toggle */}
        <div className="grid grid-cols-2 gap-2">
          {(['income', 'expense'] as const).map((tp) => (
            <button key={tp} onClick={() => { setType(tp); setCategory(''); }}
              className={cn('h-9 rounded-lg text-sm font-medium border', type === tp
                ? tp === 'income' ? 'bg-emerald-50 border-emerald-400 text-emerald-600 dark:bg-emerald-950/30' : 'bg-red-50 border-red-400 text-red-500 dark:bg-red-950/30'
                : 'border-gray-300 dark:border-gray-700 text-gray-500')}>
              {t(`finance.${tp}`)}
            </button>
          ))}
        </div>
        <CashDeskPicker label={t('finance.account')} value={desk} displayValue={desk ? tr(desks.find((d) => d.code === desk)?.description, desk) : ''} onChange={(c) => setDesk(c)} />
        <FinanceCategoryPicker label={t('finance.category')} value={category} type={type} displayValue={category ? tr(cats.find((c) => c.code === category)?.name, category) : ''} onChange={(c) => setCategory(c)} />
        <Input type="number" label={t('finance.amount')} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
        <Input label={t('finance.note')} value={descr} onChange={(e) => setDescr(e.target.value)} />
      </div>
    </Modal>
  );
}
