import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Ingredient } from '../../types';
import { IngredientChecklist } from './IngredientChecklist';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  ClipboardDocumentListIcon,
  XMarkIcon,
} from '../ui/AppIcons';

interface CookModeProps {
  title: string;
  steps: string[];
  ingredients: Ingredient[];
  checked: Set<number>;
  onToggleIngredient: (index: number) => void;
  scale?: number;
  initialStep?: number;
  onClose: () => void;
  onFinish?: () => void;
}

export function CookMode({
  title,
  steps,
  ingredients,
  checked,
  onToggleIngredient,
  scale = 1,
  initialStep = 0,
  onClose,
  onFinish,
}: CookModeProps) {
  const [step, setStep] = useState(() => Math.min(Math.max(initialStep, 0), steps.length - 1));
  const [showIngredients, setShowIngredients] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const isLast = step === steps.length - 1;

  useEffect(() => {
    dialogRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    let wakeLock: WakeLockSentinel | null = null;
    navigator.wakeLock
      ?.request('screen')
      .then(lock => {
        wakeLock = lock;
      })
      .catch(() => {
        // Screen may still dim; cook mode works without the lock.
      });

    return () => {
      document.body.style.overflow = previous;
      void wakeLock?.release();
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        setStep(current => Math.min(current + 1, steps.length - 1));
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setStep(current => Math.max(current - 1, 0));
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose, steps.length]);

  const handleNext = () => {
    if (isLast) {
      (onFinish ?? onClose)();
    } else {
      setStep(step + 1);
    }
  };

  return createPortal(
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={`Cook mode: ${title}`}
      className="fixed inset-0 z-[60] flex flex-col bg-[#173b2b] text-white animate-fade-in focus:outline-none"
    >
      <header className="flex items-center gap-3 px-4 pt-[calc(1rem+env(safe-area-inset-top))] sm:px-8 sm:pt-6">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#a7e3bf]">
            Step {step + 1} of {steps.length}
          </p>
          <p className="truncate text-sm text-white/70">{title}</p>
        </div>
        {ingredients.length > 0 && (
          <button
            type="button"
            onClick={() => setShowIngredients(value => !value)}
            aria-expanded={showIngredients}
            className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm font-medium transition hover:bg-white/15 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/25"
          >
            <ClipboardDocumentListIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Ingredients</span>
            <span className="tabular-nums text-white/60">
              {checked.size}/{ingredients.length}
            </span>
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Exit cook mode"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 transition hover:bg-white/15 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/25"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </header>

      <div className="flex gap-1 px-4 pt-4 sm:px-8" role="group" aria-label="Jump to step">
        {steps.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setStep(index)}
            aria-label={`Go to step ${index + 1}`}
            aria-current={index === step ? 'step' : undefined}
            className={`h-1.5 flex-1 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
              index <= step ? 'bg-[#a7e3bf]' : 'bg-white/15 hover:bg-white/25'
            }`}
          />
        ))}
      </div>

      <div className="relative flex min-h-0 flex-1">
        <div className="flex min-h-0 flex-1 items-center overflow-y-auto px-6 py-8 sm:px-12 lg:px-24">
          <p
            key={step}
            aria-live="polite"
            className="mx-auto max-w-3xl font-display text-[1.65rem] font-medium leading-[1.35] animate-slide-in-up sm:text-4xl sm:leading-[1.3] lg:text-[2.75rem]"
          >
            {steps[step]}
          </p>
        </div>

        {showIngredients && (
          <aside className="absolute inset-0 overflow-y-auto bg-[#173b2b] px-4 py-4 animate-fade-in sm:static sm:w-80 sm:border-l sm:border-white/10 sm:bg-transparent lg:w-96">
            <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/60">
              Ingredients
            </p>
            <IngredientChecklist
              ingredients={ingredients}
              checked={checked}
              onToggle={onToggleIngredient}
              scale={scale}
              tone="dark"
            />
          </aside>
        )}
      </div>

      <footer className="flex items-center gap-3 border-t border-white/10 px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-8">
        <button
          type="button"
          onClick={() => setStep(step - 1)}
          disabled={step === 0}
          aria-label="Previous step"
          className="inline-flex h-14 items-center gap-2 rounded-2xl bg-white/10 px-5 text-base font-semibold transition hover:bg-white/15 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/25 disabled:opacity-30"
        >
          <ArrowLeftIcon className="h-5 w-5" />
          <span className="hidden sm:inline">Back</span>
        </button>
        <p className="hidden flex-1 text-center text-xs text-white/40 sm:block">
          Use ← and → to move between steps
        </p>
        <button
          type="button"
          onClick={handleNext}
          className="ml-auto inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-6 text-base font-semibold text-[#173b2b] transition hover:bg-[#eaf6ef] focus:outline-none focus-visible:ring-4 focus-visible:ring-white/40 sm:flex-none"
        >
          {isLast ? (
            <>
              <CheckIcon className="h-5 w-5" />
              Done cooking
            </>
          ) : (
            <>
              Next step
              <ArrowRightIcon className="h-5 w-5" />
            </>
          )}
        </button>
      </footer>
    </div>,
    document.body
  );
}
