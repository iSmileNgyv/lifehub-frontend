'use client';

import { useRef, useState } from 'react';
import { X, ImagePlus, Upload } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import TranslatableInput from '@/components/ui/TranslatableInput';
import { EntityImage } from '@/components/ui/EntityImage';
import CategoryPicker from '@/components/pickers/CategoryPicker';
import MeasurePicker from '@/components/pickers/MeasurePicker';
import { itemService } from '@/services/itemService';
import { fileService } from '@/services/fileService';
import { useLanguage } from '@/contexts/LanguageContext';
import { useContentLanguages } from '@/contexts/ContentLanguagesContext';
import { translateValue } from '@/lib/translate';
import { ApiError } from '@/lib/api';
import type { Item, Translatable } from '@/types';

/** Ad → təxmini kod (kod boş qalsa). */
const genCode = (name: string) => {
  let base = name.trim().toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 20);
  if (!/^[A-Z]/.test(base)) base = `I${base}`;
  return `${base || 'ITEM'}_${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
};

/** Məhsul yaratma/redaktə forması (gövdə) — kateqoriya/ölçü artıq picker (select yox). Barkod dəstəyi ilə. */
export function ItemFormFields({ item, initialBarcode, onSaved, onCancel }: {
  item?: Item | null;
  initialBarcode?: string;
  onSaved: (i: Item) => void;
  onCancel: () => void;
}) {
  const { t } = useLanguage();
  const { defaultCode } = useContentLanguages();

  const [code, setCode] = useState(item?.code ?? '');
  const [name, setName] = useState<Translatable>(item?.name ?? {});
  const [category, setCategory] = useState(item?.category_code ?? '');
  const [measure, setMeasure] = useState(item?.base_measure_code ?? '');
  const [barcodes, setBarcodes] = useState<string[]>(item?.barcodes ?? (initialBarcode ? [initialBarcode] : []));
  const [newBarcode, setNewBarcode] = useState('');
  const [imageUid, setImageUid] = useState<string | null>(item?.image ?? null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (file: File) => {
    setError(''); setPreview(URL.createObjectURL(file)); setUploading(true); setProgress(0);
    try { const res = await fileService.upload(file, setProgress); setImageUid(res.uid); }
    catch (e) { setError(e instanceof Error ? e.message : t('common.error')); setPreview(null); }
    finally { setUploading(false); }
  };

  const addBarcode = () => {
    const bc = newBarcode.trim();
    if (!bc) return;
    setBarcodes((l) => (l.includes(bc) ? l : [...l, bc]));
    setNewBarcode('');
  };

  const submit = async () => {
    setError('');
    if (uploading) return;
    const nm = (translateValue(name, defaultCode, defaultCode) || Object.values(name).find((v) => v && v.trim()) || '').trim();
    if (!nm) { setError(`${t('common.name')} *`); return; }
    if (!measure) { setError(`${t('products.baseMeasure')} *`); return; }
    setSaving(true);
    const data = { name, category_code: category || null, base_measure_code: measure, status: (item?.status ?? 'ACTIVE') as Item['status'], image: imageUid, barcodes };
    try {
      const saved = item
        ? await itemService.update(item.code, data)
        : await itemService.create({ ...data, code: (code.trim().toUpperCase() || genCode(nm)) });
      onSaved(saved);
    } catch (e) { setError(e instanceof ApiError ? e.message : t('common.error')); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-3">
      {error && <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600">{error}</div>}

      {/* Şəkil */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => !uploading && fileRef.current?.click()} className="group relative w-24 h-24 rounded-xl overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-400 shrink-0">
          {preview ? <img src={preview} alt="" className="w-full h-full object-cover" />
            : imageUid ? <EntityImage uid={imageUid} initial="?" className="w-full h-full" />
              : <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-gray-400"><ImagePlus className="w-6 h-6" /><span className="text-[10px]">{t('products.image')}</span></div>}
          {uploading && <div className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center gap-1 text-white"><Upload className="w-4 h-4 animate-pulse" /><span className="text-xs font-semibold">{progress}%</span></div>}
        </button>
        {(preview || imageUid) && !uploading && <button type="button" onClick={() => { setImageUid(null); setPreview(null); }} className="text-xs text-red-500 hover:underline">{t('common.delete')}</button>}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
      </div>

      <TranslatableInput label={t('common.name')} value={name} onChange={setName} />
      {!item && <Input label={`${t('common.code')} (${t('common.optional')})`} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder={genCode('')} />}

      <div className="grid grid-cols-2 gap-3">
        <CategoryPicker label={t('products.category')} value={category} onChange={(c) => setCategory(c)} />
        <MeasurePicker label={`${t('products.baseMeasure')} *`} value={measure} onChange={(m) => setMeasure(m)} />
      </div>

      {/* Barkodlar */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('products.barcodes')}</label>
        <div className="flex gap-2">
          <Input value={newBarcode} onChange={(e) => setNewBarcode(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addBarcode(); } }} placeholder={t('products.barcodePlaceholder')} />
          <Button type="button" variant="outline" onClick={addBarcode}>{t('common.add')}</Button>
        </div>
        {barcodes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {barcodes.map((bc) => (
              <span key={bc} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm font-mono text-gray-700 dark:text-gray-200">
                {bc}
                <button type="button" onClick={() => setBarcodes((l) => l.filter((b) => b !== bc))} className="text-gray-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" onClick={onCancel} disabled={saving}>{t('common.cancel')}</Button>
        <Button onClick={submit} loading={saving} disabled={uploading}>{t('common.save')}</Button>
      </div>
    </div>
  );
}

/** Standalone modal wrapper (products səhifəsi + çekdə barkod tapılmayanda). */
export function ItemFormModal({ item, initialBarcode, onClose, onSaved }: {
  item?: Item | null;
  initialBarcode?: string;
  onClose: () => void;
  onSaved: (i: Item) => void;
}) {
  const { t } = useLanguage();
  return (
    <Modal open onClose={onClose} title={item ? t('common.edit') : t('products.newProduct')} size="md">
      <ItemFormFields item={item} initialBarcode={initialBarcode} onSaved={onSaved} onCancel={onClose} />
    </Modal>
  );
}
