import { api } from '@/lib/api';
import type { ManagedUser, Paginated, UserStatus } from '@/types';

export const userService = {
  list: (params: { page?: number; q?: string } = {}) => {
    const sp = new URLSearchParams();
    if (params.page) sp.set('page', String(params.page));
    if (params.q) sp.set('q', params.q);
    const qs = sp.toString();
    return api<Paginated<ManagedUser>>(`/users${qs ? `?${qs}` : ''}`);
  },

  create: (data: { name: string; username: string; password: string; status: UserStatus }) =>
    api<ManagedUser>('/users', { method: 'POST', body: JSON.stringify(data) }),

  update: (uid: string, data: Partial<{ name: string; username: string; status: UserStatus }>) =>
    api<ManagedUser>(`/users/${uid}`, { method: 'PATCH', body: JSON.stringify(data) }),

  setPassword: (uid: string, newPassword: string, confirm: string) =>
    api<{ message: string }>(`/users/${uid}/password`, {
      method: 'PUT',
      body: JSON.stringify({ new_password: newPassword, new_password_confirmation: confirm }),
    }),

  syncRoles: (uid: string, roles: string[]) =>
    api<ManagedUser>(`/users/${uid}/roles`, { method: 'PUT', body: JSON.stringify({ roles }) }),
};
