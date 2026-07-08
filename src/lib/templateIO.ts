import type { CardTemplate, TemplateField } from '@/types';

export interface PortableTemplate {
  name: string;
  description: string | null;
  ai_instruction: string | null;
  fields: TemplateField[];
}

/** Şablonun daşınan (portativ) JSON forması — uid/owner olmadan. */
export function toExport(tpl: CardTemplate): PortableTemplate {
  return { name: tpl.name, description: tpl.description ?? null, ai_instruction: tpl.ai_instruction ?? null, fields: tpl.fields };
}

/** İdxal edilən mətni yoxla və şablon payload-una çevir. Xəta olsa null. */
export function parseImport(text: string): PortableTemplate | null {
  let obj: unknown;
  try { obj = JSON.parse(text); } catch { return null; }
  if (!obj || typeof obj !== 'object') return null;
  const o = obj as Record<string, unknown>;
  if (typeof o.name !== 'string' || !Array.isArray(o.fields)) return null;
  const fields = (o.fields as unknown[]).map((raw) => {
    const f = (raw ?? {}) as Record<string, unknown>;
    return {
      key: String(f.key ?? ''),
      label: String(f.label ?? ''),
      description: f.description == null ? '' : String(f.description),
      type: (['text', 'textarea', 'rich', 'image', 'heading'].includes(String(f.type)) ? f.type : 'text') as TemplateField['type'],
      side: (f.side === 'back' ? 'back' : 'front') as TemplateField['side'],
      section: f.section == null ? null : String(f.section),
      list: !!f.list,
      x: f.x == null ? null : Number(f.x),
      y: f.y == null ? null : Number(f.y),
      w: f.w == null ? null : Number(f.w),
      h: f.h == null ? null : Number(f.h),
      level: (['h1', 'h2', 'h3', 'h4'].includes(String(f.level)) ? f.level : undefined) as TemplateField['level'],
      color: f.color == null ? null : String(f.color),
      align: (['left', 'center', 'right'].includes(String(f.align)) ? f.align : undefined) as TemplateField['align'],
    } as TemplateField;
  }).filter((f) => f.key);
  if (fields.length === 0) return null;
  return {
    name: o.name,
    description: typeof o.description === 'string' ? o.description : null,
    ai_instruction: typeof o.ai_instruction === 'string' ? o.ai_instruction : null,
    fields,
  };
}
