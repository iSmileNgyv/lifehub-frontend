import { api, clearToken, getToken, setToken } from '@/lib/api';
import type { AuthUser, Role } from '@/types';

interface LoginResponse {
  token: string;
  user: AuthUser;
  permissions: string[];
  roles: Role[];
}

export interface SessionData {
  user: AuthUser;
  permissions: string[];
  roles: Role[];
}

export const authService = {
  login: async (username: string, password: string): Promise<SessionData> => {
    const data = await api<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    setToken(data.token);
    return { user: data.user, permissions: data.permissions, roles: data.roles };
  },

  logout: async (): Promise<void> => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      // token onsuz da etibarsız ola bilər — sakitcə təmizlə
    } finally {
      clearToken();
    }
  },

  /** Token-i serverdə yoxlayır; etibarsızdırsa xəta atır. */
  me: async (): Promise<SessionData> => {
    const data = await api<{ user: AuthUser; permissions: string[]; roles: Role[] }>('/auth/me');
    return { user: data.user, permissions: data.permissions, roles: data.roles };
  },

  updateProfile: async (name: string, username: string): Promise<{ user: AuthUser; roles: Role[] }> =>
    api('/auth/profile', { method: 'PATCH', body: JSON.stringify({ name, username }) }),

  changePassword: (currentPassword: string, newPassword: string, confirm: string) =>
    api<{ message: string }>('/auth/password', {
      method: 'PUT',
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: confirm,
      }),
    }),

  setLanguage: (language: string) =>
    api<{ language: string }>('/auth/language', { method: 'PUT', body: JSON.stringify({ language }) }),

  hasToken: (): boolean => getToken() !== null,
};
