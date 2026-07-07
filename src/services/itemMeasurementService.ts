import { api } from '@/lib/api';
import type { ItemMeasurement } from '@/types';

export const itemMeasurementService = {
  list: (itemCode: string) => api<ItemMeasurement[]>(`/items/${itemCode}/measures`),
  create: (itemCode: string, data: { measure_code: string; meas_weight: number }) =>
    api<ItemMeasurement>(`/items/${itemCode}/measures`, { method: 'POST', body: JSON.stringify(data) }),
  update: (itemCode: string, uid: string, data: { measure_code?: string; meas_weight?: number }) =>
    api<ItemMeasurement>(`/items/${itemCode}/measures/${uid}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (itemCode: string, uid: string) =>
    api<{ message: string }>(`/items/${itemCode}/measures/${uid}`, { method: 'DELETE' }),
};
