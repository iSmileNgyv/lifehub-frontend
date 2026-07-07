'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck, Plus, Lock, LockOpen, Trash2, GripVertical,
  Search, Check, X, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useContentLanguages } from '@/contexts/ContentLanguagesContext';
import { translateValue } from '@/lib/translate';
import { roleService } from '@/services/roleService';
import { ApiError } from '@/lib/api';
import PageHeader from '@/components/ui/PageHeader';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import type { Operation, Role } from '@/types';

interface ConfirmState {
  title: string;
  message: React.ReactNode;
  confirmText: string;
  onConfirm: () => Promise<void> | void;
}

function groupByModule(ops: Operation[]): Record<string, Operation[]> {
  return ops.reduce<Record<string, Operation[]>>((acc, op) => {
    (acc[op.module] ??= []).push(op);
    return acc;
  }, {});
}

export default function RolesPage() {
  const { can } = useAuth();
  const { t, language } = useLanguage();
  const { defaultCode } = useContentLanguages();

  const [roles, setRoles] = useState<Role[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  // operation_code -> access (true/false). Sətir yoxdursa rolda yoxdur.
  const [accessMap, setAccessMap] = useState<Record<string, boolean>>({});

  const [loading, setLoading] = useState(true);
  const [accessLoading, setAccessLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  // Yeni rol formu
  const [creating, setCreating] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');

  // Təsdiq dialoqu (rol və icazə silmə üçün ortaq)
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const runConfirm = async () => {
    if (!confirmState) return;
    setConfirmLoading(true);
    try {
      await confirmState.onConfirm();
      setConfirmState(null);
    } finally {
      setConfirmLoading(false);
    }
  };

  const canManage = can('ROLE_ACCESS_MANAGE');

  // İlkin yükləmə
  useEffect(() => {
    (async () => {
      try {
        const [r, o] = await Promise.all([roleService.list(), roleService.operations()]);
        setRoles(r);
        setOperations(o);
        if (r.length) setSelected(r[0].code);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Yüklənmə xətası');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Seçilmiş rolun icazələri
  useEffect(() => {
    if (!selected) {
      setAccessMap({});
      return;
    }
    let active = true;
    setAccessLoading(true);
    roleService
      .access(selected)
      .then((rows) => {
        if (!active) return;
        setAccessMap(Object.fromEntries(rows.map((row) => [row.operation_code, row.access])));
      })
      .finally(() => active && setAccessLoading(false));
    return () => {
      active = false;
    };
  }, [selected]);

  const grant = useCallback(
    async (code: string) => {
      if (!selected) return;
      setAccessMap((m) => ({ ...m, [code]: true })); // optimistik
      try {
        await roleService.setAccess(selected, code, true);
      } catch {
        setAccessMap((m) => {
          const n = { ...m };
          delete n[code];
          return n;
        });
      }
    },
    [selected],
  );

  const toggleLock = useCallback(
    async (code: string) => {
      if (!selected) return;
      const next = !accessMap[code];
      setAccessMap((m) => ({ ...m, [code]: next }));
      try {
        await roleService.setAccess(selected, code, next);
      } catch {
        setAccessMap((m) => ({ ...m, [code]: !next }));
      }
    },
    [selected, accessMap],
  );

  const performTrash = useCallback(
    async (code: string) => {
      if (!selected) return;
      const prev = accessMap[code];
      setAccessMap((m) => {
        const n = { ...m };
        delete n[code];
        return n;
      });
      try {
        await roleService.removeAccess(selected, code);
      } catch {
        setAccessMap((m) => ({ ...m, [code]: prev }));
      }
    },
    [selected, accessMap],
  );

  const createRole = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = newCode.trim().toUpperCase();
    if (!code || !newName.trim()) return;
    try {
      const role = await roleService.create(code, newName.trim());
      setRoles((r) => [...r, role].sort((a, b) => a.name.localeCompare(b.name)));
      setSelected(role.code);
      setNewCode('');
      setNewName('');
      setCreating(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.error'));
    }
  };

  const performDeleteRole = async (code: string) => {
    try {
      await roleService.remove(code);
      setRoles((r) => r.filter((x) => x.code !== code));
      if (selected === code) setSelected(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.error'));
    }
  };

  // Təsdiq tələb edən silmələr
  const askDeleteRole = (role: Role) =>
    setConfirmState({
      title: t('rolesPage.deleteRoleTitle'),
      message: (
        <>
          <b>{role.name}</b> ({role.code})
          <br />
          {t('rolesPage.deleteRoleWarn')}
        </>
      ),
      confirmText: t('rolesPage.deleteRoleTitle'),
      onConfirm: () => performDeleteRole(role.code),
    });

  const askTrash = (op: Operation) =>
    setConfirmState({
      title: t('rolesPage.deleteAccessTitle'),
      message: (
        <>
          <b>{op.code}</b>
          <br />
          {t('rolesPage.deleteAccessWarn')}
        </>
      ),
      confirmText: t('common.delete'),
      onConfirm: () => performTrash(op.code),
    });

  const filteredOps = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return operations;
    return operations.filter(
      (o) => o.code.toLowerCase().includes(q)
        || translateValue(o.description, language, defaultCode).toLowerCase().includes(q),
    );
  }, [operations, search, language, defaultCode]);

  const paletteGroups = useMemo(() => groupByModule(filteredOps), [filteredOps]);

  const assignedOps = useMemo(
    () => operations.filter((o) => o.code in accessMap),
    [operations, accessMap],
  );
  const assignedGroups = useMemo(() => groupByModule(assignedOps), [assignedOps]);

  if (!can('ROLE_VIEW')) {
    return <p className="text-sm text-gray-500">{t('rolesPage.noPageAccess')}</p>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={t('nav.roles')}
        subtitle={t('rolesPage.subtitle')}
      />

      {error && (
        <div className="mb-4 flex items-center justify-between px-4 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
          {error}
          <button onClick={() => setError('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_1fr] gap-4">
        {/* ── Sütun 1: Rollar ── */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t('rolesPage.rolesLabel')}</span>
            {can('ROLE_CREATE') && (
              <button
                onClick={() => setCreating((v) => !v)}
                className="flex items-center justify-center w-6 h-6 rounded-md text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                title={t('rolesPage.newRole')}
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>

          {creating && (
            <form onSubmit={createRole} className="mb-3 space-y-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
              <input
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                placeholder={t('rolesPage.codePlaceholder')}
                className="w-full h-8 px-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs outline-none focus:border-blue-500"
              />
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t('common.name')}
                className="w-full h-8 px-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs outline-none focus:border-blue-500"
              />
              <button type="submit" className="w-full h-8 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium">
                {t('common.create')}
              </button>
            </form>
          )}

          <div className="space-y-0.5">
            {roles.length === 0 && (
              <p className="text-xs text-gray-400 px-1 py-2">{t('rolesPage.noRoles')}</p>
            )}
            {roles.map((role) => (
              <div
                key={role.code}
                className={cn(
                  'group flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer text-sm',
                  selected === role.code
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
                )}
                onClick={() => setSelected(role.code)}
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium leading-tight">{role.name}</p>
                  <p className={cn('truncate text-[11px]', selected === role.code ? 'text-blue-100' : 'text-gray-400')}>
                    {role.code}
                  </p>
                </div>
                {can('ROLE_DELETE') && (
                  <button
                    onClick={(e) => { e.stopPropagation(); askDeleteRole(role); }}
                    className={cn(
                      'opacity-0 group-hover:opacity-100 shrink-0',
                      selected === role.code ? 'text-blue-100 hover:text-white' : 'text-gray-400 hover:text-red-500',
                    )}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Sütun 2: Operation palitrası ── */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 flex flex-col">
          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('rolesPage.searchOps')}
              className="w-full h-9 pl-8 pr-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="overflow-y-auto max-h-[60vh] space-y-3 pr-1">
            {Object.entries(paletteGroups).map(([module, ops]) => (
              <div key={module}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1 px-1">{module}</p>
                <div className="space-y-1">
                  {ops.map((op) => {
                    const added = op.code in accessMap;
                    return (
                      <div
                        key={op.code}
                        draggable={!added && canManage}
                        onDragStart={(e) => e.dataTransfer.setData('text/plain', op.code)}
                        className={cn(
                          'flex items-center gap-2 px-2.5 py-2 rounded-lg border text-sm select-none',
                          added
                            ? 'border-dashed border-gray-200 dark:border-gray-800 opacity-50'
                            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 cursor-grab active:cursor-grabbing hover:border-blue-400',
                        )}
                      >
                        {added ? (
                          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : (
                          <GripVertical className="w-4 h-4 text-gray-400 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium text-gray-800 dark:text-gray-200 text-[13px] leading-tight">
                            {translateValue(op.description, language, defaultCode) || op.code}
                          </p>
                          <p className="truncate text-[11px] text-gray-400">{op.code}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Sütun 3: Rolun icazələri (dropzone) ── */}
        <div
          onDragOver={(e) => { if (canManage && selected) { e.preventDefault(); setDragOver(true); } }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const code = e.dataTransfer.getData('text/plain');
            if (code) grant(code);
          }}
          className={cn(
            'rounded-xl border-2 p-3 flex flex-col transition-colors',
            dragOver
              ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/20'
              : 'border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900',
          )}
        >
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400 py-16">
              {t('rolesPage.selectRole')}
            </div>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2 px-1 flex items-center gap-2">
                {t('rolesPage.permissions')} — {selected}
                {accessLoading && <Loader2 className="w-3 h-3 animate-spin" />}
              </p>
              {assignedOps.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-sm text-gray-400 py-16 text-center">
                  {t('rolesPage.dropHint')}
                </div>
              ) : (
                <div className="overflow-y-auto max-h-[58vh] space-y-3 pr-1">
                  {Object.entries(assignedGroups).map(([module, ops]) => (
                    <div key={module}>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1 px-1">{module}</p>
                      <div className="space-y-1">
                        {ops.map((op) => {
                          const open = accessMap[op.code];
                          return (
                            <div
                              key={op.code}
                              className={cn(
                                'flex items-center gap-2 px-2.5 py-2 rounded-lg border text-sm',
                                open
                                  ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20'
                                  : 'border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20',
                              )}
                            >
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium text-gray-800 dark:text-gray-200 text-[13px] leading-tight">
                                  {translateValue(op.description, language, defaultCode) || op.code}
                                </p>
                                <p className="truncate text-[11px] text-gray-400">{op.code}</p>
                              </div>
                              {canManage && (
                                <>
                                  <button
                                    onClick={() => toggleLock(op.code)}
                                    title={open ? t('rolesPage.lockOn') : t('rolesPage.lockOff')}
                                    className={cn(
                                      'shrink-0 w-7 h-7 flex items-center justify-center rounded-md',
                                      open
                                        ? 'text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                                        : 'text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/30',
                                    )}
                                  >
                                    {open ? <LockOpen className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                                  </button>
                                  <button
                                    onClick={() => askTrash(op)}
                                    title={t('common.delete')}
                                    className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmState !== null}
        title={confirmState?.title}
        message={confirmState?.message}
        confirmText={confirmState?.confirmText}
        loading={confirmLoading}
        onConfirm={runConfirm}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
}
