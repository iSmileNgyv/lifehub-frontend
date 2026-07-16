import { api } from '@/lib/api';
import type { CategoryStatus, Item, ItemLastPrice, ItemPriceHistory, Paginated, Translatable } from '@/types';

interface ItemPayload {
  code?: string;
  name: Translatable;
  category_code: string | null;
  base_measure_code: string;
  status: CategoryStatus;
  image?: string | null;
  barcodes?: string[];
}

export const itemService = {
  list: (params: { page?: number; q?: string; category_code?: string } = {}) => {
    const sp = new URLSearchParams();
    if (params.page) sp.set('page', String(params.page));
    if (params.q) sp.set('q', params.q);
    if (params.category_code) sp.set('category_code', params.category_code);
    const qs = sp.toString();
    return api<Paginated<Item>>(`/items${qs ? `?${qs}` : ''}`);
  },
  byBarcode: (barcode: string) => api<Item>(`/items/by-barcode/${encodeURIComponent(barcode)}`),
  lastPrices: (code: string) => api<ItemLastPrice[]>(`/items/${code}/last-prices`),
  priceHistory: (code: string) => api<ItemPriceHistory[]>(`/items/${code}/price-history`),
  create: (data: ItemPayload) => api<Item>('/items', { method: 'POST', body: JSON.stringify(data) }),
  update: (code: string, data: Omit<ItemPayload, 'code'>) => api<Item>(`/items/${code}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (code: string) => api<{ message: string }>(`/items/${code}`, { method: 'DELETE' }),
};
