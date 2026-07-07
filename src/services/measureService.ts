import { api } from '@/lib/api';
import type { Measurement, Translatable } from '@/types';

export const measureService = {
  list: () => api<Measurement[]>('/measures'),
  create: (data: { code: string; name: Translatable }) => api<Measurement>('/measures', { method: 'POST', body: JSON.stringify(data) }),
  update: (code: string, data: { name: Translatable }) => api<Measurement>(`/measures/${code}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (code: string) => api<{ message: string }>(`/measures/${code}`, { method: 'DELETE' }),
};
