import { api } from '@/lib/api';
import type { FinanceCategory, FinanceCategoryType, Translatable } from '@/types';

interface ReorderItem { code: string; parent_code: string | null; sort_order: number }

export const financeCategoryService = {
  list: () => api<FinanceCategory[]>('/finance-categories'),
  create: (data: { code: string; parent_code: string | null; name: Translatable; type: FinanceCategoryType }) =>
    api<FinanceCategory>('/finance-categories', { method: 'POST', body: JSON.stringify(data) }),
  update: (code: string, data: Partial<{ name: Translatable; parent_code: string | null }>) =>
    api<FinanceCategory>(`/finance-categories/${code}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (code: string) => api<{ message: string }>(`/finance-categories/${code}`, { method: 'DELETE' }),
  reorder: (items: ReorderItem[]) =>
    api<{ message: string }>('/finance-categories/reorder', { method: 'PUT', body: JSON.stringify({ items }) }),
};
