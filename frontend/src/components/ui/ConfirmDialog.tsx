import { ExclamationTriangleIcon } from './AppIcons';

import { ModalShell } from './ModalShell';

type ConfirmTone = 'danger' | 'default';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <ModalShell
      size="sm"
      onClose={loading ? undefined : onCancel}
      title={
        <span className="inline-flex items-center gap-2">
          <ExclamationTriangleIcon
            className={`h-5 w-5 ${tone === 'danger' ? 'text-red-600' : 'text-amber-500'}`}
          />
          {title}
        </span>
      }
      description={description}
      footer={
        <>
          <button type="button" className="btn-secondary" disabled={loading} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={tone === 'danger' ? 'btn-danger' : 'btn-primary'}
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? 'Working...' : confirmLabel}
          </button>
        </>
      }
    />
  );
}
