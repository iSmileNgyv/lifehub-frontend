import { cn } from '@/lib/utils';
import { RotateCw } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
  /** Verilsə, başlıqda yeniləmə düyməsi çıxır — səhifə datasını yenidən çəkir (brauzer refresh deyil). */
  onRefresh?: () => void;
  refreshing?: boolean;
  refreshLabel?: string;
}

export default function PageHeader({ title, subtitle, actions, className, onRefresh, refreshing, refreshLabel }: PageHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4 mb-6', className)}>
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h1>
        {subtitle && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
        )}
      </div>
      {(actions || onRefresh) && (
        <div className="flex items-center gap-2 shrink-0">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing}
              title={refreshLabel}
              className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-60"
            >
              <RotateCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
            </button>
          )}
          {actions}
        </div>
      )}
    </div>
  );
}
