'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import {
  Sun, Moon, Globe, User, LogOut, Bell, Shield, ShieldCheck, Pencil, KeyRound,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/authService';
import { settingService } from '@/services/settingService';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import PageHeader from '@/components/ui/PageHeader';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import type { Language } from '@/types';

const languages: { code: Language; label: string; flag: string; native: string }[] = [
  { code: 'az', label: 'Azerbaijani', flag: '🇦🇿', native: 'Azərbaycan dili' },
  { code: 'en', label: 'English', flag: '🇬🇧', native: 'English' },
  { code: 'ru', label: 'Russian', flag: '🇷🇺', native: 'Русский' },
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { user, roles, updateProfile, logout, can } = useAuth();
  const [regEnabled, setRegEnabled] = useState<boolean | null>(null);
  const [regBusy, setRegBusy] = useState(false);
  useEffect(() => { if (can('SETTINGS_VIEW')) settingService.get().then((s) => setRegEnabled(s.registration_enabled)).catch(() => {}); }, [can]);
  const toggleReg = async () => {
    if (regEnabled === null) return;
    setRegBusy(true);
    try { const s = await settingService.update({ registration_enabled: !regEnabled }); setRegEnabled(s.registration_enabled); }
    catch { /* */ } finally { setRegBusy(false); }
  };
  const router = useRouter();

  // next-themes hidrasiya: seçimi yalnız mount-dan sonra göstər
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const currentTheme = mounted ? theme : undefined;

  // Profil redaktə modalı
  const [profileOpen, setProfileOpen] = useState(false);
  const [pName, setPName] = useState('');
  const [pUsername, setPUsername] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Şifrə modalı
  const [pwOpen, setPwOpen] = useState(false);
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const openProfile = () => {
    setPName(user?.name ?? '');
    setPUsername(user?.username ?? '');
    setProfileError('');
    setProfileOpen(true);
  };

  const saveProfile = async () => {
    setProfileError('');
    setProfileLoading(true);
    try {
      await updateProfile(pName.trim(), pUsername.trim());
      setProfileOpen(false);
    } catch (e) {
      setProfileError(e instanceof ApiError ? e.message : t('common.error'));
    } finally {
      setProfileLoading(false);
    }
  };

  const openPassword = () => {
    setCurPw(''); setNewPw(''); setConfirmPw('');
    setPwError(''); setPwSuccess('');
    setPwOpen(true);
  };

  const savePassword = async () => {
    setPwError('');
    if (newPw.length < 8) { setPwError(t('common.passwordMin8')); return; }
    if (newPw !== confirmPw) { setPwError(t('common.passwordMismatch')); return; }
    setPwLoading(true);
    try {
      await authService.changePassword(curPw, newPw, confirmPw);
      setPwSuccess(t('settings.passwordChanged'));
      setCurPw(''); setNewPw(''); setConfirmPw('');
    } catch (e) {
      setPwError(e instanceof ApiError ? e.message : t('common.error'));
    } finally {
      setPwLoading(false);
    }
  };

  const initial = (user?.name?.[0] ?? user?.username?.[0] ?? 'U').toUpperCase();

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title={t('settings.title')} />

      {/* Profile section */}
      <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t('settings.profile')}</h2>
          </div>
          <button
            onClick={openProfile}
            className="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            <Pencil className="w-3.5 h-3.5" /> {t('common.edit')}
          </button>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-xl font-bold">
              {initial}
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">{user?.name ?? '—'}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">@{user?.username ?? ''}</p>
              {user?.is_super_admin && (
                <span className="text-xs bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-medium mt-1 inline-block">
                  {t('settings.superAdmin')}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Roles section (read-only) */}
      <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t('settings.myRoles')}</h2>
          <span className="text-[11px] text-gray-400">{t('settings.readOnly')}</span>
        </div>
        <div className="p-5">
          {user?.is_super_admin ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('settings.superAccess')}
            </p>
          ) : roles.length === 0 ? (
            <p className="text-sm text-gray-400">{t('settings.noRole')}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {roles.map((r) => (
                <span
                  key={r.code}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200"
                  title={r.code}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                  {r.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Theme section */}
      <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
          <Sun className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t('settings.theme')}</h2>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'light', label: t('settings.lightMode'), icon: Sun },
              { value: 'dark', label: t('settings.darkMode'), icon: Moon },
            ].map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={cn(
                  'flex items-center gap-3 p-4 rounded-xl border-2 transition-all',
                  currentTheme === value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                )}
              >
                <Icon
                  className={cn(
                    'w-5 h-5',
                    currentTheme === value ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'
                  )}
                />
                <span
                  className={cn(
                    'text-sm font-medium',
                    currentTheme === value ? 'text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-300'
                  )}
                >
                  {label}
                </span>
                {currentTheme === value && (
                  <div className="ml-auto w-2 h-2 rounded-full bg-blue-500" />
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Language section */}
      <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
          <Globe className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t('settings.language')}</h2>
        </div>
        <div className="p-5">
          <div className="space-y-2">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code)}
                className={cn(
                  'w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left',
                  language === lang.code
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                )}
              >
                <span className="text-xl">{lang.flag}</span>
                <div>
                  <p
                    className={cn(
                      'text-sm font-semibold',
                      language === lang.code
                        ? 'text-blue-700 dark:text-blue-300'
                        : 'text-gray-700 dark:text-gray-200'
                    )}
                  >
                    {lang.native}
                  </p>
                  <p className="text-xs text-gray-400">{lang.label}</p>
                </div>
                {language === lang.code && (
                  <div className="ml-auto w-2 h-2 rounded-full bg-blue-500" />
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
          <Bell className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t('settings.notifications')}</h2>
        </div>
        <div className="p-5 space-y-3">
          {[
            { label: t('settings.notif1'), defaultOn: true },
            { label: t('settings.notif2'), defaultOn: true },
            { label: t('settings.notif3'), defaultOn: false },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
              <button
                className={cn(
                  'relative w-10 h-5 rounded-full transition-colors',
                  item.defaultOn ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                )}
              >
                <div
                  className={cn(
                    'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                    item.defaultOn ? 'translate-x-5' : 'translate-x-0.5'
                  )}
                />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Security */}
      <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
          <Shield className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t('settings.security')}</h2>
        </div>
        <div className="p-5">
          <Button variant="outline" size="sm" leftIcon={<KeyRound className="w-4 h-4" />} onClick={openPassword}>
            {t('common.changePassword')}
          </Button>
        </div>
      </section>

      {/* Sistem: qeydiyyat (yalnız SETTINGS_VIEW) */}
      {regEnabled !== null && (
        <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
            <Shield className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t('settings.system')}</h2>
          </div>
          <div className="p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{t('settings.registration')}</p>
              <p className="text-xs text-gray-400">{t('settings.registrationHint')}</p>
            </div>
            <button
              onClick={toggleReg}
              disabled={!can('SETTINGS_MANAGE') || regBusy}
              className={cn('relative w-11 h-6 rounded-full transition-colors shrink-0 disabled:opacity-50',
                regEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700')}
            >
              <span className={cn('absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform', regEnabled && 'translate-x-5')} />
            </button>
          </div>
        </section>
      )}

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors text-sm font-medium"
      >
        <LogOut className="w-4 h-4" />
        {t('settings.logout')}
      </button>

      {/* ── Profil redaktə modalı ── */}
      <Modal
        open={profileOpen}
        onClose={() => !profileLoading && setProfileOpen(false)}
        title={t('settings.profileEdit')}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setProfileOpen(false)} disabled={profileLoading}>
              {t('common.cancel')}
            </Button>
            <Button onClick={saveProfile} loading={profileLoading}>{t('common.save')}</Button>
          </>
        }
      >
        <div className="space-y-3">
          {profileError && (
            <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600 dark:text-red-400">
              {profileError}
            </div>
          )}
          <Input label={t('common.name')} value={pName} onChange={(e) => setPName(e.target.value)} />
          <Input label={t('auth.username')} value={pUsername} onChange={(e) => setPUsername(e.target.value)} />
        </div>
      </Modal>

      {/* ── Şifrə dəyişmə modalı ── */}
      <Modal
        open={pwOpen}
        onClose={() => !pwLoading && setPwOpen(false)}
        title={t('common.changePassword')}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setPwOpen(false)} disabled={pwLoading}>
              {t('common.close')}
            </Button>
            <Button onClick={savePassword} loading={pwLoading}>{t('common.changePassword')}</Button>
          </>
        }
      >
        <div className="space-y-3">
          {pwError && (
            <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600 dark:text-red-400">
              {pwError}
            </div>
          )}
          {pwSuccess && (
            <div className="px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-sm text-emerald-600 dark:text-emerald-400">
              {pwSuccess}
            </div>
          )}
          <Input label={t('common.currentPassword')} type="password" value={curPw} onChange={(e) => setCurPw(e.target.value)} />
          <Input label={t('common.newPassword')} type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
          <Input label={t('common.repeatPassword')} type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}
