import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArchiveBoxIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  PlusIcon,
  SparklesIcon,
  TrashIcon,
  XMarkIcon,
} from '../components/ui/AppIcons';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { ModalShell } from '../components/ui/ModalShell';
import { OverflowMenu } from '../components/ui/OverflowMenu';
import { SearchInput } from '../components/ui/SearchInput';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { SkeletonGrid } from '../components/ui/Skeletons';
import { useToast } from '../contexts/ToastContext';
import pantryService from '../services/pantry.service';
import type { PantryItem, PantryItemUpdate } from '../types';
import { addDaysIso, todayIso } from '../utils/date';
import { formatItemAmount, parseQuickAdd } from '../utils/grocery';
import { expiryLabel, expiryState, generateHref, type ExpiryState } from '../utils/pantry';

type PantryViewMode = 'use_soon' | 'recently_updated' | 'expiry_order';

const PAGE_SIZE = 24;

const VIEW_QUERY: Record<
  PantryViewMode,
  { sort: 'expires_at' | 'updated_at'; order: 'asc' | 'desc' }
> = {
  use_soon: { sort: 'expires_at', order: 'asc' },
  recently_updated: { sort: 'updated_at', order: 'desc' },
  expiry_order: { sort: 'expires_at', order: 'asc' },
};

const KEEPS_FOR = [
  { value: '', label: 'No date' },
  { value: '3', label: '3 days' },
  { value: '7', label: '1 week' },
  { value: '14', label: '2 weeks' },
  { value: '30', label: '1 month' },
  { value: '180', label: '6 months' },
];

const STATE_STYLES: Record<ExpiryState, { bar: string; text: string }> = {
  expired: { bar: 'bg-red-500', text: 'text-red-700' },
  soon: { bar: 'bg-amber-400', text: 'text-amber-700' },
  fresh: { bar: 'bg-primary', text: 'text-stone-500' },
  none: { bar: 'bg-stone-200', text: 'text-stone-400' },
};

