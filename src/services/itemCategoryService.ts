import { api } from '@/lib/api';
import type { CategoryStatus, ItemCategory, Translatable } from '@/types';

interface ReorderItem { code: string; parent_code: string | null; sort_order: number }

export const itemCategoryService = {
  list: () => api<ItemCategory[]>('/categories'),
  create: (data: { code: string; parent_code: string | null; name: Translatable; status?: CategoryStatus }) =>
    api<ItemCategory>('/categories', { method: 'POST', body: JSON.stringify(data) }),
  update: (code: string, data: Partial<{ name: Translatable; status: CategoryStatus; parent_code: string | null }>) =>
    api<ItemCategory>(`/categories/${code}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (code: string) => api<{ message: string }>(`/categories/${code}`, { method: 'DELETE' }),
  reorder: (items: ReorderItem[]) =>
    api<{ message: string }>('/categories/reorder', { method: 'PUT', body: JSON.stringify({ items }) }),
};
