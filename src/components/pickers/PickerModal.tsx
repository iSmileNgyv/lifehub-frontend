'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Search, Loader2, Plus, ArrowLeft } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { useLanguage } from '@/contexts/LanguageContext';
import { ApiError } from '@/lib/api';

export interface PickerPage<T> {
  data: T[];
  current_page: number;
  last_page: number;
}

interface PickerModalProps<T> {
  open: boolean;
  title: string;
  onClose: () => void;
  /** Səhifə-səhifə yüklə (axtarış + paginate). Non-paginate servislər üçün last_page=1 qaytarın. */
  fetchPage: (q: string, page: number) => Promise<PickerPage<T>>;
  keyOf: (item: T) => string;
  /** Bir elementi render et — `pick` ona klikləyəndə onu seçir. */
  renderItem: (item: T, pick: () => void) => React.ReactNode;
  onPick: (item: T) => void;
  layout?: 'grid' | 'list';
  searchPlaceholder?: string;
  emptyText?: string;
  /** "＋ Yeni" forması (icazə varsa). onCreated → element seçilir. */
  canCreate?: boolean;
  createLabel?: string;
  createTitle?: string;
  renderCreate?: (onCreated: (item: T) => void, onCancel: () => void) => React.ReactNode;
}

export default function PickerModal<T>({
  open, title, onClose, fetchPage, keyOf, renderItem, onPick,
  layout = 'list', searchPlaceholder, emptyText,
  canCreate, createLabel, createTitle, renderCreate,
}: PickerModalProps<T>) {
  const { t } = useLanguage();

  const fetchRef = useRef(fetchPage);
  fetchRef.current = fetchPage;

  const [mode, setMode] = useState<'list' | 'create'>('list');
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  // Açılanda sıfırla
  useEffect(() => {
    if (open) { setMode('list'); setQuery(''); setDebounced(''); setError(''); }
  }, [open]);

  const load = useCallback((p: number, q: string, append: boolean) => {
    const setBusy = append ? setLoadingMore : setLoading;
    setBusy(true);
    setError('');
    fetchRef.current(q, p)
      .then((r) => {
        setItems((prev) => (append ? [...prev, ...r.data] : r.data));
        setPage(r.current_page);
        setLastPage(r.last_page);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : t('common.error')))
      .finally(() => setBusy(false));
  }, [t]);

  useEffect(() => {
    const h = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(h);
  }, [query]);

  useEffect(() => {
    if (open && mode === 'list') load(1, debounced, false);
  }, [open, mode, debounced, load]);

  return (
    <Modal open={open} onClose={onClose} title={mode === 'create' ? (createTitle || title) : title} size="lg">
      {mode === 'create' && renderCreate ? (
        <div className="space-y-3">
          <button onClick={() => setMode('list')} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
            <ArrowLeft className="w-4 h-4" /> {t('common.back')}
          </button>
          {renderCreate((item) => onPick(item), () => setMode('list'))}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder || t('common.search')}
                autoFocus
                className="w-full h-10 pl-9 pr-4 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            {canCreate && renderCreate && (
              <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setMode('create')}>
                {createLabel || t('common.create')}
              </Button>
            )}
          </div>

          {error && <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600 dark:text-red-400">{error}</div>}

          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">{emptyText || t('common.noResults')}</div>
          ) : (
            <div className={layout === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[55vh] overflow-y-auto' : 'space-y-1.5 max-h-[55vh] overflow-y-auto'}>
              {items.map((it) => (
                <div key={keyOf(it)}>{renderItem(it, () => onPick(it))}</div>
              ))}
            </div>
          )}

          {page < lastPage && (
            <div className="flex justify-center pt-1">
              <Button variant="ghost" size="sm" loading={loadingMore} onClick={() => load(page + 1, debounced, true)}>
                {t('common.loadingMore')}
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
