'use client';

import { useRef, useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, useDraggable, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { X, Plus, Trash2, GripVertical, Pencil, ArrowLeftRight, Type, AlignLeft, Bold, Sparkles, Image as ImageIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { templateService } from '@/services/studyService';
import { ApiError } from '@/lib/api';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import type { CardTemplate, TemplateField, FieldType, FieldSide } from '@/types';

const COLS = 12;
const ROW_H = 52; // px
const GAP = 6;
let idc = 0;

const slug = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60);

const typeIcon = (t: FieldType) => (t === 'textarea' ? AlignLeft : t === 'rich' ? Bold : t === 'image' ? ImageIcon : Type);

// Köhnə / koordinatsız sahələrə default grid mövqe ver (tərəf üzrə 2 sütun axını)
function normalize(fields: TemplateField[]): TemplateField[] {
  const out: TemplateField[] = [];
  (['front', 'back'] as const).forEach((side) => {
    fields.filter((f) => f.side === side).forEach((f, i) => {
      out.push({ ...f, x: f.x ?? (i % 2) * 6, y: f.y ?? Math.floor(i / 2), w: f.w ?? 6, h: f.h ?? 1 });
    });
  });
  return out;
}
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export default function TemplateBuilder({ template, onClose, onSaved }: { template: CardTemplate | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useLanguage();
  const [name, setName] = useState(template?.name ?? '');
  const [description, setDescription] = useState(template?.description ?? '');
  const [aiInstruction, setAiInstruction] = useState(template?.ai_instruction ?? '');
  const [fields, setFields] = useState<TemplateField[]>(() => normalize(template?.fields ?? []));
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [editing, setEditing] = useState<TemplateField | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const gridRefs = { front: useRef<HTMLDivElement>(null), back: useRef<HTMLDivElement>(null) };
  const metric = useRef({ cellW: 60, rowH: ROW_H + GAP });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const patch = (key: string, p: Partial<TemplateField>) => setFields((fs) => fs.map((f) => (f.key === key ? { ...f, ...p } : f)));
  const activeField = fields.find((f) => f.key === activeKey) ?? null;

  const onDragStart = (e: DragStartEvent) => {
    const f = fields.find((x) => x.key === String(e.active.id));
    if (f) {
      const el = gridRefs[f.side].current;
      if (el) metric.current = { cellW: el.clientWidth / COLS, rowH: ROW_H + GAP };
    }
    setActiveKey(String(e.active.id));
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveKey(null);
    const f = fields.find((x) => x.key === String(e.active.id));
    if (!f) return;
    const { cellW, rowH } = metric.current;
    const nx = clamp((f.x ?? 0) + Math.round(e.delta.x / cellW), 0, COLS - (f.w ?? 1));
    const ny = clamp((f.y ?? 0) + Math.round(e.delta.y / rowH), 0, 400);
    patch(f.key, { x: nx, y: ny });
  };

  // Genişlik/hündürlük dəyişmə (resize handle)
  const startResize = (f: TemplateField, e: React.PointerEvent) => {
    e.stopPropagation();
    const el = gridRefs[f.side].current;
    const cellW = el ? el.clientWidth / COLS : 60;
    const rowH = ROW_H + GAP;
    const sx = e.clientX, sy = e.clientY, sw = f.w ?? 1, sh = f.h ?? 1;
    const move = (ev: PointerEvent) => {
      const w = clamp(sw + Math.round((ev.clientX - sx) / cellW), 1, COLS - (f.x ?? 0));
      const h = clamp(sh + Math.round((ev.clientY - sy) / rowH), 1, 20);
      patch(f.key, { w, h });
    };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const addField = (side: FieldSide) => {
    const maxY = fields.filter((f) => f.side === side).reduce((m, f) => Math.max(m, (f.y ?? 0) + (f.h ?? 1)), 0);
    const field: TemplateField = { key: `field_${Date.now()}_${idc++}`, label: '', description: '', type: 'text', side, section: null, x: 0, y: maxY, w: 6, h: 1 };
    setFields((fs) => [...fs, field]);
    setEditing(field);
  };
  const removeField = (key: string) => setFields((fs) => fs.filter((f) => f.key !== key));
  const toggleSide = (f: TemplateField) => {
    const other: FieldSide = f.side === 'front' ? 'back' : 'front';
    const maxY = fields.filter((x) => x.side === other).reduce((m, x) => Math.max(m, (x.y ?? 0) + (x.h ?? 1)), 0);
    patch(f.key, { side: other, x: 0, y: maxY });
  };
  const saveEdit = (oldKey: string, next: TemplateField) => { setFields((fs) => fs.map((f) => (f.key === oldKey ? next : f))); setEditing(null); };

  const submit = async () => {
    if (!name.trim()) { setError(t('study.tplName')); return; }
    const flat = fields.map((f) => ({ ...f, key: f.key.startsWith('field_') ? slug(f.label) : f.key, label: f.label.trim() }));
    if (flat.some((f) => !f.key || !f.label)) { setError(t('study.fieldNeedLabel')); return; }
    setSaving(true); setError('');
    try {
      const data = { name: name.trim(), description: description || null, ai_instruction: aiInstruction || null, fields: flat };
      if (template) await templateService.update(template.uid, data); else await templateService.create(data);
      onSaved();
    } catch (e) { setError(e instanceof ApiError ? e.message : t('common.error')); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-gray-50 dark:bg-gray-950 flex flex-col">
      <div className="h-16 shrink-0 flex items-center gap-3 px-5 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-5 h-5" /></button>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('study.tplName')} className="flex-1 max-w-sm h-9 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-semibold outline-none focus:border-violet-500" />
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('study.tplDesc')} className="flex-1 max-w-xs h-9 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:border-violet-500" />
        <div className="ml-auto flex items-center gap-2">
          {error && <span className="text-xs text-red-500">{error}</span>}
          <Button onClick={submit} loading={saving}>{t('common.save')}</Button>
        </div>
      </div>

      <div className="shrink-0 flex items-start gap-2 px-5 py-2 border-b border-gray-100 dark:border-gray-800 bg-violet-50/40 dark:bg-violet-950/10">
        <span className="text-xs font-medium text-violet-700 dark:text-violet-300 flex items-center gap-1 mt-1.5 shrink-0"><Sparkles className="w-3.5 h-3.5" /> {t('study.aiInstruction')}</span>
        <textarea value={aiInstruction} onChange={(e) => setAiInstruction(e.target.value)} rows={1}
          placeholder={t('study.aiInstructionPh')}
          className="flex-1 min-h-[34px] px-3 py-1.5 rounded-lg border border-violet-200 dark:border-violet-800 bg-white dark:bg-gray-900 text-sm outline-none focus:border-violet-500 resize-y" />
      </div>

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
          {(['front', 'back'] as const).map((side) => (
            <Canvas key={side} side={side} title={side === 'front' ? t('study.sideFront') : t('study.sideBack')}
              gridRef={gridRefs[side]} fields={fields.filter((f) => f.side === side)}
              onAdd={() => addField(side)} onEdit={setEditing} onRemove={removeField} onToggle={toggleSide} onResize={startResize} />
          ))}
        </div>
        <DragOverlay>{activeField ? <BlockInner field={activeField} overlay /> : null}</DragOverlay>
      </DndContext>

      {editing && <FieldEditModal field={editing} onClose={() => setEditing(null)} onSave={(next) => saveEdit(editing.key, next)} />}
    </div>
  );
}

function Canvas({ side, title, gridRef, fields, onAdd, onEdit, onRemove, onToggle, onResize }: {
  side: FieldSide; title: string; gridRef: React.RefObject<HTMLDivElement | null>; fields: TemplateField[];
  onAdd: () => void; onEdit: (f: TemplateField) => void; onRemove: (k: string) => void; onToggle: (f: TemplateField) => void; onResize: (f: TemplateField, e: React.PointerEvent) => void;
}) {
  const { t } = useLanguage();
  const rows = Math.max(6, fields.reduce((m, f) => Math.max(m, (f.y ?? 0) + (f.h ?? 1)), 0) + 2);
  return (
    <div className="flex flex-col rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <span className="text-sm font-bold text-violet-600">{title}</span>
        <button onClick={onAdd} className="text-xs text-gray-500 hover:text-violet-600 inline-flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> {t('study.addField')}</button>
      </div>
      <div className="flex-1 overflow-auto p-3">
        <div ref={gridRef} className="relative rounded-xl" style={{
          display: 'grid', gridTemplateColumns: `repeat(${COLS}, 1fr)`, gridAutoRows: `${ROW_H}px`, gap: GAP,
          gridTemplateRows: `repeat(${rows}, ${ROW_H}px)`,
          backgroundImage: 'linear-gradient(90deg, rgba(139,92,246,0.06) 1px, transparent 1px), linear-gradient(rgba(139,92,246,0.06) 1px, transparent 1px)',
          backgroundSize: `calc((100% + ${GAP}px)/${COLS}) ${ROW_H + GAP}px`,
        }}>
          {fields.map((f) => <FieldBlock key={f.key} field={f} onEdit={onEdit} onRemove={onRemove} onToggle={onToggle} onResize={onResize} />)}
        </div>
      </div>
    </div>
  );
}

function FieldBlock({ field, onEdit, onRemove, onToggle, onResize }: {
  field: TemplateField; onEdit: (f: TemplateField) => void; onRemove: (k: string) => void; onToggle: (f: TemplateField) => void; onResize: (f: TemplateField, e: React.PointerEvent) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: field.key });
  const style: React.CSSProperties = {
    gridColumn: `${(field.x ?? 0) + 1} / span ${field.w ?? 1}`,
    gridRow: `${(field.y ?? 0) + 1} / span ${field.h ?? 1}`,
    transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="relative rounded-lg border border-violet-200 dark:border-violet-900 bg-violet-50/70 dark:bg-violet-950/30 p-1.5 flex flex-col overflow-hidden group">
      <div className="flex items-center gap-1">
        <span {...attributes} {...listeners} className="cursor-grab text-violet-300 hover:text-violet-500"><GripVertical className="w-4 h-4" /></span>
        <BlockInner field={field} />
        <div className="ml-auto flex gap-0.5 opacity-0 group-hover:opacity-100">
          <button onClick={() => onToggle(field)} className="text-gray-400 hover:text-violet-600" title="Ön/Arxa"><ArrowLeftRight className="w-3.5 h-3.5" /></button>
          <button onClick={() => onEdit(field)} className="text-gray-400 hover:text-blue-600"><Pencil className="w-3.5 h-3.5" /></button>
          <button onClick={() => onRemove(field.key)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      <div onPointerDown={(e) => onResize(field, e)} className="absolute bottom-0 right-0 w-3 h-3 cursor-nwse-resize" title="ölçü">
        <div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 border-r-2 border-b-2 border-violet-400" />
      </div>
    </div>
  );
}

function BlockInner({ field, overlay }: { field: TemplateField; overlay?: boolean }) {
  const Icon = typeIcon(field.type);
  return (
    <div className={`flex items-center gap-1.5 min-w-0 ${overlay ? 'rounded-lg border bg-white dark:bg-gray-900 px-2 py-1.5 shadow-xl' : ''}`}>
      <Icon className="w-3.5 h-3.5 text-violet-400 shrink-0" />
      <span className="text-xs font-medium text-gray-800 dark:text-gray-100 truncate">{field.label || <span className="text-gray-400 italic">adsız</span>}</span>
    </div>
  );
}

function FieldEditModal({ field, onClose, onSave }: { field: TemplateField; onClose: () => void; onSave: (f: TemplateField) => void }) {
  const { t } = useLanguage();
  const [label, setLabel] = useState(field.label);
  const [key, setKey] = useState(field.key.startsWith('field_') ? '' : field.key);
  const [description, setDescription] = useState(field.description ?? '');
  const [type, setType] = useState<FieldType>(field.type);
  const [list, setList] = useState(!!field.list);
  const sel = 'w-full h-9 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:border-violet-500';
  return (
    <Modal open onClose={onClose} title={t('study.fieldLabel')} size="sm"
      footer={<><Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button><Button onClick={() => onSave({ ...field, key: (key.trim() || slug(label) || field.key), label: label.trim(), description: description.trim() || null, type, list })}>{t('common.save')}</Button></>}>
      <div className="space-y-3">
        <Input label={t('study.fieldLabel')} value={label} onChange={(e) => setLabel(e.target.value)} />
        <Input label={t('study.fieldKey')} value={key} onChange={(e) => setKey(e.target.value)} placeholder={slug(label)} />
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('study.fieldDesc')}</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full min-h-[60px] px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:border-violet-500 resize-y" />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('study.fieldType')}</label>
          <select value={type} onChange={(e) => setType(e.target.value as FieldType)} className={sel}>
            <option value="text">{t('study.typeText')}</option>
            <option value="textarea">{t('study.typeTextarea')}</option>
            <option value="rich">{t('study.typeRich')}</option>
            <option value="image">{t('study.typeImage')}</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer pt-1">
          <input type="checkbox" checked={list} onChange={(e) => setList(e.target.checked)} className="w-4 h-4 rounded" />
          {t('study.showInList')}
        </label>
      </div>
    </Modal>
  );
}
