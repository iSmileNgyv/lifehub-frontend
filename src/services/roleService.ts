import { api } from '@/lib/api';
import type { Operation, Role, RoleAccessRow } from '@/types';

export const roleService = {
  // Rollar
  list: () => api<Role[]>('/roles'),

  create: (code: string, name: string) =>
    api<Role>('/roles', { method: 'POST', body: JSON.stringify({ code, name }) }),

  rename: (code: string, name: string) =>
    api<Role>(`/roles/${code}`, { method: 'PATCH', body: JSON.stringify({ name }) }),

  remove: (code: string) => api<{ message: string }>(`/roles/${code}`, { method: 'DELETE' }),

  // Operation kataloqu (palitra)
  operations: () => api<Operation[]>('/operations'),

  // Rolun icazə matrisi
  access: (roleCode: string) => api<RoleAccessRow[]>(`/roles/${roleCode}/access`),

  /** access=1 (drag-in / qıfıl aç) və ya access=0 (qıfılla). */
  setAccess: (roleCode: string, operationCode: string, access: boolean) =>
    api<RoleAccessRow>(`/roles/${roleCode}/access/${operationCode}`, {
      method: 'PUT',
      body: JSON.stringify({ access }),
    }),

  /** Sətri tamam sil (zibil). */
  removeAccess: (roleCode: string, operationCode: string) =>
    api<{ message: string }>(`/roles/${roleCode}/access/${operationCode}`, { method: 'DELETE' }),
};
