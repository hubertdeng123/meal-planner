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
        <span className="inline-flex items-center gap-2.5">
          <span
            className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
              tone === 'danger' ? 'bg-[#FEE2E2] text-[#B91C1C]' : 'bg-[#FEF3C7] text-[#B45309]'
            }`}
          >
            <ExclamationTriangleIcon
              className={`h-4 w-4 ${tone === 'danger' ? 'text-[#B91C1C]' : 'text-[#B45309]'}`}
            />
          </span>
          <span>{title}</span>
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
