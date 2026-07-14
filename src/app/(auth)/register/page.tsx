'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, Lock, User, AtSign, Eye, EyeOff, Loader2, Ban } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/authService';
import { ApiError } from '@/lib/api';

export default function RegisterPage() {
  const { t } = useLanguage();
  const { register } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ fullName: '', username: '', password: '', confirmPassword: '' });

  useEffect(() => {
    authService.registrationStatus()
      .then((r) => setEnabled(r.enabled))
      .catch(() => setEnabled(false))
      .finally(() => setChecking(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) { setError(t('common.passwordMismatch')); return; }
    if (form.password.length < 8) { setError(t('common.passwordMin8')); return; }
    setLoading(true);
    try {
      await register(form.fullName.trim(), form.username.trim(), form.password);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.error'));
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="flex flex-col items-center mb-8">
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/30 mb-4">
          <Building2 className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">LifeHub</h1>
        <p className="text-slate-400 text-sm mt-1">{t('auth.register')}</p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8">
        {checking ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
        ) : !enabled ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center mb-3"><Ban className="w-6 h-6 text-red-500" /></div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{t('auth.registrationClosed')}</p>
            <p className="text-xs text-gray-400 mt-1">{t('auth.registrationClosedHint')}</p>
            <Link href="/login" className="inline-block mt-4 text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline">{t('auth.backToLogin')}</Link>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">{t('auth.register')}</h2>
            {error && <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field icon={<User className="w-4 h-4" />} label={t('auth.fullName')} value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} placeholder="Ad Soyad" />
              <Field icon={<AtSign className="w-4 h-4" />} label={t('auth.username')} value={form.username} onChange={(v) => setForm({ ...form, username: v })} placeholder="username" />
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('auth.password')}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required
                    className="w-full h-10 pl-10 pr-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('auth.confirmPassword')}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} required
                    className="w-full h-10 pl-10 pr-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="••••••••" />
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-2">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('auth.registerButton')}
              </button>
            </form>
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
              {t('auth.hasAccount')}{' '}
              <Link href="/login" className="text-blue-600 dark:text-blue-400 font-medium hover:underline">{t('auth.loginButton')}</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ icon, label, value, onChange, placeholder }: { icon: React.ReactNode; label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} required
          className="w-full h-10 pl-10 pr-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder={placeholder} />
      </div>
    </div>
  );
}
