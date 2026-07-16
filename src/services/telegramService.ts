import { api } from '@/lib/api';

export interface TelegramSettings {
  study_enabled: boolean;
  study_deck_uid: string | null;
  interval_min: number;
  active_from: string;
  active_to: string;
  cards_per_push: number;
}

export interface TelegramStatus {
  linked: boolean;
  bot_username: string | null;
  settings: TelegramSettings;
}

export const telegramService = {
  status: () => api<TelegramStatus>('/telegram'),
  linkCode: () => api<{ code: string; bot_username: string | null; expires_min: number }>('/telegram/link-code', { method: 'POST' }),
  unlink: () => api<{ ok: boolean }>('/telegram/unlink', { method: 'POST' }),
  saveSettings: (data: TelegramSettings) => api<{ settings: TelegramSettings }>('/telegram/settings', { method: 'PUT', body: JSON.stringify(data) }),
};
