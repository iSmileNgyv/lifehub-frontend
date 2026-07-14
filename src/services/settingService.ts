import { api } from '@/lib/api';

export interface SystemSettings {
  registration_enabled: boolean;
}

export const settingService = {
  get: () => api<SystemSettings>('/settings'),
  update: (data: Partial<SystemSettings>) => api<SystemSettings>('/settings', { method: 'PUT', body: JSON.stringify(data) }),
};
