'use client';

import { useEffect, useRef } from 'react';
import { Bold, Italic, Underline } from 'lucide-react';

const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#111827'];

// Yüngül sanitizasiya (SSR-təhlükəsiz) — script/handler-ləri təmizlə
export function sanitizeHtml(html: string): string {
  return (html || '')
    .replace(/<\s*script[^>]*>[\s\S]*?<\/\s*script>/gi, '')
    .replace(/<\s*style[^>]*>[\s\S]*?<\/\s*style>/gi, '')
    .replace(/ on\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/ on\w+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:/gi, '');
}

// Formatlı mətn görünüşü
export function RichView({ html, className }: { html: string; className?: string }) {
  return <span className={className} dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />;
}

// Sadə formatlı input: Qalın / Əyri / Altdan xətt
export function RichInput({ value, onChange, className }: { value: string; onChange: (html: string) => void; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  // Xarici dəyər dəyişəndə (məs. AI doldurma) redaktoru yenilə — yazarkən sıfırlama
  useEffect(() => {
    const el = ref.current;
    if (el && el.innerHTML !== (value || '')) el.innerHTML = value || '';
  }, [value]);

  const exec = (cmd: string) => {
    document.execCommand(cmd, false);
    ref.current?.focus();
    onChange(ref.current?.innerHTML || '');
  };
  const applyColor = (c: string) => {
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand('foreColor', false, c);
    ref.current?.focus();
    onChange(ref.current?.innerHTML || '');
  };
  const btn = 'w-7 h-7 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800';

  return (
    <div className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus-within:border-violet-500 overflow-hidden">
      <div className="flex items-center gap-0.5 px-1.5 py-1 border-b border-gray-100 dark:border-gray-800 flex-wrap">
        <button type="button" className={btn} onMouseDown={(e) => { e.preventDefault(); exec('bold'); }} title="Qalın"><Bold className="w-3.5 h-3.5" /></button>
        <button type="button" className={btn} onMouseDown={(e) => { e.preventDefault(); exec('italic'); }} title="Əyri"><Italic className="w-3.5 h-3.5" /></button>
        <button type="button" className={btn} onMouseDown={(e) => { e.preventDefault(); exec('underline'); }} title="Altdan xətt"><Underline className="w-3.5 h-3.5" /></button>
        <span className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1" />
        {COLORS.map((c) => (
          <button key={c} type="button" onMouseDown={(e) => { e.preventDefault(); applyColor(c); }} title="Rəng"
            className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600 mx-0.5" style={{ backgroundColor: c }} />
        ))}
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={() => onChange(ref.current?.innerHTML || '')}
        className={`px-3 py-2 text-sm outline-none min-h-[38px] ${className ?? ''}`}
      />
    </div>
  );
}
