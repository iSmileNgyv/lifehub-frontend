'use client';

import { EntityImage } from '@/components/ui/EntityImage';
import { RichView } from '@/components/study/RichText';
import type { CardTemplate, FieldSide } from '@/types';

const COLS = 12;

// Şablonlu kartın bir tərəfini (ön/arxa) x/y/w/h grid mövqelərində göstərir
export default function TemplateSideView({ values, template, side }: { values: Record<string, string> | null; template: CardTemplate; side: FieldSide }) {
  const v = values ?? {};
  const fs = template.fields.filter((f) => f.side === side && v[f.key]);
  if (!fs.length) return null;

  // Koordinat yoxdursa (köhnə şablon) — sadə siyahı (label : dəyər)
  const hasLayout = fs.some((f) => f.x != null);
  if (!hasLayout) {
    return (
      <div className="w-full max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
        {fs.map((f) => (
          <div key={f.key} className="flex justify-between gap-3 border-b border-gray-100 dark:border-gray-800 py-1.5">
            <span className="text-sm text-gray-500 dark:text-gray-400">{f.label}</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 text-right">
              {f.type === 'image' ? <EntityImage uid={v[f.key]} initial="?" className="max-h-24 w-auto rounded-lg object-contain" />
                : f.type === 'rich' ? <RichView html={v[f.key]} />
                  : v[f.key]}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full" style={{ display: 'grid', gridTemplateColumns: `repeat(${COLS}, 1fr)`, gridAutoRows: 'minmax(48px, auto)', gap: 8 }}>
      {fs.map((f) => (
        <div key={f.key} style={{ gridColumn: `${(f.x ?? 0) + 1} / span ${f.w ?? 1}`, gridRow: `${(f.y ?? 0) + 1} / span ${f.h ?? 1}` }}
          className="rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/30 px-3 py-2 flex flex-col justify-center">
          <p className="text-[10px] uppercase tracking-wide text-gray-400 truncate">{f.label}</p>
          {f.type === 'image'
            ? <EntityImage uid={v[f.key]} initial="?" className="max-h-32 w-auto rounded-lg object-contain mt-1" />
            : f.type === 'rich'
              ? <RichView html={v[f.key]} className="text-base font-semibold text-gray-900 dark:text-white whitespace-pre-wrap break-words" />
              : <p className="text-base font-semibold text-gray-900 dark:text-white whitespace-pre-wrap break-words">{v[f.key]}</p>}
        </div>
      ))}
    </div>
  );
}
