import { ChevronLeftIcon, ChevronRightIcon } from './AppIcons';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, totalPages, onPageChange, className = '' }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav
      className={`mt-10 flex items-center justify-between gap-3 border-t border-stone-200/80 pt-6 ${className}`}
      aria-label="Pagination"
    >
      <button
        className="btn-secondary btn-sm"
        disabled={page === 1}
        onClick={() => onPageChange(Math.max(1, page - 1))}
      >
        <ChevronLeftIcon className="h-4 w-4" />
        Previous
      </button>
      <span className="text-sm text-stone-500">
        Page <span className="font-semibold text-stone-900">{page}</span> of {totalPages}
      </span>
      <button
        className="btn-secondary btn-sm"
        disabled={page === totalPages}
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
      >
        Next
        <ChevronRightIcon className="h-4 w-4" />
      </button>
    </nav>
  );
}
