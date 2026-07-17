'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Package,
  Tag,
  Ruler,
  ClipboardList,
  Warehouse,
  Users2,
  Combine,
  ShieldCheck,
  Settings,
  Landmark,
  Flame,
  CalendarDays,
  TrendingUp,
  Car,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Building2,
  Send,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

interface NavLeaf { key: string; href: string; op: string }
interface NavItem { key: string; icon: LucideIcon; href?: string; op?: string; children?: NavLeaf[] }

// Hər menyu öz VIEW operation-una bağlıdır — icazə yoxdursa görünmür.
const navItems: NavItem[] = [
  { key: 'dashboard', href: '/dashboard', icon: LayoutDashboard, op: 'DASHBOARD_VIEW' },
  {
    key: 'trading', icon: TrendingUp, children: [
      { key: 'tradingJournals', href: '/trading', op: 'TRADING_VIEW' },
      { key: 'tradingFormulas', href: '/trading/formulas', op: 'TRADING_VIEW' },
    ],
  },
  { key: 'vehicles', href: '/vehicles', icon: Car, op: 'VEHICLE_VIEW' },
  {
    key: 'study', icon: GraduationCap, children: [
      { key: 'studyDecks', href: '/study', op: 'STUDY_VIEW' },
      { key: 'studyParams', href: '/study/settings', op: 'STUDY_VIEW' },
    ],
  },
  { key: 'telegram', href: '/telegram', icon: Send, op: 'STUDY_VIEW' },
  {
    key: 'catalog', icon: Package, children: [
      { key: 'productsList', href: '/products', op: 'PRODUCT_VIEW' },
      { key: 'categories', href: '/categories', op: 'CATEGORY_VIEW' },
      { key: 'measures', href: '/measures', op: 'MEASURE_VIEW' },
    ],
  },
  {
    key: 'finance', icon: Landmark, children: [
      { key: 'financeJournals', href: '/finance-journals', op: 'FINANCE_VIEW' },
      { key: 'financeLedger', href: '/finance-ledger', op: 'FINANCE_VIEW' },
      { key: 'financeReports', href: '/finance-reports', op: 'FINANCE_VIEW' },
      { key: 'cashdesks', href: '/cash-desks', op: 'CASHDESK_VIEW' },
      { key: 'finCategories', href: '/finance-categories', op: 'FINCATEGORY_VIEW' },
    ],
  },
  { key: 'users', href: '/users', icon: Users2, op: 'USER_VIEW' },
  { key: 'roles', href: '/roles', icon: ShieldCheck, op: 'ROLE_VIEW' },
  { key: 'settings', href: '/settings', icon: Settings, op: 'SETTINGS_VIEW' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const pathname = usePathname();
  const { t } = useLanguage();
  const { can } = useAuth();

  // Bütün leaf href-lər — «ən uzun uyğunluq» üçün (sibling prefiks toqquşmasını həll edir)
  const allHrefs = navItems.flatMap((i) => (i.children ? i.children.map((c) => c.href) : i.href ? [i.href] : []));
  const matches = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  // href aktivdir yalnız o zaman ki, uyğun gəlir VƏ daha uzun (spesifik) uyğun href yoxdur
  const isActive = (href: string) => matches(href) && !allHrefs.some((h) => h.length > href.length && matches(h));

  // İcazəyə görə filtr (qruplarda ən azı bir görünən uşaq)
  const visible = navItems
    .map((item): NavItem | null => {
      if (item.children) {
        const kids = item.children.filter((c) => can(c.op));
        return kids.length ? { ...item, children: kids } : null;
      }
      return item.op && can(item.op) ? item : null;
    })
    .filter((x): x is NavItem => x !== null);

  const leafClass = (active: boolean) =>
    cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group',
      active ? 'bg-blue-600 text-white shadow-sm'
        : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white');

  return (
    <aside className={cn('relative flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 shrink-0', collapsed ? 'w-16' : 'w-60')}>
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 shrink-0">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        {!collapsed && <span className="text-gray-900 dark:text-white font-semibold text-sm tracking-wide truncate">LifeHub</span>}
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {visible.map((item) => {
          const Icon = item.icon;

          // Qrup
          if (item.children) {
            const hasActive = item.children.some((c) => isActive(c.href));
            const expanded = open[item.key] ?? hasActive;

            // Yığılmış sidebar: qrup ikonu ilk uşağa keçid
            if (collapsed) {
              const first = item.children[0];
              return (
                <Link key={item.key} href={first.href} title={t(`nav.${item.key}`)} className={leafClass(hasActive)}>
                  <Icon className="w-5 h-5 shrink-0" />
                </Link>
              );
            }

            return (
              <div key={item.key}>
                <button
                  onClick={() => setOpen((o) => ({ ...o, [item.key]: !expanded }))}
                  className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    hasActive ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-gray-800')}
                >
                  <Icon className="w-4 h-4 shrink-0 text-gray-400 dark:text-slate-400" />
                  <span className="truncate flex-1 text-left">{t(`nav.${item.key}`)}</span>
                  <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform', expanded && 'rotate-180')} />
                </button>
                {expanded && (
                  <div className="mt-0.5 ml-3 pl-3 border-l border-gray-100 dark:border-gray-800 space-y-0.5">
                    {item.children.map((c) => (
                      <Link key={c.key} href={c.href} className={cn('flex items-center px-3 py-2 rounded-lg text-sm transition-colors',
                        isActive(c.href) ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white')}>
                        <span className="truncate">{t(`nav.${c.key}`)}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          // Flat
          const active = isActive(item.href!);
          return (
            <Link key={item.key} href={item.href!} title={collapsed ? t(`nav.${item.key}`) : undefined} className={leafClass(active)}>
              <Icon className={cn('shrink-0 transition-colors', collapsed ? 'w-5 h-5' : 'w-4 h-4',
                active ? 'text-white' : 'text-gray-400 dark:text-slate-400 group-hover:text-gray-700 dark:group-hover:text-white')} />
              {!collapsed && <span className="truncate">{t(`nav.${item.key}`)}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-2 border-t border-gray-100 dark:border-gray-800">
        <button onClick={() => setCollapsed(!collapsed)} className="flex items-center justify-center w-full h-9 rounded-lg text-gray-400 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}
