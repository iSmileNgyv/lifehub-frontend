import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = '₼') {
  return `${amount.toFixed(2)} ${currency}`;
}

/** ISO tarix (YYYY-MM-DD) → d-m-Y (28-06-2026). Timezone-suz, dəqiq. */
export function fmtDate(s?: string | null): string {
  if (!s) return '';
  const [y, m, d] = s.split('T')[0].split('-');
  return d && m && y ? `${d}-${m}-${y}` : s;
}

export function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('az-AZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleString('az-AZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
