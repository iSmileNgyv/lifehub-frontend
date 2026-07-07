import { api } from '@/lib/api';
import type { Translatable, Vehicle, VehicleUnit } from '@/types';

interface VehiclePayload {
  name: string;
  plate?: string | null;
  unit?: VehicleUnit;
  avg_km_per_day?: number | null;
  note?: string | null;
}
interface ServicePayload {
  item_code?: string | null;
  item_name?: Translatable | null;
  installed_date: string;
  installed_km: number;
  life_km?: number | null;
  life_months?: number | null;
  amount?: number | null;
  note?: string | null;
}

export const vehicleService = {
  list: () => api<{ data: Vehicle[] }>('/vehicles'),
  show: (uid: string) => api<Vehicle>(`/vehicles/${uid}`),
  create: (data: VehiclePayload) => api<Vehicle>('/vehicles', { method: 'POST', body: JSON.stringify(data) }),
  update: (uid: string, data: VehiclePayload) => api<Vehicle>(`/vehicles/${uid}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (uid: string) => api<{ message: string }>(`/vehicles/${uid}`, { method: 'DELETE' }),

  addReading: (uid: string, data: { reading_date: string; km: number }) =>
    api(`/vehicles/${uid}/readings`, { method: 'POST', body: JSON.stringify(data) }),
  removeReading: (uid: string, ruid: string) =>
    api(`/vehicles/${uid}/readings/${ruid}`, { method: 'DELETE' }),

  addService: (uid: string, data: ServicePayload) =>
    api(`/vehicles/${uid}/services`, { method: 'POST', body: JSON.stringify(data) }),
  updateService: (uid: string, suid: string, data: ServicePayload) =>
    api(`/vehicles/${uid}/services/${suid}`, { method: 'PATCH', body: JSON.stringify(data) }),
  closeService: (uid: string, suid: string) =>
    api(`/vehicles/${uid}/services/${suid}/close`, { method: 'PUT' }),
  reactivateService: (uid: string, suid: string) =>
    api(`/vehicles/${uid}/services/${suid}/reactivate`, { method: 'PUT' }),
  removeService: (uid: string, suid: string) =>
    api(`/vehicles/${uid}/services/${suid}`, { method: 'DELETE' }),

  listExpenses: (uid: string) => api<{ data: import('@/types').VehicleExpenseRow[] }>(`/vehicles/${uid}/expenses`),
  addExpense: (uid: string, data: { date: string; title: string; amount: number; note?: string | null }) =>
    api(`/vehicles/${uid}/expenses`, { method: 'POST', body: JSON.stringify(data) }),
  removeExpense: (uid: string, eid: string) => api(`/vehicles/${uid}/expenses/${eid}`, { method: 'DELETE' }),

  listFuel: (uid: string) => api<{ data: import('@/types').VehicleFuelRow[]; avg_consumption: number | null }>(`/vehicles/${uid}/fuel`),
  addFuel: (uid: string, data: { date: string; odometer_km: number; liters: number; amount?: number | null; note?: string | null }) =>
    api(`/vehicles/${uid}/fuel`, { method: 'POST', body: JSON.stringify(data) }),
  removeFuel: (uid: string, fid: string) => api(`/vehicles/${uid}/fuel/${fid}`, { method: 'DELETE' }),
};

/** Mil ↔ km çevirmə (1 mi = 1.609344 km). */
export const MI_TO_KM = 1.609344;
export const kmToUnit = (km: number, unit: VehicleUnit) => (unit === 'mi' ? km / MI_TO_KM : km);
export const unitToKm = (v: number, unit: VehicleUnit) => (unit === 'mi' ? v * MI_TO_KM : v);
