'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Loader2, X, Car, Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { vehicleService, kmToUnit } from '@/services/vehicleService';
import { ApiError } from '@/lib/api';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import type { ServiceStatus, Vehicle, VehicleUnit } from '@/types';

const STATUS_DOT: Record<ServiceStatus, string> = {
  ok: 'bg-green-500',
  soon: 'bg-amber-500',
  overdue: 'bg-red-500',
};

export default function VehiclesPage() {
  const { t } = useLanguage();
  const { can } = useAuth();
  const [items, setItems] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const load = () => {
    setLoading(true);
    vehicleService.list().then((r) => setItems(r.data)).catch((e) => setError(e instanceof ApiError ? e.message : '')).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  return (
    <div>
      <PageHeader
        title={t('vehicle.title')}
        actions={can('VEHICLE_CREATE') && <Button onClick={() => setCreating(true)}><Plus className="w-4 h-4 mr-1" /> {t('vehicle.new')}</Button>}
      />

      {error && (
        <div className="mb-4 flex items-center justify-between px-4 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
          {error}<button onClick={() => setError('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">{t('vehicle.empty')}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((v) => (
            <Link key={v.uid} href={`/vehicles/${v.uid}`}
              className="group rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center shrink-0"><Car className="w-6 h-6 text-blue-600" /></div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">{v.name}</p>
                  <p className="text-xs text-gray-400">{v.plate || '—'}</p>
                </div>
                <span className={cn('w-3 h-3 rounded-full mt-1', STATUS_DOT[v.worst_status])} title={t(`vehicle.status_${v.worst_status}`)} />
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <Gauge className="w-4 h-4 text-gray-400" />
                {v.current_km !== null
                  ? <span className="font-mono font-semibold">{Math.round(kmToUnit(Number(v.current_km), v.unit)).toLocaleString()} {v.unit}</span>
                  : <span className="text-gray-400">{t('vehicle.noReading')}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}

      {creating && <CreateVehicleModal onClose={() => setCreating(false)} onCreated={() => { setCreating(false); load(); }} />}
    </div>
  );
}

function CreateVehicleModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [plate, setPlate] = useState('');
  const [unit, setUnit] = useState<VehicleUnit>('km');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true); setError('');
    try { await vehicleService.create({ name: name.trim(), plate: plate || null, unit }); onCreated(); }
    catch (e) { setError(e instanceof ApiError ? e.message : t('common.error')); }
    finally { setSaving(false); }
  };

  return (
    <Modal open onClose={() => !saving && onClose()} title={t('vehicle.new')} size="sm"
      footer={<>
        <Button variant="outline" onClick={onClose} disabled={saving}>{t('common.cancel')}</Button>
        <Button onClick={submit} loading={saving}>{t('common.save')}</Button>
      </>}>
      <div className="space-y-3">
        {error && <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600 dark:text-red-400">{error}</div>}
        <Input label={t('vehicle.name')} value={name} onChange={(e) => setName(e.target.value)} placeholder="Prius" />
        <Input label={t('vehicle.plate')} value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="90-AA-000" />
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('vehicle.unit')}</label>
          <div className="flex gap-2">
            {(['km', 'mi'] as const).map((u) => (
              <button key={u} onClick={() => setUnit(u)} className={cn('flex-1 h-9 rounded-lg border text-sm font-medium', unit === u ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-600' : 'border-gray-300 dark:border-gray-700 text-gray-500')}>{u === 'km' ? t('vehicle.km') : t('vehicle.mi')}</button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
