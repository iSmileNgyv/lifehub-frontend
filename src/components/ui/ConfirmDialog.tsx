'use client';

import { AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import Modal from './Modal';
import Button from './Button';

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmText,
  cancelText,
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useLanguage();
  title = title ?? t('common.confirm');
  confirmText = confirmText ?? t('common.delete');
  cancelText = cancelText ?? t('common.cancel');
  return (
    <Modal
      open={open}
      onClose={loading ? () => {} : onCancel}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            {cancelText}
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        <div
          className={
            'flex items-center justify-center w-10 h-10 rounded-full shrink-0 ' +
            (variant === 'danger'
              ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400')
          }
        >
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="pt-1">
          <p className="font-semibold text-gray-900 dark:text-white mb-1">{title}</p>
          <div className="text-sm text-gray-500 dark:text-gray-400">{message}</div>
        </div>
      </div>
    </Modal>
  );
}
