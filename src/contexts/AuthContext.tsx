'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { authService } from '@/services/authService';
import { useLanguage } from '@/contexts/LanguageContext';
import type { AuthUser, Role } from '@/types';

interface AuthContextValue {
  user: AuthUser | null;
  permissions: string[];
  roles: Role[];
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Öz profilini yeniləyir (ad/username) və context-i təzələyir. */
  updateProfile: (name: string, username: string) => Promise<void>;
  /** İstifadəçinin verilmiş operation-a icazəsi varmı (super_admin → həmişə true). */
  can: (operationCode: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { syncLanguage } = useLanguage();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  // İlk yüklənmədə: token varsa serverdə yoxla, etibarsızdırsa təmizlə.
  useEffect(() => {
    let active = true;

    (async () => {
      if (!authService.hasToken()) {
        if (active) setLoading(false);
        return;
      }
      try {
        const session = await authService.me();
        if (active) {
          setUser(session.user);
          setPermissions(session.permissions);
          setRoles(session.roles);
          syncLanguage(session.user.language); // axırıncı seçilmiş dil
        }
      } catch {
        await authService.logout();
        if (active) {
          setUser(null);
          setPermissions([]);
          setRoles([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const session = await authService.login(username, password);
    setUser(session.user);
    setPermissions(session.permissions);
    setRoles(session.roles);
    syncLanguage(session.user.language); // axırıncı seçilmiş dil
  }, [syncLanguage]);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    setPermissions([]);
    setRoles([]);
  }, []);

  const updateProfile = useCallback(async (name: string, username: string) => {
    const data = await authService.updateProfile(name, username);
    setUser(data.user);
    setRoles(data.roles);
  }, []);

  const permissionSet = useMemo(() => new Set(permissions), [permissions]);

  const can = useCallback(
    (operationCode: string) => {
      if (user?.is_super_admin) return true;
      return permissionSet.has(operationCode);
    },
    [user, permissionSet],
  );

  return (
    <AuthContext.Provider value={{ user, permissions, roles, loading, login, logout, updateProfile, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth AuthProvider daxilində istifadə olunmalıdır');
  return ctx;
}
