import { api } from '@/lib/api';
import type { TradingEntryType, TradingJournal, TradingJournalEntry } from '@/types';

interface JournalPayload {
  cash_desk_code: string | null;
  descr: string | null;
  posting_date: string;
}
interface EntryPayload {
  entry_type: TradingEntryType;
  manat_amount: number;
  usd_qty?: number | null;
  descr?: string | null;
}

export const tradingJournalService = {
  list: () => api<{ data: TradingJournal[] }>('/trading/journals'),

  stats: (month?: string) =>
    api<{ month: string; revenue: number; buy: number; cogs: number; profit: number; journals: number }>(`/trading/stats${month ? `?month=${month}` : ''}`),

  balance: () => api<{ usd: number; cost_lcy: number; avg_cost: number }>('/trading/balance'),

  show: (code: string) => api<TradingJournal>(`/trading/journals/${code}`),

  create: (data: JournalPayload) => api<TradingJournal>('/trading/journals', { method: 'POST', body: JSON.stringify(data) }),

  update: (code: string, data: JournalPayload) => api<TradingJournal>(`/trading/journals/${code}`, { method: 'PATCH', body: JSON.stringify(data) }),

  remove: (code: string) => api<{ message: string }>(`/trading/journals/${code}`, { method: 'DELETE' }),

  post: (code: string) =>
    api<{ message: string; revenue: number; buy_manat: number; cogs: number; profit: number; net_cash: number }>(`/trading/journals/${code}/post`, { method: 'POST' }),

  check: (code: string) =>
    api<{ buy_manat: number; sell_manat: number; buy_usd: number; sell_usd: number; net_cash: number; cogs: number; profit: number; shortage_usd: number }>(`/trading/journals/${code}/check`),

  addEntry: (code: string, data: EntryPayload) =>
    api<TradingJournalEntry>(`/trading/journals/${code}/entries`, { method: 'POST', body: JSON.stringify(data) }),

  updateEntry: (code: string, uid: string, data: EntryPayload) =>
    api<TradingJournalEntry>(`/trading/journals/${code}/entries/${uid}`, { method: 'PATCH', body: JSON.stringify(data) }),

  removeEntry: (code: string, uid: string) =>
    api<{ message: string }>(`/trading/journals/${code}/entries/${uid}`, { method: 'DELETE' }),
};
