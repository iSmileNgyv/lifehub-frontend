'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { Bell, Sun, Moon, Search, ChevronDown, Check, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { notificationService } from '@/services/notificationService';
import { formatDateTime } from '@/lib/utils';
import type { Language } from '@/types';

const languages: { code: Language; label: string; flag: string }[] = [
  { code: 'az', label: 'AZ', flag: '🇦🇿' },
  { code: 'en', label: 'EN', flag: '🇬🇧' },
  { code: 'ru', label: 'RU', flag: '🇷🇺' },
];

export default function Topbar() {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [notifOpen, setNotifOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState(() =>
    notificationService.getAll()
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  const initial = (user?.name?.[0] ?? user?.username?.[0] ?? 'U').toUpperCase();

  const handleLogout = async () => {
    setProfileOpen(false);
    await logout();
    router.replace('/login');
  };

  const markAllRead = () => {
    notificationService.markAllAsRead();
    setNotifications(notificationService.getAll());
  };

  const notifTypeColor: Record<string, string> = {
    info: 'bg-blue-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500',
  };

  return (
    <header className="h-14 flex items-center gap-3 px-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shrink-0">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={t('common.search')}
            className="w-full h-9 pl-9 pr-4 rounded-lg bg-gray-100 dark:bg-gray-800 border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-700 outline-none text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-1 ml-auto">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Language switcher */}
        <div className="relative">
          <button
            onClick={() => { setLangOpen(!langOpen); setNotifOpen(false); }}
            className="flex items-center gap-1.5 px-3 h-9 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm font-medium"
          >
            <span>{languages.find((l) => l.code === language)?.flag}</span>
            <span>{language.toUpperCase()}</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          {langOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setLangOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden min-w-[120px]">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => { setLanguage(lang.code); setLangOpen(false); }}
                    className={cn(
                      'flex items-center gap-2.5 w-full px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors',
                      language === lang.code
                        ? 'text-blue-600 dark:text-blue-400 font-medium'
                        : 'text-gray-700 dark:text-gray-300'
                    )}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.label}</span>
                    {language === lang.code && <Check className="w-3 h-3 ml-auto" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setNotifOpen(!notifOpen); setLangOpen(false); }}
            className="relative flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>

          {notifOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                  <span className="font-semibold text-sm text-gray-900 dark:text-white">
                    {t('settings.notifications')} {unreadCount > 0 && `(${unreadCount})`}
                  </span>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {t('common.markAllRead')}
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-center text-sm text-gray-400 py-8">
                      {t('common.noData')}
                    </p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={cn(
                          'flex gap-3 px-4 py-3 border-b border-gray-50 dark:border-gray-800 last:border-0',
                          !n.read && 'bg-blue-50 dark:bg-blue-950/30'
                        )}
                      >
                        <div
                          className={cn(
                            'w-2 h-2 rounded-full mt-1.5 shrink-0',
                            notifTypeColor[n.type] || 'bg-gray-400'
                          )}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {n.title}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {n.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDateTime(n.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Profile */}
        <div className="relative ml-1">
          <button
            onClick={() => { setProfileOpen(!profileOpen); setLangOpen(false); setNotifOpen(false); }}
            className="flex items-center gap-2 px-2 h-9 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold">
              {initial}
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200 hidden sm:block">
              {user?.name ?? user?.username ?? ''}
            </span>
            <ChevronDown className="w-3 h-3 text-gray-400" />
          </button>

          {profileOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user?.name ?? ''}
                  </p>
                  {user?.username && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      @{user.username}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  {t('settings.logout')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