export default function PantryPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [items, setItems] = useState<PantryItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<PantryViewMode>('recently_updated');
  const [draft, setDraft] = useState('');
  const [keepsFor, setKeepsFor] = useState('');
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [editing, setEditing] = useState<PantryItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<PantryItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const latestRequest = useRef(0);
  const loadedOnce = useRef(false);
  const quickAddRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(searchInput.trim()), 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(
    async (targetPage: number) => {
      const requestId = ++latestRequest.current;
      if (loadedOnce.current) setRefreshing(true);
      else setStatus('loading');
      const { sort, order } = VIEW_QUERY[viewMode];
      try {
        const data = await pantryService.getPantryItems({
          page: targetPage,
          pageSize: PAGE_SIZE,
          q: query || undefined,
          sort,
          order,
        });
        if (requestId !== latestRequest.current) return;
        setItems(current => (targetPage === 1 ? data.items : [...current, ...data.items]));
        setPage(targetPage);
        setTotalPages(data.total_pages);
        setStatus('ready');
        loadedOnce.current = true;
      } catch (error) {
        if (requestId !== latestRequest.current) return;
        console.error('Failed to load pantry items:', error);
        if (loadedOnce.current) addToast('Could not refresh the pantry.', 'error');
        else setStatus('error');
      } finally {
        if (requestId === latestRequest.current) setRefreshing(false);
      }
    },
    [addToast, query, viewMode]
  );

  useEffect(() => {
    void load(1);
  }, [load]);

  const visible = useMemo(
    () =>
      viewMode === 'use_soon'
        ? items.filter(item => ['expired', 'soon'].includes(expiryState(item)))
        : items,
    [items, viewMode]
  );
  const counts = useMemo(() => {
    let expired = 0;
    let soon = 0;
    for (const item of items) {
      const state = expiryState(item);
      if (state === 'expired') expired += 1;
      if (state === 'soon') soon += 1;
    }
    return { expired, soon };
  }, [items]);
  const selectedNames = items.filter(item => selected.has(item.id)).map(item => item.name);

  const toggleSelected = (itemId: number) =>
    setSelected(current => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });

  const quickAdd = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = parseQuickAdd(draft);
    if (!parsed) return;
    setAdding(true);
    try {
      const created = await pantryService.createPantryItem({
        ...parsed,
        expires_at: keepsFor ? addDaysIso(todayIso(), Number(keepsFor)) : undefined,
      });
      setDraft('');
      setItems(current => [created, ...current]);
    } catch (error) {
      console.error('Failed to add pantry item:', error);
      addToast('Could not add that item. Try again?', 'error');
    } finally {
      setAdding(false);
      quickAddRef.current?.focus();
    }
  };

  const saveEdit = async (item: PantryItem, updates: PantryItemUpdate) => {
    try {
      const saved = await pantryService.updatePantryItem(item.id, updates);
      setItems(current => current.map(entry => (entry.id === item.id ? saved : entry)));
      setEditing(null);
    } catch (error) {
      console.error('Failed to update pantry item:', error);
      addToast('Could not save that change. Try again?', 'error');
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setDeleting(true);
    try {
      await pantryService.deletePantryItem(itemToDelete.id);
      setItems(current => current.filter(item => item.id !== itemToDelete.id));
      setSelected(current => {
        const next = new Set(current);
        next.delete(itemToDelete.id);
        return next;
      });
      addToast(`Removed ${itemToDelete.name}.`, 'success');
      setItemToDelete(null);
    } catch (error) {
      console.error('Failed to delete pantry item:', error);
      addToast('Could not remove that item. Try again?', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const atRisk = counts.expired + counts.soon;

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-5">
        <h1 className="page-title">Pantry</h1>
        <p className="page-subtitle">What you have on hand. Recipes and plans use these first.</p>
      </header>

      <form
        onSubmit={quickAdd}
        className="card flex flex-col gap-2 p-3 sm:flex-row sm:items-center"
      >
        <label htmlFor="pantry-quick-add" className="sr-only">
          Add to pantry
        </label>
        <input
          id="pantry-quick-add"
          ref={quickAddRef}
          className="input h-11 flex-1"
          placeholder="Add to pantry, e.g. 2 cans chickpeas"
          value={draft}
          onChange={event => setDraft(event.target.value)}
          disabled={adding}
          autoComplete="off"
        />
        <div className="flex gap-2">
          <label htmlFor="pantry-keeps-for" className="sr-only">
            Keeps for
          </label>
          <select
            id="pantry-keeps-for"
            className="input h-11 w-auto flex-1 sm:flex-none"
            value={keepsFor}
            onChange={event => setKeepsFor(event.target.value)}
          >
            {KEEPS_FOR.map(option => (
              <option key={option.value} value={option.value}>
                {option.value ? `Keeps ${option.label}` : option.label}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-primary h-11" disabled={adding || !draft.trim()}>
            <PlusIcon className="h-4 w-4" />
            Add
          </button>
        </div>
      </form>

      {atRisk > 0 && viewMode !== 'use_soon' && (
        <div className="surface-warm mt-4 flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-amber-600" />
          <p className="flex-1 text-sm text-stone-700">
            {counts.expired > 0 && (
              <span className="font-semibold text-red-700">{counts.expired} expired</span>
            )}
            {counts.expired > 0 && counts.soon > 0 && ' · '}
            {counts.soon > 0 && (
              <span className="font-semibold text-amber-700">
                {counts.soon} to use in the next 3 days
              </span>
            )}
          </p>
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => setViewMode('use_soon')}
          >
            Show them
          </button>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SegmentedControl
          label="Sort pantry"
          value={viewMode}
          onChange={setViewMode}
          className="overflow-x-auto"
          options={[
            { value: 'use_soon', label: 'Use soon' },
            { value: 'recently_updated', label: 'Recently updated' },
            { value: 'expiry_order', label: 'Expiry order' },
          ]}
        />
        <SearchInput
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Search pantry"
          className="sm:ml-auto sm:max-w-xs"
        />
        {refreshing && <span className="sr-only">Updating pantry</span>}
      </div>

      <div className="mt-5">
        {status === 'loading' ? (
          <SkeletonGrid count={6} variant="card" testId="pantry-loading" />
        ) : status === 'error' ? (
          <ErrorState
            title="Couldn't load your pantry"
            description="Check your connection and try again."
            onRetry={() => void load(1)}
          />
        ) : visible.length === 0 ? (
          query ? (
            <EmptyState
              variant="compact"
              title="Nothing matches"
              description={`No pantry items called "${query}".`}
              action={
                <button type="button" className="btn-secondary" onClick={() => setSearchInput('')}>
                  Clear search
                </button>
              }
            />
          ) : viewMode === 'use_soon' && items.length > 0 ? (
            <EmptyState
              variant="compact"
              title="Nothing to rush"
              description="No items expire in the next 3 days."
            />
          ) : (
            <EmptyState
              icon={<ArchiveBoxIcon className="h-10 w-10" />}
              title="Your pantry is empty"
              description="Add what you have on hand and we'll cook with it first."
              action={
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => quickAddRef.current?.focus()}
                >
                  Add your first item
                </button>
              }
            />
          )
        ) : (
          <ul
            className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ${refreshing ? 'opacity-60' : ''}`}
          >
            {visible.map(item => {
              const state = expiryState(item);
              const styles = STATE_STYLES[state];
              const amount = formatItemAmount(item);
              const isSelected = selected.has(item.id);
              return (
                <li
                  key={item.id}
                  className={`card relative overflow-hidden p-4 pl-5 transition ${
                    isSelected ? 'ring-2 ring-primary' : ''
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`absolute inset-y-0 left-0 w-1.5 ${styles.bar}`}
                  />
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={isSelected}
                      aria-label={`Select ${item.name}`}
                      onClick={() => toggleSelected(item.id)}
                      className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border-[1.5px] transition focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-soft ${
                        isSelected
                          ? 'border-primary bg-primary text-white'
                          : 'border-stone-300 bg-white'
                      }`}
                    >
                      {isSelected && <CheckIcon className="h-4 w-4" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-base font-semibold text-stone-900">
                        {item.name}
                      </h2>
                      <p className="mt-0.5 text-sm text-stone-500">
                        {[amount, item.category].filter(Boolean).join(' · ') || 'No amount'}
                      </p>
                      <p className={`mt-2 text-sm font-medium ${styles.text}`}>
                        {expiryLabel(item)}
                      </p>
                    </div>
                    <OverflowMenu
                      label={`Actions for ${item.name}`}
                      buttonClassName="icon-button-muted -mr-1 -mt-1 h-9 w-9"
                      items={[
                        { label: 'Edit', icon: PencilIcon, onSelect: () => setEditing(item) },
                        {
                          label: 'Remove',
                          icon: TrashIcon,
                          tone: 'danger',
                          onSelect: () => setItemToDelete(item),
                        },
                      ]}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn-ghost btn-sm mt-3 -ml-2"
                    onClick={() => navigate(generateHref([item.name]))}
                  >
                    <SparklesIcon className="h-4 w-4" />
                    Use in recipe
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {page < totalPages && status === 'ready' && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            className="btn-secondary"
            disabled={refreshing}
            onClick={() => void load(page + 1)}
          >
            {refreshing ? 'Loading…' : 'Show more'}
          </button>
        </div>
      )}

      {selectedNames.length > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 flex justify-center px-4 animate-slide-in-up lg:bottom-6 lg:pl-[var(--sidebar-width)]">
          <div
            role="region"
            aria-label="Selected pantry items"
            className="flex w-full max-w-md items-center gap-2 rounded-2xl bg-stone-900 p-2 pl-4 text-white shadow-xl"
          >
            <span className="flex-1 text-sm font-medium">{selectedNames.length} selected</span>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              aria-label="Clear selection"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-white/70 hover:bg-white/10 hover:text-white"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => navigate(generateHref(selectedNames))}
              className="btn-accent"
            >
              <SparklesIcon className="h-4 w-4" />
              Cook with {selectedNames.length === 1 ? 'this' : 'these'}
            </button>
          </div>
        </div>
      )}

      {editing && (
        <EditPantryItemDialog
          item={editing}
          onClose={() => setEditing(null)}
          onSave={updates => saveEdit(editing, updates)}
        />
      )}

      <ConfirmDialog
        isOpen={Boolean(itemToDelete)}
        title="Remove from pantry?"
        description={itemToDelete ? `${itemToDelete.name} will be removed from your pantry.` : ''}
        confirmLabel="Remove"
        tone="danger"
        loading={deleting}
        onCancel={() => {
          if (!deleting) setItemToDelete(null);
        }}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function EditPantryItemDialog({
  item,
  onSave,
  onClose,
}: {
  item: PantryItem;
  onSave: (updates: PantryItemUpdate) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(item.quantity ? String(item.quantity) : '');
  const [unit, setUnit] = useState(item.unit ?? '');
  const [category, setCategory] = useState(item.category ?? '');
  const [expires, setExpires] = useState(item.expires_at?.slice(0, 10) ?? '');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const parsed = Number(quantity);
    await onSave({
      name: name.trim(),
      quantity: quantity.trim() && Number.isFinite(parsed) && parsed > 0 ? parsed : undefined,
      unit: unit.trim() || undefined,
      category: category.trim() || undefined,
      expires_at: expires || undefined,
    });
    setSaving(false);
  };

  return (
    <ModalShell
      size="sm"
      title={`Edit ${item.name}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="pantry-edit-form"
            className="btn-primary"
            disabled={saving || !name.trim()}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <form
        id="pantry-edit-form"
        className="space-y-4"
        onSubmit={event => {
          event.preventDefault();
          void submit();
        }}
      >
        <div>
          <label htmlFor="pantry-edit-name" className="label">
            Name
          </label>
          <input
            id="pantry-edit-name"
            className="input"
            value={name}
            onChange={event => setName(event.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="pantry-edit-qty" className="label">
              Quantity
            </label>
            <input
              id="pantry-edit-qty"
              className="input"
              inputMode="decimal"
              value={quantity}
              onChange={event => setQuantity(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="pantry-edit-unit" className="label">
              Unit
            </label>
            <input
              id="pantry-edit-unit"
              className="input"
              value={unit}
              onChange={event => setUnit(event.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="pantry-edit-category" className="label">
              Category
            </label>
            <input
              id="pantry-edit-category"
              className="input"
              value={category}
              onChange={event => setCategory(event.target.value)}
              placeholder="Produce"
            />
          </div>
          <div>
            <label htmlFor="pantry-edit-expires" className="label">
              Expires
            </label>
            <input
              id="pantry-edit-expires"
              type="date"
              className="input"
              value={expires}
              onChange={event => setExpires(event.target.value)}
            />
          </div>
        </div>
      </form>
    </ModalShell>
  );
}
