import { api } from '@/lib/api';
import type { FormulaTier, TradingFormula } from '@/types';

interface FormulaPayload {
  name: string;
  tiers: FormulaTier[];
  is_active?: boolean;
}

export const tradingFormulaService = {
  list: () => api<{ data: TradingFormula[] }>('/trading/formulas'),

  create: (data: FormulaPayload) =>
    api<TradingFormula>('/trading/formulas', { method: 'POST', body: JSON.stringify(data) }),

  update: (uid: string, data: FormulaPayload) =>
    api<TradingFormula>(`/trading/formulas/${uid}`, { method: 'PATCH', body: JSON.stringify(data) }),

  remove: (uid: string) =>
    api<{ message: string }>(`/trading/formulas/${uid}`, { method: 'DELETE' }),

  activate: (uid: string) =>
    api<TradingFormula>(`/trading/formulas/${uid}/activate`, { method: 'PUT' }),

  compute: (amount: number) =>
    api<{ tier: number; result: number }>('/trading/formulas/compute', { method: 'POST', body: JSON.stringify({ amount }) }),
};
