'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  footer?: React.ReactNode;
  /** Bayıra (backdrop) klik modalı bağlasın? Forma modallarında işin itməməsi üçün default false. */
  closeOnBackdrop?: boolean;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  '2xl': 'max-w-6xl',
};

export default function Modal({ open, onClose, title, children, size = 'md', footer, closeOnBackdrop = false }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  // Windows kimi: başlıqdan sürüklə (pos), küncdən ölçü dəyiş (dim). Açılanda sıfırlanır.
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [dim, setDim] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);
  useEffect(() => { if (open) { setPos(null); setDim(null); } }, [open]);

  if (!open) return null;

  const startDrag = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return; // düymələr sürükləmə deyil
    e.preventDefault();
    const sx = e.clientX, sy = e.clientY;
    const base = pos ?? { x: 0, y: 0 };
    const move = (ev: MouseEvent) => setPos({ x: base.x + (ev.clientX - sx), y: base.y + (ev.clientY - sy) });
    const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  };

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX, sy = e.clientY, sw = rect.width, sh = rect.height;
    const move = (ev: MouseEvent) => setDim({ w: Math.max(300, sw + (ev.clientX - sx)), h: Math.max(180, sh + (ev.clientY - sy)) });
    const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeOnBackdrop ? onClose : undefined} />

      {/* Modal */}
      <div
        ref={panelRef}
        className={cn(
          'relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col',
          dim ? 'w-full' : cn('w-full max-h-[90vh]', sizeClasses[size]),
        )}
        style={{
          transform: pos ? `translate(${pos.x}px, ${pos.y}px)` : undefined,
          width: dim ? dim.w : undefined,
          height: dim ? dim.h : undefined,
          maxWidth: '95vw',
          maxHeight: '92vh',
        }}
      >
        {/* Header — sürüklə */}
        {title && (
          <div onMouseDown={startDrag} className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0 cursor-move select-none">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-800 shrink-0">
            {footer}
          </div>
        )}

        {/* Ölçü dəyişmə tutacağı (aşağı sağ künc) */}
        <div
          onMouseDown={startResize}
          title="Ölçünü dəyiş"
          className="absolute bottom-0.5 right-0.5 w-4 h-4 flex items-end justify-end cursor-nwse-resize text-gray-300 dark:text-gray-600 hover:text-gray-500"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden><path d="M11 4 4 11M11 8 8 11" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" /></svg>
        </div>
      </div>
    </div>
  );
}
