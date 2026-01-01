interface LoadingModalProps {
  isOpen: boolean;
  message?: string;
}

export function LoadingModal({ isOpen, message = 'Generating your recipe...' }: LoadingModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="rounded-3xl border border-orange-200/70 bg-white p-8 shadow-2xl">
        <div className="flex flex-col items-center gap-4">
          {/* Spinner */}
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-200 border-t-orange-600" />

          {/* Message */}
          <p className="text-lg font-semibold text-orange-950">{message}</p>
        </div>
      </div>
    </div>
  );
}
