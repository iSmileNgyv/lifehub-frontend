import { api } from '@/lib/api';
import type { CashDesk, CategoryStatus, Paginated, Translatable } from '@/types';

interface CashDeskPayload {
  code?: string;
  description: Translatable;
  address: string | null;
  resp_person: string | null;
  status: CategoryStatus;
}

export const cashDeskService = {
  list: (params: { page?: number; q?: string } = {}) => {
    const sp = new URLSearchParams();
    if (params.page) sp.set('page', String(params.page));
    if (params.q) sp.set('q', params.q);
    const qs = sp.toString();
    return api<Paginated<CashDesk>>(`/cash-desks${qs ? `?${qs}` : ''}`);
  },

  create: (data: CashDeskPayload) => api<CashDesk>('/cash-desks', { method: 'POST', body: JSON.stringify(data) }),

  update: (code: string, data: Omit<CashDeskPayload, 'code'>) =>
    api<CashDesk>(`/cash-desks/${code}`, { method: 'PATCH', body: JSON.stringify(data) }),

  remove: (code: string) => api<{ message: string }>(`/cash-desks/${code}`, { method: 'DELETE' }),
};
