import { api } from '@/lib/api';
import type { FinanceLine } from '@/types';

/** Post olunmuş maliyyə ledger sətri (gəlir/xərc). */
export interface LedgerEntry {
  uid: string;
  transaction_number: number;
  posting_date: string;
  entry_type: 'income' | 'expense';
  cash_desk_code: string;
  category_code: string | null;
  amount_lcy: string;
  descr: string | null;
  jnl_code: string | null;
  lines: FinanceLine[];
}

interface LedgerList { from: string; to: string; data: LedgerEntry[] }

export const financeLedgerService = {
  list: (params: { from?: string; to?: string; cash_desk?: string; category_code?: string; entry_type?: string } = {}) => {
    const sp = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]);
    const qs = sp.toString();
    return api<LedgerList>(`/finance-ledger${qs ? `?${qs}` : ''}`);
  },
  update: (uid: string, data: { category_code: string | null; descr: string | null }) =>
    api<LedgerEntry>(`/finance-ledger/${uid}`, { method: 'PATCH', body: JSON.stringify(data) }),
  saveLines: (uid: string, lines: { item_code: string; measure_code?: string | null; meas_weight?: number | null; qty: number; unit_price: number }[]) =>
    api<LedgerEntry>(`/finance-ledger/${uid}/lines`, { method: 'PATCH', body: JSON.stringify({ lines }) }),
  reverse: (uid: string) =>
    api<{ ok: boolean; message: string; jnl_code: string; entry_uid: string }>(`/finance-ledger/${uid}/reverse`, { method: 'POST' }),
};
