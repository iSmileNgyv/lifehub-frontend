'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { fileUrl } from '@/services/fileService';

type Size = 'sm' | 'md' | 'lg';

const textSize = (size: Size) => (size === 'lg' ? 'text-6xl' : size === 'sm' ? 'text-xl' : 'text-4xl');

/** Şəkil yoxdursa default: qradiyent fon + baş hərf (heç vaxt qara görünmür). */
export function NoImage({ initial, className, size = 'md' }: { initial: string; className?: string; size?: Size }) {
  return (
    <div className={cn('bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center', className)}>
      <span className={cn('font-bold text-slate-400/70 dark:text-slate-400/60 select-none', textSize(size))}>{initial || '?'}</span>
    </div>
  );
}

/** Real şəkil (uid) və ya default. */
export function EntityImage({ uid, initial, className, size }: { uid: string | null; initial: string; className?: string; size?: Size }) {
  const [err, setErr] = useState(false);
  const url = fileUrl(uid);
  if (!uid || err || !url) return <NoImage initial={initial} className={className} size={size} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" onError={() => setErr(true)} className={cn('object-cover', className)} />;
}
