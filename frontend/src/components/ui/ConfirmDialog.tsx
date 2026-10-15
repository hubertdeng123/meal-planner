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
      hideCloseButton
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
    >
      <div className="flex items-start gap-4 pt-3">
        <div
          className={`icon-tile ${tone === 'danger' ? 'bg-red-50 text-red-600' : 'icon-tile-amber'}`}
        >
          <ExclamationTriangleIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-stone-900">{title}</h3>
          <p className="mt-1 text-sm text-stone-600">{description}</p>
        </div>
      </div>
    </ModalShell>
  );
}
