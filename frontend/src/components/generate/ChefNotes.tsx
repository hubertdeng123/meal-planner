import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDownIcon, LightBulbIcon } from '../ui/AppIcons';

interface ChefNotesProps {
  text: string;
  live: boolean;
  defaultOpen?: boolean;
}

export function ChefNotes({ text, live, defaultOpen = true }: ChefNotesProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const pinnedToBottom = useRef(true);

  useEffect(() => {
    const node = scrollRef.current;
    if (node && pinnedToBottom.current) {
      node.scrollTop = node.scrollHeight;
    }
  }, [text, open]);

  const handleScroll = () => {
    const node = scrollRef.current;
    if (!node) return;
    pinnedToBottom.current = node.scrollHeight - node.scrollTop - node.clientHeight < 24;
  };

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <section className="surface-warm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-3 px-4 py-3 text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-soft"
      >
        <span className="icon-tile icon-tile-sm icon-tile-accent">
          <LightBulbIcon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-stone-900">Chef&apos;s notes</span>
          <span className="block text-xs text-stone-500">
            {words === 0
              ? live
                ? 'Waiting for the first thoughts…'
                : 'No notes for this recipe'
              : `${words} words of reasoning${live ? ' so far' : ''}`}
          </span>
        </span>
        <ChevronDownIcon
          className={`h-4 w-4 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div
          id={panelId}
          ref={scrollRef}
          onScroll={handleScroll}
          className="max-h-36 overflow-y-auto sm:max-h-72 border-t border-[rgba(226,87,47,0.12)] px-4 py-3 lg:max-h-[22rem]"
        >
          {text ? (
            <p className="whitespace-pre-wrap font-display text-[15px] italic leading-relaxed text-stone-700">
              {text}
              {live && (
                <span
                  aria-hidden="true"
                  className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 bg-accent animate-cursor"
                />
              )}
            </p>
          ) : (
            <div className="flex items-center gap-1.5 py-2" aria-label="Thinking">
              {[0, 1, 2].map(dot => (
                <span
                  key={dot}
                  className="h-1.5 w-1.5 rounded-full bg-accent animate-thinking-dot"
                  style={{ animationDelay: `${dot * 160}ms` }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
