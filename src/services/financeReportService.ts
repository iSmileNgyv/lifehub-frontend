import { api } from '@/lib/api';
import type { Translatable } from '@/types';

export interface SummaryReport {
  from: string; to: string;
  income: number; expense: number; net: number;
  rows: { entry_type: 'income' | 'expense'; category_code: string | null; total: number; cnt: number }[];
}
export interface ItemsReport {
  from: string; to: string; total: number;
  rows: { item_code: string; item_name: Translatable | null; measure_code: string | null; meas_weight: string | null; qty: number; total: number }[];
}
export interface CashReport {
  from: string; to: string; in: number; out: number; net: number;
  desks: { code: string; description: Translatable; balance_lcy: string }[];
  entries: { uid: string; posting_date: string; cash_desk_code: string; entry_type: 'cash_in' | 'cash_out'; amount_lcy: string; descr: string | null; doc_no: string | null }[];
}
export interface TrendReport {
  months: { month: string; income: number; expense: number }[];
}

const qs = (p: Record<string, string>) => {
  const s = new URLSearchParams(Object.entries(p).filter(([, v]) => v));
  const str = s.toString();
  return str ? `?${str}` : '';
};

export const financeReportService = {
  summary: (from: string, to: string) => api<SummaryReport>(`/finance-reports/summary${qs({ from, to })}`),
  items: (from: string, to: string) => api<ItemsReport>(`/finance-reports/items${qs({ from, to })}`),
  cash: (from: string, to: string, cashDesk = '') => api<CashReport>(`/finance-reports/cash${qs({ from, to, cash_desk: cashDesk })}`),
  trend: (months = 6) => api<TrendReport>(`/finance-reports/trend?months=${months}`),
};
