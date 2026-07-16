import { api } from '@/lib/api';
import type { FinanceJournal, FinanceJournalShow } from '@/types';

export interface EntryPayload {
  posting_date?: string | null;
  entry_type: 'income' | 'expense' | 'transfer';
  cash_desk_code: string;
  to_cash_desk_code?: string | null;
  category_code: string | null;
  amount_lcy: number;
  descr: string | null;
}

export const financeJournalService = {
  list: () => api<{ data: FinanceJournal[] }>('/finance-journals'),
  create: (data: { journal_date: string; descr?: string | null }) =>
    api<FinanceJournalShow>('/finance-journals', { method: 'POST', body: JSON.stringify(data) }),
  get: (code: string) => api<FinanceJournalShow>(`/finance-journals/${code}`),
  remove: (code: string) => api<{ message: string }>(`/finance-journals/${code}`, { method: 'DELETE' }),

  addEntry: (code: string, data: EntryPayload) =>
    api<FinanceJournalShow>(`/finance-journals/${code}/entries`, { method: 'POST', body: JSON.stringify(data) }),
  updateEntry: (code: string, uid: string, data: EntryPayload) =>
    api<FinanceJournalShow>(`/finance-journals/${code}/entries/${uid}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteEntry: (code: string, uid: string) =>
    api<FinanceJournalShow>(`/finance-journals/${code}/entries/${uid}`, { method: 'DELETE' }),

  saveLines: (code: string, entryUid: string, lines: { item_code: string; measure_code?: string | null; meas_weight?: number | null; qty: number; unit_price: number }[]) =>
    api<FinanceJournalShow>(`/finance-journals/${code}/entries/${entryUid}/lines`, { method: 'PUT', body: JSON.stringify({ lines }) }),

  post: (code: string) => api<{ ok: boolean; message: string; posted: number }>(`/finance-journals/${code}/post`, { method: 'POST' }),
};
