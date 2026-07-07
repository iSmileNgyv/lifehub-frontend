'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Search, Plus, Pencil, KeyRound, ShieldCheck, Loader2, UserPlus, X, Check, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useContentLanguages } from '@/contexts/ContentLanguagesContext';
import { userService } from '@/services/userService';
import { roleService } from '@/services/roleService';
import { ApiError } from '@/lib/api';
import { translateValue } from '@/lib/translate';
import PageHeader from '@/components/ui/PageHeader';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import type { ManagedUser, Role, UserStatus } from '@/types';

const STATUSES: UserStatus[] = ['active', 'inactive', 'banned'];

const STATUS_CLS: Record<UserStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  inactive: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  banned: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
};

// Cədvəl sütun şablonu (header və sətirlər eyni): ad | username | rollar | status | əməliyyat
const GRID = 'grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.4fr)_140px_120px] items-center gap-2 px-4';
const ROW_HEIGHT = 56;

export default function UsersPage() {
  const { can, user: me } = useAuth();
  const { t } = useLanguage();
  const canUpdate = can('USER_UPDATE');
  const canAssignRoles = can('USER_ROLE_ASSIGN');

  // Browse (infinite scroll) siyahısı
  const [items, setItems] = useState<ManagedUser[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Axtarış
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [searchResults, setSearchResults] = useState<ManagedUser[] | null>(null);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searching, setSearching] = useState(false);

  const [error, setError] = useState('');

  // İlk yükləmə (StrictMode-da effekt ikiqat çağrılmasın deyə guard)
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    userService
      .list({ page: 1 })
      .then((r) => {
        setItems(r.data);
        setPage(r.current_page);
        setLastPage(r.last_page);
        setTotal(r.total);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Yüklənmə xətası'))
      .finally(() => setLoading(false));
  }, []);

  // Axtarış debounce
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  // Serverdə axtarış (lokalda tapılmasa belə)
  useEffect(() => {
    if (!debounced) {
      setSearchResults(null);
      return;
    }
    let active = true;
    setSearching(true);
    userService
      .list({ q: debounced })
      .then((r) => {
        if (!active) return;
        setSearchResults(r.data);
        setSearchTotal(r.total);
      })
      .finally(() => active && setSearching(false));
    return () => {
      active = false;
    };
  }, [debounced]);

  const [refreshing, setRefreshing] = useState(false);
  const refresh = useCallback(() => {
    setRefreshing(true);
    setQuery('');
    userService
      .list({ page: 1 })
      .then((r) => { setItems(r.data); setPage(r.current_page); setLastPage(r.last_page); setTotal(r.total); })
      .catch((e) => setError(e instanceof ApiError ? e.message : t('common.error')))
      .finally(() => setRefreshing(false));
  }, [t]);

  const loadMore = useCallback(async () => {
    if (loadingMore || page >= lastPage) return;
    setLoadingMore(true);
    try {
      const r = await userService.list({ page: page + 1 });
      setItems((prev) => [...prev, ...r.data]);
      setPage(r.current_page);
      setLastPage(r.last_page);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, page, lastPage]);

  // Ani lokal süzgəc (server cavabı gələnə qədər)
  const localFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (u) => u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q),
    );
  }, [items, query]);

  const isSearch = query.trim().length > 0;
  const rows = isSearch ? (searchResults ?? localFiltered) : items;

  // Virtualizasiya (windowing) — yalnız görünən sətirlər render olunur
  const scrollRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });
  const virtualRows = rowVirtualizer.getVirtualItems();

  // Infinite scroll — yalnız konteynerin DİBİNƏ yaxınlaşanda növbəti səhifə
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || isSearch || loadingMore || page >= lastPage) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 240) loadMore();
  }, [isSearch, loadingMore, page, lastPage, loadMore]);

  // Ekran tam dolmayıbsa (məs. az sətir) növbəti səhifəni gətir — amma overflow varsa YOX
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || isSearch || loadingMore || page >= lastPage) return;
    if (el.scrollHeight <= el.clientHeight + 4) loadMore();
  }, [items, isSearch, loadingMore, page, lastPage, loadMore]);

  const applyUpdate = (u: ManagedUser) => {
    setItems((prev) => prev.map((x) => (x.uid === u.uid ? u : x)));
    setSearchResults((prev) => (prev ? prev.map((x) => (x.uid === u.uid ? u : x)) : prev));
  };

  const changeStatus = async (u: ManagedUser, status: UserStatus) => {
    const prevStatus = u.status;
    applyUpdate({ ...u, status });
    try {
      const updated = await userService.update(u.uid, { status });
      applyUpdate(updated);
    } catch (e) {
      applyUpdate({ ...u, status: prevStatus });
      setError(e instanceof ApiError ? e.message : t('common.error'));
    }
  };

  // ── Modallar ──
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ManagedUser | null>(null);
  const [pwTarget, setPwTarget] = useState<ManagedUser | null>(null);
  const [rolesTarget, setRolesTarget] = useState<ManagedUser | null>(null);

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
        onRefresh={refresh}
        refreshing={refreshing}
        refreshLabel={t('common.refresh')}
        title={t('nav.users')}
        subtitle={`${total} ${t('usersPage.unit')}`}
        actions={
          can('USER_CREATE') && (
            <Button leftIcon={<UserPlus className="w-4 h-4" />} onClick={() => setCreateOpen(true)}>
              {t('usersPage.new')}
            </Button>
          )
        }
      />

      {error && (
        <div className="mb-4 flex items-center justify-between px-4 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
          {error}
          <button onClick={() => setError('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Axtarış */}
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('usersPage.searchPlaceholder')}
          className="w-full h-10 pl-9 pr-9 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm outline-none focus:ring-1 focus:ring-blue-500"
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
        )}
      </div>

      {/* Cədvəl — sabit başlıq + virtualizasiya olunan daxili scroll */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col">
        {/* Başlıq sətri (sabit) */}
        <div className={cn(GRID, 'py-3 text-xs uppercase tracking-wide text-gray-400 font-semibold border-b border-gray-100 dark:border-gray-800 shrink-0')}>
          <span>{t('common.name')}</span>
          <span>{t('auth.username')}</span>
          <span>{t('usersPage.colRoles')}</span>
          <span>{t('common.status')}</span>
          <span className="text-right">{t('common.actions')}</span>
        </div>

        {/* Scroll konteyner — yalnız bu hissə sürüşür */}
        <div ref={scrollRef} onScroll={handleScroll} className="overflow-auto h-[calc(100vh-19rem)] min-h-[300px]">
          {rows.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">
              {isSearch ? t('common.noResults') : t('usersPage.empty')}
            </div>
          ) : (
            <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
              {virtualRows.map((vr) => {
                const u = rows[vr.index];
                const lockStatus = u.is_super_admin || u.uid === me?.uid || !canUpdate;
                return (
                  <div
                    key={u.uid}
                    className={cn(GRID, 'absolute left-0 w-full border-b border-gray-50 dark:border-gray-800/60 hover:bg-gray-50 dark:hover:bg-gray-800/40')}
                    style={{ top: 0, height: vr.size, transform: `translateY(${vr.start}px)` }}
                  >
                    {/* Ad */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                        {(u.name[0] ?? 'U').toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white truncate">{u.name}</span>
                      {u.is_super_admin && (
                        <span className="text-[10px] bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-full font-medium shrink-0">
                          super
                        </span>
                      )}
                    </div>
                    {/* İstifadəçi adı */}
                    <span className="text-gray-500 dark:text-gray-400 truncate">@{u.username}</span>
                    {/* Rollar */}
                    <div className="flex items-center gap-1 min-w-0 flex-wrap">
                      {u.is_super_admin ? (
                        <span className="text-[11px] text-amber-600 dark:text-amber-400">{t('usersPage.fullAccess')}</span>
                      ) : u.roles.length === 0 ? (
                        <span className="text-gray-300 dark:text-gray-600">—</span>
                      ) : (
                        <>
                          {u.roles.slice(0, 2).map((r) => (
                            <span key={r.code} title={r.code} className="text-[11px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 truncate max-w-[110px]">
                              {r.name}
                            </span>
                          ))}
                          {u.roles.length > 2 && (
                            <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500">
                              +{u.roles.length - 2}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    {/* Status */}
                    <div>
                      {lockStatus ? (
                        <span className={cn('inline-block px-2.5 py-1 rounded-full text-xs font-medium', STATUS_CLS[u.status])}>
                          {t(`common.${u.status}`)}
                        </span>
                      ) : (
                        <select
                          value={u.status}
                          onChange={(e) => changeStatus(u, e.target.value as UserStatus)}
                          className={cn(
                            'text-xs font-medium rounded-full px-2.5 py-1 border-0 outline-none cursor-pointer focus:ring-1 focus:ring-blue-500',
                            STATUS_CLS[u.status],
                          )}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s} className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
                              {t(`common.${s}`)}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    {/* Əməliyyat */}
                    <div className="flex items-center justify-end gap-1">
                      {canAssignRoles && !u.is_super_admin && (
                        <button
                          onClick={() => setRolesTarget(u)}
                          title={t('usersPage.manageRoles')}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                        >
                          <ShieldCheck className="w-4 h-4" />
                        </button>
                      )}
                      {canUpdate && !u.is_super_admin && (
                        <>
                          <button
                            onClick={() => setEditTarget(u)}
                            title={t('common.edit')}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setPwTarget(u)}
                            title={t('common.changePassword')}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Aşağı loader — daha çox səhifə varsa həmişə görünür */}
        {!isSearch && page < lastPage && (
          <div className="flex items-center justify-center gap-2 py-3 border-t border-gray-100 dark:border-gray-800 text-gray-400 text-xs shrink-0">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('common.loadingMore')}
          </div>
        )}
        {isSearch && searchResults && searchTotal > searchResults.length && (
          <div className="py-2.5 px-4 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400 shrink-0">
            {searchTotal} / {searchResults.length} — {t('usersPage.searchRefine')}
          </div>
        )}
      </div>

      {createOpen && <CreateModal onClose={() => setCreateOpen(false)} onCreated={(u) => { setItems((p) => [u, ...p]); setTotal((t) => t + 1); }} />}
      {editTarget && <EditModal user={editTarget} onClose={() => setEditTarget(null)} onSaved={applyUpdate} />}
      {pwTarget && <PasswordModal user={pwTarget} onClose={() => setPwTarget(null)} />}
      {rolesTarget && <RolesModal user={rolesTarget} onClose={() => setRolesTarget(null)} onSaved={applyUpdate} />}
    </div>
  );
}

/* ── Yeni istifadəçi modalı ── */
function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (u: ManagedUser) => void }) {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<UserStatus>('active');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    setLoading(true);
    try {
      const u = await userService.create({ name: name.trim(), username: username.trim(), password, status });
      onCreated(u);
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open
      onClose={() => !loading && onClose()}
      title={t('usersPage.new')}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>{t('common.cancel')}</Button>
          <Button onClick={submit} loading={loading} leftIcon={<Plus className="w-4 h-4" />}>{t('common.create')}</Button>
        </>
      }
    >
      <div className="space-y-3">
        {error && <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600 dark:text-red-400">{error}</div>}
        <Input label={t('common.name')} value={name} onChange={(e) => setName(e.target.value)} />
        <Input label={t('auth.username')} value={username} onChange={(e) => setUsername(e.target.value)} />
        <Input label={t('auth.password')} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('common.status')}</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as UserStatus)}
            className="w-full h-9 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:border-blue-500"
          >
            {STATUSES.map((s) => <option key={s} value={s}>{t(`common.${s}`)}</option>)}
          </select>
        </div>
      </div>
    </Modal>
  );
}

/* ── Redaktə (ad/username) modalı ── */
function EditModal({ user, onClose, onSaved }: { user: ManagedUser; onClose: () => void; onSaved: (u: ManagedUser) => void }) {
  const { t } = useLanguage();
  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    setLoading(true);
    try {
      const u = await userService.update(user.uid, { name: name.trim(), username: username.trim() });
      onSaved(u);
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open
      onClose={() => !loading && onClose()}
      title={t('usersPage.editTitle')}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>{t('common.cancel')}</Button>
          <Button onClick={submit} loading={loading}>{t('common.save')}</Button>
        </>
      }
    >
      <div className="space-y-3">
        {error && <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600 dark:text-red-400">{error}</div>}
        <Input label={t('common.name')} value={name} onChange={(e) => setName(e.target.value)} />
        <Input label={t('auth.username')} value={username} onChange={(e) => setUsername(e.target.value)} />
      </div>
    </Modal>
  );
}

/* ── Şifrə modalı ── */
function PasswordModal({ user, onClose }: { user: ManagedUser; onClose: () => void }) {
  const { t } = useLanguage();
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const submit = async () => {
    setError('');
    if (pw.length < 8) { setError(t('common.passwordMin8')); return; }
    if (pw !== confirm) { setError(t('common.passwordMismatch')); return; }
    setLoading(true);
    try {
      await userService.setPassword(user.uid, pw, confirm);
      setSuccess(t('settings.passwordChanged'));
      setPw(''); setConfirm('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open
      onClose={() => !loading && onClose()}
      title={`${t('usersPage.passwordTitle')} — @${user.username}`}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>{t('common.close')}</Button>
          <Button onClick={submit} loading={loading} leftIcon={<KeyRound className="w-4 h-4" />}>{t('common.changePassword')}</Button>
        </>
      }
    >
      <div className="space-y-3">
        {error && <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600 dark:text-red-400">{error}</div>}
        {success && <div className="px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-sm text-emerald-600 dark:text-emerald-400">{success}</div>}
        <Input label={t('common.newPassword')} type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
        <Input label={t('common.repeatPassword')} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
    </Modal>
  );
}

/* ── Rol təyini modalı (çox rol) ── */
function RolesModal({ user, onClose, onSaved }: { user: ManagedUser; onClose: () => void; onSaved: (u: ManagedUser) => void }) {
  const { t } = useLanguage();
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set(user.roles.map((r) => r.code)));
  const [listLoading, setListLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    roleService
      .list()
      .then(setAllRoles)
      .catch((e) => setError(e instanceof ApiError ? e.message : t('common.error')))
      .finally(() => setListLoading(false));
  }, [t]);

  const toggle = (code: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(code) ? n.delete(code) : n.add(code);
      return n;
    });

  const submit = async () => {
    setError('');
    setLoading(true);
    try {
      const updated = await userService.syncRoles(user.uid, [...selected]);
      onSaved(updated);
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open
      onClose={() => !loading && onClose()}
      title={`${t('usersPage.rolesTitle')} — @${user.username}`}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>{t('common.cancel')}</Button>
          <Button onClick={submit} loading={loading} disabled={listLoading}>{t('common.save')}</Button>
        </>
      }
    >
      <div className="space-y-2">
        {error && <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600 dark:text-red-400">{error}</div>}
        {listLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-blue-600" /></div>
        ) : allRoles.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">{t('usersPage.noRolesYet')}</p>
        ) : (
          allRoles.map((r) => {
            const on = selected.has(r.code);
            return (
              <button
                key={r.code}
                onClick={() => toggle(r.code)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-left text-sm transition-colors',
                  on
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
                )}
              >
                <div className="min-w-0">
                  <p className={cn('font-medium truncate', on ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-200')}>{r.name}</p>
                  <p className="text-[11px] text-gray-400 truncate">{r.code}</p>
                </div>
                <div className={cn(
                  'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0',
                  on ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300 dark:border-gray-600',
                )}>
                  {on && <ShieldCheck className="w-3 h-3" />}
                </div>
              </button>
            );
          })
        )}
      </div>
    </Modal>
  );
}
