'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, X, Plus, Gauge, Trash2, RefreshCw, TrendingUp, Wrench, Wallet, Fuel } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fmtDate } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useContentLanguages } from '@/contexts/ContentLanguagesContext';
import { useAuth } from '@/contexts/AuthContext';
import { vehicleService, kmToUnit, unitToKm } from '@/services/vehicleService';
import ItemPicker from '@/components/pickers/ItemPicker';
import { ApiError } from '@/lib/api';
import { translateValue } from '@/lib/translate';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import type { Item, ServiceStatus, Vehicle, VehicleExpenseRow, VehicleFuelRow, VehicleServiceRow, VehicleUnit } from '@/types';

const STATUS: Record<ServiceStatus, { bar: string; text: string; ring: string }> = {
  ok: { bar: 'bg-green-500', text: 'text-green-600', ring: 'border-green-200 dark:border-green-900' },
  soon: { bar: 'bg-amber-500', text: 'text-amber-600', ring: 'border-amber-200 dark:border-amber-900' },
  overdue: { bar: 'bg-red-500', text: 'text-red-600', ring: 'border-red-300 dark:border-red-800' },
};

export default function VehicleDetailPage() {
  const { uid } = useParams<{ uid: string }>();
  const router = useRouter();
  const { t } = useLanguage();
  const { can } = useAuth();

  const [v, setV] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unit, setUnit] = useState<VehicleUnit>('km');
  const [addReading, setAddReading] = useState(false);
  const [addService, setAddService] = useState(false);
  const [undo, setUndo] = useState<string | null>(null);
  const [tab, setTab] = useState<'components' | 'fuel' | 'expenses'>('components');

  const canEdit = can('VEHICLE_UPDATE');

  const load = useCallback(() => {
    vehicleService.show(uid).then((d) => { setV(d); setUnit(d.unit); }).catch((e) => setError(e instanceof ApiError ? e.message : 'error')).finally(() => setLoading(false));
  }, [uid]);
  useEffect(() => { load(); }, [load]);

  const closeSvc = async (suid: string) => {
    try { await vehicleService.closeService(uid, suid); setUndo(suid); load(); setTimeout(() => setUndo((u) => (u === suid ? null : u)), 8000); }
    catch (e) { setError(e instanceof ApiError ? e.message : t('common.error')); }
  };
  const reactivate = async (suid: string) => {
    try { await vehicleService.reactivateService(uid, suid); setUndo(null); load(); }
    catch (e) { setError(e instanceof ApiError ? e.message : t('common.error')); }
  };
  const [confirmDel, setConfirmDel] = useState<{ msg: string; fn: () => Promise<unknown>; after?: () => void } | null>(null);
  const askDelete = (msg: string, fn: () => Promise<unknown>, after?: () => void) => setConfirmDel({ msg, fn, after });
  const runConfirm = async () => {
    if (!confirmDel) return;
    try { await confirmDel.fn(); load(); confirmDel.after?.(); } catch (e) { setError(e instanceof ApiError ? e.message : t('common.error')); }
    finally { setConfirmDel(null); }
  };
  const delReading = (ruid: string) => askDelete(t('vehicle.confirmDeleteReading'), () => vehicleService.removeReading(uid, ruid));

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>;
  if (!v) return <div className="py-16 text-center text-sm text-gray-400">{error || t('common.error')}</div>;

  const km = (val: number | null) => (val === null ? null : Math.round(kmToUnit(Number(val), unit)));
  const active = (v.services ?? []).filter((s) => s.active);
  const history = (v.services ?? []).filter((s) => !s.active);

  return (
    <div>
      <button onClick={() => router.push('/vehicles')} className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"><ArrowLeft className="w-4 h-4" /> {t('vehicle.title')}</button>

      <PageHeader
        title={v.name}
        subtitle={v.plate || undefined}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden text-sm">
              {(['km', 'mi'] as const).map((u) => (
                <button key={u} onClick={() => setUnit(u)} className={cn('px-3 py-1.5', unit === u ? 'bg-blue-600 text-white' : 'text-gray-500')}>{u}</button>
              ))}
            </div>
            {canEdit && <Button variant="outline" onClick={() => setAddReading(true)}><Gauge className="w-4 h-4 mr-1" /> {t('vehicle.addReading')}</Button>}
          </div>
        }
      />

      {error && (
        <div className="mb-4 flex items-center justify-between px-4 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
          {error}<button onClick={() => setError('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Üst göstəricilər */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Stat icon={<Gauge className="w-4 h-4" />} label={t('vehicle.currentKm')} value={km(v.current_km) !== null ? `${km(v.current_km)!.toLocaleString()} ${unit}` : '—'} />
        <Stat icon={<TrendingUp className="w-4 h-4" />} label={t('vehicle.pace')} value={v.pace ? `${kmToUnit(Number(v.pace), unit).toFixed(1)} ${unit}/${t('vehicle.day')}` : '—'} />
        <Stat icon={<Gauge className="w-4 h-4" />} label={t('vehicle.projected')} value={km(v.projected_km) !== null ? `${km(v.projected_km)!.toLocaleString()} ${unit}` : '—'} />
        <Stat icon={<RefreshCw className="w-4 h-4" />} label={t('vehicle.lastReading')} value={v.last_reading_date ? fmtDate(v.last_reading_date) : '—'} />
      </div>

      {/* Xərc / sərfiyyat */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        <Stat icon={<Wallet className="w-4 h-4" />} label={t('vehicle.costMonth')} value={`${(v.cost_month ?? 0).toFixed(2)} ₼`} />
        <Stat icon={<Wallet className="w-4 h-4" />} label={t('vehicle.costYear')} value={`${(v.cost_year ?? 0).toFixed(2)} ₼`} />
        <Stat icon={<Fuel className="w-4 h-4" />} label={t('vehicle.avgConsumption')} value={v.avg_consumption ? `${v.avg_consumption} L/100km` : '—'} />
      </div>

      {/* Tab-lar */}
      <div className="flex gap-1 mb-4 border-b border-gray-200 dark:border-gray-800">
        {(['components', 'fuel', 'expenses'] as const).map((tk) => (
          <button key={tk} onClick={() => setTab(tk)} className={cn('px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors', tab === tk ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200')}>{t(`vehicle.tab_${tk}`)}</button>
        ))}
      </div>

      {tab === 'fuel' && <FuelSection vehicleUid={uid} unit={unit} canEdit={canEdit} suggestedKm={v.projected_km ?? v.current_km} onError={setError} askDelete={askDelete} />}
      {tab === 'expenses' && <ExpensesSection vehicleUid={uid} canEdit={canEdit} onError={setError} askDelete={askDelete} />}

      {tab === 'components' && (<>
      {/* Komponentlər */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('vehicle.components')}</h2>
        {canEdit && <Button size="sm" onClick={() => setAddService(true)}><Plus className="w-4 h-4 mr-1" /> {t('vehicle.addService')}</Button>}
      </div>

      {active.length === 0 ? (
        <div className="py-10 text-center text-sm text-gray-400">{t('vehicle.noComponents')}</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {active.map((s) => <ServiceCard key={s.uid} s={s} unit={unit} canEdit={canEdit} onClose={() => closeSvc(s.uid)} onDelete={() => askDelete(t('vehicle.confirmDeleteService'), () => vehicleService.removeService(uid, s.uid))} />)}
        </div>
      )}

      {(v.readings ?? []).length > 0 && (
        <details className="mt-6">
          <summary className="text-sm text-gray-500 cursor-pointer">{t('vehicle.readingsHistory')} ({(v.readings ?? []).length})</summary>
          <div className="mt-2 rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 max-w-md">
            {(v.readings ?? []).map((r) => (
              <div key={r.uid} className="flex items-center gap-3 px-4 py-2 text-sm">
                <span className="text-gray-400 whitespace-nowrap">{fmtDate(r.reading_date)}</span>
                <span className="font-mono font-medium text-gray-800 dark:text-gray-100">{Math.round(kmToUnit(Number(r.km), unit)).toLocaleString()} {unit}</span>
                {canEdit && <button onClick={() => delReading(r.uid)} className="ml-auto text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>}
              </div>
            ))}
          </div>
        </details>
      )}

      {history.length > 0 && (
        <details className="mt-6">
          <summary className="text-sm text-gray-500 cursor-pointer">{t('vehicle.history')} ({history.length})</summary>
          <div className="mt-2 space-y-1 text-sm text-gray-400">
            {history.map((s) => <HistoryRow key={s.uid} s={s} canUndo={canEdit && s.can_undo} onReactivate={() => reactivate(s.uid)} />)}
          </div>
        </details>
      )}
      </>)}

      <ConfirmDialog
        open={!!confirmDel}
        message={confirmDel?.msg ?? ''}
        onConfirm={runConfirm}
        onCancel={() => setConfirmDel(null)}
      />

      {/* Geri al snackbar (bağlamadan sonra) */}
      {undo && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-5 py-3 rounded-xl bg-gray-900 text-white shadow-2xl">
          <span className="text-sm">{t('vehicle.movedToHistory')}</span>
          <button onClick={() => reactivate(undo)} className="text-sm font-semibold text-blue-300 hover:text-blue-200">{t('vehicle.undo')}</button>
          <button onClick={() => setUndo(null)} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
      )}

      {addReading && <ReadingModal vehicleUid={uid} unit={unit} suggestedKm={v.current_km} onClose={() => setAddReading(false)} onSaved={() => { setAddReading(false); load(); }} />}
      {addService && <ServiceModal vehicleUid={uid} unit={unit} installedKm={v.projected_km ?? v.current_km} onClose={() => setAddService(false)} onSaved={() => { setAddService(false); load(); }} />}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3">
      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">{icon} {label}</div>
      <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

function ServiceCard({ s, unit, canEdit, onClose, onDelete }: { s: VehicleServiceRow; unit: VehicleUnit; canEdit: boolean; onClose: () => void; onDelete: () => void }) {
  const { t, language } = useLanguage();
  const { defaultCode } = useContentLanguages();
  const st = STATUS[s.status];
  const pct = Math.min(Math.max(s.used_pct, 0), 100);
  const name = translateValue(s.item_name ?? undefined, language, defaultCode) || s.item_code || '—';
  const catName = translateValue(s.category_name ?? undefined, language, defaultCode);
  const remKm = s.remaining_km !== null ? Math.round(kmToUnit(s.remaining_km, unit)) : null;

  const daysLabel = s.days_left === null ? '—'
    : s.days_left < 0 ? t('vehicle.overdueDays').replace('{n}', String(Math.abs(s.days_left)))
      : t('vehicle.daysLeft').replace('{n}', String(s.days_left));

  return (
    <div className={cn('rounded-2xl border-2 bg-white dark:bg-gray-900 p-4', st.ring)}>
      <div className="flex items-start gap-2 mb-3">
        <Wrench className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 dark:text-white leading-tight">{name}</p>
          {catName && <p className="text-xs text-gray-400 mt-0.5">{catName}</p>}
        </div>
        {canEdit && (
          <div className="flex gap-1">
            <button onClick={onClose} title={t('vehicle.replaced')} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600"><RefreshCw className="w-4 h-4" /></button>
            <button onClick={onDelete} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between mb-1">
        <span className={cn('text-2xl font-bold', st.text)}>{daysLabel}</span>
        <span className="text-xs text-gray-400">{s.used_pct.toFixed(0)}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden mb-3">
        <div className={cn('h-full rounded-full transition-all', st.bar)} style={{ width: `${pct}%` }} />
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
        {s.life_km !== null && (
          <div><span className="text-gray-400">{t('vehicle.byKm')}: </span>{remKm !== null ? `${remKm.toLocaleString()} ${unit}` : '—'}{s.days_to_due_km !== null && <span className="text-gray-400"> · {s.days_to_due_km} {t('vehicle.day')}</span>}</div>
        )}
        {s.life_months !== null && (
          <div><span className="text-gray-400">{t('vehicle.byTime')}: </span>{s.remaining_days_time !== null ? `${s.remaining_days_time} ${t('vehicle.day')}` : '—'}</div>
        )}
      </div>
    </div>
  );
}

function HistoryRow({ s, canUndo, onReactivate }: { s: VehicleServiceRow; canUndo: boolean; onReactivate: () => void }) {
  const { t, language } = useLanguage();
  const { defaultCode } = useContentLanguages();
  const name = translateValue(s.item_name ?? undefined, language, defaultCode) || s.item_code || '—';
  return (
    <div className="flex items-center gap-2">
      <span className="line-through">{name}</span>
      <span className="text-xs">· {fmtDate(s.installed_date)}</span>
      {canUndo && <button onClick={onReactivate} className="ml-auto text-xs font-medium text-blue-500 hover:underline">{t('vehicle.undo')}</button>}
    </div>
  );
}

function ReadingModal({ vehicleUid, unit, suggestedKm, onClose, onSaved }: { vehicleUid: string; unit: VehicleUnit; suggestedKm: number | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useLanguage();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [val, setVal] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    const num = Number(val);
    if (!num) return;
    setSaving(true); setError('');
    try { await vehicleService.addReading(vehicleUid, { reading_date: date, km: unitToKm(num, unit) }); onSaved(); }
    catch (e) { setError(e instanceof ApiError ? e.message : t('common.error')); }
    finally { setSaving(false); }
  };

  return (
    <Modal open onClose={() => !saving && onClose()} title={t('vehicle.addReading')} size="sm"
      footer={<><Button variant="outline" onClick={onClose} disabled={saving}>{t('common.cancel')}</Button><Button onClick={submit} loading={saving}>{t('common.save')}</Button></>}>
      <div className="space-y-3">
        {error && <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600 dark:text-red-400">{error}</div>}
        <Input label={t('common.date')} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Input label={`${t('vehicle.odometer')} (${unit})`} type="number" value={val} onChange={(e) => setVal(e.target.value)} placeholder={suggestedKm ? String(Math.round(kmToUnit(suggestedKm, unit))) : ''} />
      </div>
    </Modal>
  );
}

function ServiceModal({ vehicleUid, unit, installedKm, onClose, onSaved }: { vehicleUid: string; unit: VehicleUnit; installedKm: number | null; onClose: () => void; onSaved: () => void }) {
  const { t, language } = useLanguage();
  const [itemCode, setItemCode] = useState('');
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [insKm, setInsKm] = useState(installedKm !== null ? String(Math.round(kmToUnit(installedKm, unit))) : '');
  const [lifeKm, setLifeKm] = useState('');
  const [lifeMonths, setLifeMonths] = useState('');
  const [amountVal, setAmountVal] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if ((!itemCode && !name.trim()) || !insKm) { setError(t('vehicle.fillRequired')); return; }
    if (!lifeKm && !lifeMonths) { setError(t('vehicle.needLife')); return; }
    setSaving(true); setError('');
    try {
      await vehicleService.addService(vehicleUid, {
        item_code: itemCode || null,
        item_name: itemCode ? null : { [language]: name.trim() },
        installed_date: date,
        installed_km: unitToKm(Number(insKm), unit),
        life_km: lifeKm ? unitToKm(Number(lifeKm), unit) : null,
        life_months: lifeMonths ? Number(lifeMonths) : null,
        amount: amountVal ? Number(amountVal) : null,
      });
      onSaved();
    } catch (e) { setError(e instanceof ApiError ? e.message : t('common.error')); }
    finally { setSaving(false); }
  };

  return (
    <Modal open onClose={() => !saving && onClose()} title={t('vehicle.addService')} size="md"
      footer={<><Button variant="outline" onClick={onClose} disabled={saving}>{t('common.cancel')}</Button><Button onClick={submit} loading={saving}>{t('common.save')}</Button></>}>
      <div className="space-y-3">
        {error && <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600 dark:text-red-400">{error}</div>}
        <div>
          <ItemPicker label={t('vehicle.part')} value={itemCode} onChange={(code) => setItemCode(code)} placeholder={t('vehicle.pickPart')} />
          {itemCode
            ? <button onClick={() => setItemCode('')} className="mt-1 text-xs text-blue-500 hover:underline">{t('vehicle.freeText')}</button>
            : <Input className="mt-2" value={name} onChange={(e) => setName(e.target.value)} placeholder="Yağ 5W30" />}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label={t('vehicle.installedDate')} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Input label={`${t('vehicle.installedKm')} (${unit})`} type="number" value={insKm} onChange={(e) => setInsKm(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label={`${t('vehicle.lifeKm')} (${unit})`} type="number" value={lifeKm} onChange={(e) => setLifeKm(e.target.value)} placeholder="5000" />
          <Input label={t('vehicle.lifeMonths')} type="number" value={lifeMonths} onChange={(e) => setLifeMonths(e.target.value)} placeholder="6" />
        </div>
        <p className="text-xs text-gray-400">{t('vehicle.lifeHint')}</p>
        <Input label={`${t('vehicle.serviceCost')} (₼)`} type="number" value={amountVal} onChange={(e) => setAmountVal(e.target.value)} placeholder="0" />
        <p className="text-xs text-gray-400">{t('vehicle.serviceCostHint')}</p>
      </div>
    </Modal>
  );
}

type AskDelete = (msg: string, fn: () => Promise<unknown>, after?: () => void) => void;

function FuelSection({ vehicleUid, unit, canEdit, suggestedKm, onError, askDelete }: { vehicleUid: string; unit: VehicleUnit; canEdit: boolean; suggestedKm: number | null; onError: (m: string) => void; askDelete: AskDelete }) {
  const { t } = useLanguage();
  const [rows, setRows] = useState<VehicleFuelRow[]>([]);
  const [avg, setAvg] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [odo, setOdo] = useState(suggestedKm !== null ? String(Math.round(kmToUnit(suggestedKm, unit))) : '');
  const [liters, setLiters] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => { setLoading(true); vehicleService.listFuel(vehicleUid).then((r) => { setRows(r.data); setAvg(r.avg_consumption); }).catch(() => {}).finally(() => setLoading(false)); }, [vehicleUid]);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    const l = Number(liters); const o = Number(odo);
    if (!l || !o) return;
    setSaving(true);
    try { await vehicleService.addFuel(vehicleUid, { date, odometer_km: unitToKm(o, unit), liters: l, amount: amount ? Number(amount) : null }); setLiters(''); setAmount(''); load(); }
    catch (e) { onError(e instanceof ApiError ? e.message : t('common.error')); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      {avg !== null && <p className="text-sm text-gray-500">{t('vehicle.avgConsumption')}: <span className="font-semibold text-gray-800 dark:text-gray-100">{avg} L/100km</span></p>}
      {canEdit && (
        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/30 p-3">
          <div className="w-36"><label className="block text-xs text-gray-500 mb-1">{t('common.date')}</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full h-9 px-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" /></div>
          <div className="w-28"><label className="block text-xs text-gray-500 mb-1">{t('vehicle.odometer')} ({unit})</label><input type="number" value={odo} onChange={(e) => setOdo(e.target.value)} className="w-full h-9 px-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" /></div>
          <div className="w-24"><label className="block text-xs text-gray-500 mb-1">{t('vehicle.liters')}</label><input type="number" value={liters} onChange={(e) => setLiters(e.target.value)} className="w-full h-9 px-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" /></div>
          <div className="w-24"><label className="block text-xs text-gray-500 mb-1">₼</label><input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full h-9 px-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" /></div>
          <Button onClick={add} loading={saving} disabled={!liters || !odo}><Plus className="w-4 h-4 mr-1" /> {t('common.add')}</Button>
        </div>
      )}
      {loading ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-blue-600" /></div>
        : rows.length === 0 ? <div className="py-8 text-center text-sm text-gray-400">{t('vehicle.noFuel')}</div>
          : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400"><tr>
                  <th className="text-left font-medium px-4 py-2">{t('common.date')}</th>
                  <th className="text-right font-medium px-4 py-2">{t('vehicle.odometer')}</th>
                  <th className="text-right font-medium px-4 py-2">{t('vehicle.liters')}</th>
                  <th className="text-right font-medium px-4 py-2">₼</th>
                  <th className="text-right font-medium px-4 py-2">L/100km</th>
                  <th className="px-4 py-2"></th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {rows.map((f) => (
                    <tr key={f.uid} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                      <td className="px-4 py-2 whitespace-nowrap">{fmtDate(f.date)}</td>
                      <td className="px-4 py-2 text-right font-mono">{Math.round(kmToUnit(Number(f.odometer_km), unit)).toLocaleString()} {unit}</td>
                      <td className="px-4 py-2 text-right font-mono">{Number(f.liters)}</td>
                      <td className="px-4 py-2 text-right font-mono">{f.amount !== null ? Number(f.amount).toFixed(2) : '—'}</td>
                      <td className="px-4 py-2 text-right font-mono font-semibold">{f.consumption ?? '—'}</td>
                      <td className="px-4 py-2 text-right">{canEdit && <button onClick={() => askDelete(t('vehicle.confirmDeleteFuel'), () => vehicleService.removeFuel(vehicleUid, f.uid), load)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
    </div>
  );
}

function ExpensesSection({ vehicleUid, canEdit, onError, askDelete }: { vehicleUid: string; canEdit: boolean; onError: (m: string) => void; askDelete: AskDelete }) {
  const { t } = useLanguage();
  const [rows, setRows] = useState<VehicleExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => { setLoading(true); vehicleService.listExpenses(vehicleUid).then((r) => setRows(r.data)).catch(() => {}).finally(() => setLoading(false)); }, [vehicleUid]);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!title.trim() || !amount) return;
    setSaving(true);
    try { await vehicleService.addExpense(vehicleUid, { date, title: title.trim(), amount: Number(amount) }); setTitle(''); setAmount(''); load(); }
    catch (e) { onError(e instanceof ApiError ? e.message : t('common.error')); }
    finally { setSaving(false); }
  };

  const total = rows.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="space-y-4">
      {rows.length > 0 && <p className="text-sm text-gray-500">{t('common.total')}: <span className="font-semibold text-gray-800 dark:text-gray-100">{total.toFixed(2)} ₼</span></p>}
      {canEdit && (
        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/30 p-3">
          <div className="w-36"><label className="block text-xs text-gray-500 mb-1">{t('common.date')}</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full h-9 px-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" /></div>
          <div className="flex-1 min-w-[160px]"><label className="block text-xs text-gray-500 mb-1">{t('vehicle.expenseTitle')}</label><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('vehicle.expensePlaceholder')} className="w-full h-9 px-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" /></div>
          <div className="w-28"><label className="block text-xs text-gray-500 mb-1">₼</label><input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full h-9 px-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm" /></div>
          <Button onClick={add} loading={saving} disabled={!title || !amount}><Plus className="w-4 h-4 mr-1" /> {t('common.add')}</Button>
        </div>
      )}
      {loading ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-blue-600" /></div>
        : rows.length === 0 ? <div className="py-8 text-center text-sm text-gray-400">{t('vehicle.noExpenses')}</div>
          : (
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
              {rows.map((e) => (
                <div key={e.uid} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <span className="text-gray-400 whitespace-nowrap w-24">{fmtDate(e.date)}</span>
                  <span className="flex-1 text-gray-800 dark:text-gray-100">{e.title}</span>
                  <span className="font-mono font-semibold">{Number(e.amount).toFixed(2)} ₼</span>
                  {canEdit && <button onClick={() => askDelete(t('vehicle.confirmDeleteExpense'), () => vehicleService.removeExpense(vehicleUid, e.uid), load)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>}
                </div>
              ))}
            </div>
          )}
    </div>
  );
}
