import { api } from '@/lib/api';
import type { Translatable } from '@/types';

export interface SummaryReport {
  from: string; to: string;
  income: number; expense: number; net: number;
  prev_income: number; prev_expense: number; prev_net: number;
  rows: { entry_type: 'income' | 'expense'; category_code: string | null; total: number; cnt: number }[];
}
export interface ItemsReportRow {
  item_code: string;
  item_name: Translatable | null;
  measure_code: string | null;
  meas_weight: number | null;
  qty: number;
  total: number;
  cnt: number;
  avg_price: number;
  min_price: number;
  max_price: number;
  first_price: number;
  last_price: number;
  price_change_pct: number | null;
}
export interface ItemsReport {
  from: string; to: string; total: number; prev_total: number;
  rows: ItemsReportRow[];
}
export interface CashReport {
  from: string; to: string; in: number; out: number; net: number;
  prev_in: number; prev_out: number; prev_net: number;
  flow: { date: string; in: number; out: number }[];
  desks: { code: string; description: Translatable; balance_lcy: string; opening: number; period_in: number; period_out: number; closing: number }[];
  entries: { uid: string; posting_date: string; cash_desk_code: string; entry_type: 'cash_in' | 'cash_out'; amount_lcy: string; descr: string | null; doc_no: string | null }[];
}
export interface TrendReport {
  months: { month: string; income: number; expense: number }[];
}
export interface EntriesReport {
  total: number;
  rows: { uid: string; posting_date: string; entry_type: 'income' | 'expense'; category_code: string | null; cash_desk_code: string | null; amount_lcy: string; descr: string | null; transaction_number: number }[];
}
export interface BudgetLine { monthly: number; prorated: number; actual: number }
export interface BudgetReport {
  from: string; to: string; factor: number;
  overall: BudgetLine | null;
  income: BudgetLine | null;
  categories: (BudgetLine & { category_code: string })[];
}
export type BudgetKind = 'category_expense' | 'overall_expense' | 'income_target';

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
  entries: (from: string, to: string, type: 'income' | 'expense', category: string | null) =>
    api<EntriesReport>(`/finance-reports/entries${qs({ from, to, type, category: category ?? '__NONE__' })}`),
  budget: (from: string, to: string) => api<BudgetReport>(`/finance-reports/budget${qs({ from, to })}`),
};

export const financeBudgetService = {
  upsert: (kind: BudgetKind, category_code: string | null, amount: number) =>
    api<unknown>('/finance-budgets', { method: 'POST', body: JSON.stringify({ kind, category_code, amount }) }),
};
