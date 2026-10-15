import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  CheckCircleSolidIcon,
  ChevronDownIcon,
  EnvelopeIcon,
  PlusIcon,
  TrashIcon,
} from '../components/ui/AppIcons';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { OverflowMenu } from '../components/ui/OverflowMenu';
import { EmailListDialog } from '../components/grocery/EmailListDialog';
import { GroceryRow } from '../components/grocery/GroceryRow';
import { useToast } from '../contexts/ToastContext';
import groceryService from '../services/grocery.service';
import notificationService from '../services/notification.service';
import type { APIError, GroceryItem, GroceryItemUpdate, GroceryList } from '../types';
import { formatLocalDate } from '../utils/date';
import { groupByAisle, parseQuickAdd } from '../utils/grocery';

type LoadState = 'loading' | 'ready' | 'not-found' | 'error';

function emailErrorMessage(error: unknown): string {
  const apiError = error as APIError;
  const status = apiError.response?.status;
  const detail = apiError.response?.data?.detail;
  if (status === 400) return detail || 'Check your notification settings and the addresses.';
  if (status === 503) return detail || 'Email is unavailable right now. Try again soon.';
  if (status === 500) return detail || 'Something went wrong sending that. Try again.';
  if (!apiError.response) return 'Network hiccup. Check your connection and try again.';
  return 'Could not send the grocery email.';
}

export default function GroceryListDetailPage() {
  const { id } = useParams<{ id: string }>();
  const listId = Number(id);
  const navigate = useNavigate();
  const { addToast } = useToast();
  const quickAddRef = useRef<HTMLInputElement>(null);

  const [list, setList] = useState<GroceryList | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resetting, setResetting] = useState(false);

  const load = useCallback(async () => {
    if (!Number.isFinite(listId)) {
      setLoadState('not-found');
      return;
    }
    setLoadState('loading');
    try {
      setList(await groceryService.getGroceryList(listId));
      setLoadState('ready');
    } catch (error) {
      console.error('Failed to load grocery list:', error);
      const status = (error as APIError).response?.status;
      setLoadState(status === 404 ? 'not-found' : 'error');
    }
  }, [listId]);

  useEffect(() => {
    void load();
  }, [load]);

  const patchItem = useCallback((itemId: number, next: GroceryItem | null) => {
    setList(current =>
      current
        ? {
            ...current,
            items: next
              ? current.items.map(item => (item.id === itemId ? next : item))
              : current.items.filter(item => item.id !== itemId),
          }
        : current
    );
  }, []);

  if (loadState === 'loading') return <GrocerySkeleton />;
  if (loadState === 'not-found') {
    return (
      <EmptyState
        title="We couldn't find that list"
        description="It may have been deleted."
        action={
          <Link to="/grocery" className="btn-primary">
            Back to groceries
          </Link>
        }
      />
    );
  }
  if (loadState === 'error' || !list) {
    return (
      <ErrorState
        title="Couldn't load this list"
        description="Check your connection and try again."
        onRetry={() => void load()}
      />
    );
  }

  const toBuy = list.items.filter(item => !item.checked);
  const inCart = list.items.filter(item => item.checked);
  const total = list.items.length;
  const percent = total ? Math.round((inCart.length / total) * 100) : 0;
  const complete = total > 0 && toBuy.length === 0;

  const toggle = async (item: GroceryItem) => {
    const optimistic = { ...item, checked: !item.checked };
    patchItem(item.id, optimistic);
    try {
      const saved = await groceryService.toggleGroceryItem(list.id, item.id, optimistic.checked);
      patchItem(item.id, saved);
    } catch (error) {
      console.error('Failed to toggle item:', error);
      patchItem(item.id, item);
      addToast(`Couldn't update ${item.name}.`, 'error');
    }
  };

  const save = async (item: GroceryItem, updates: GroceryItemUpdate) => {
    try {
      patchItem(item.id, await groceryService.updateGroceryItem(list.id, item.id, updates));
      return true;
    } catch (error) {
      console.error('Failed to update item:', error);
      addToast('Could not save that edit. Try again?', 'error');
      return false;
    }
  };

  const remove = async (item: GroceryItem) => {
    patchItem(item.id, null);
    try {
      await groceryService.deleteGroceryItem(list.id, item.id);
    } catch (error) {
      console.error('Failed to delete item:', error);
      setList(current => (current ? { ...current, items: [...current.items, item] } : current));
      addToast(`Couldn't remove ${item.name}.`, 'error');
    }
  };

  const quickAdd = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = parseQuickAdd(draft);
    if (!parsed) return;
    setAdding(true);
    try {
      const created = await groceryService.addGroceryItem(list.id, parsed);
      setList(current => (current ? { ...current, items: [...current.items, created] } : current));
      setDraft('');
    } catch (error) {
      console.error('Failed to add item:', error);
      addToast('Could not add that item. Try again?', 'error');
    } finally {
      setAdding(false);
      quickAddRef.current?.focus();
    }
  };

  const uncheckAll = async () => {
    if (inCart.length === 0) return;
    setResetting(true);
    try {
      const updated = await Promise.all(
        inCart.map(item => groceryService.updateGroceryItem(list.id, item.id, { checked: false }))
      );
      const byId = new Map(updated.map(item => [item.id, item]));
      setList(current =>
        current
          ? { ...current, items: current.items.map(item => byId.get(item.id) ?? item) }
          : current
      );
    } catch (error) {
      console.error('Failed to reset list:', error);
      addToast('Could not reset the list. Try again?', 'error');
      void load();
    } finally {
      setResetting(false);
    }
  };

  const sendEmail = async (extraEmails: string[]) => {
    setSending(true);
    try {
      const result = await notificationService.sendGroceryNotification(
        list.id,
        extraEmails.length ? extraEmails : undefined
      );
      setShowEmail(false);
      const failed = result.failed?.map(entry => entry.email) ?? [];
      addToast(
        failed.length ? `${result.detail} Couldn't reach ${failed.join(', ')}.` : result.detail,
        failed.length ? 'info' : 'success'
      );
    } catch (error) {
      console.error('Failed to send grocery email:', error);
      addToast(emailErrorMessage(error), 'error');
    } finally {
      setSending(false);
    }
  };

  const deleteList = async () => {
    setDeleting(true);
    try {
      await groceryService.deleteGroceryList(list.id);
      addToast('List deleted.', 'success');
      navigate('/grocery');
    } catch (error) {
      console.error('Failed to delete list:', error);
      addToast('Could not delete that list. Try again?', 'error');
      setDeleting(false);
    }
  };

  const title =
    list.name ||
    `List from ${formatLocalDate(list.created_at, { month: 'short', day: 'numeric' })}`;

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <div className="mb-3 flex items-center justify-between gap-2">
        <Link
          to="/grocery"
          className="inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-stone-500 transition hover:text-stone-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-soft"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Groceries
        </Link>
        <OverflowMenu
          label="List actions"
          items={[
            { label: 'Email this list', icon: EnvelopeIcon, onSelect: () => setShowEmail(true) },
            {
              label: 'Uncheck everything',
              icon: ArrowPathIcon,
              disabled: inCart.length === 0 || resetting,
              onSelect: () => void uncheckAll(),
            },
            {
              label: 'Delete list',
              icon: TrashIcon,
              tone: 'danger',
              onSelect: () => setConfirmDelete(true),
            },
          ]}
        />
      </div>

      <header>
        <h1 className="page-title">{title}</h1>
        {list.meal_plan_id && (
          <p className="mt-1 text-sm text-stone-500">
            From your{' '}
            <Link to={`/meal-plans/${list.meal_plan_id}`} className="link">
              meal plan
            </Link>
          </p>
        )}
      </header>

      <div className="sticky top-14 z-20 -mx-4 mt-4 bg-paper/95 px-4 pb-3 pt-3 backdrop-blur sm:mx-0 sm:rounded-b-2xl sm:px-0 lg:top-0">
        {total > 0 && (
          <div className="mb-3 flex items-center gap-3">
            <div
              className="progress-track flex-1"
              role="progressbar"
              aria-label="Shopping progress"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={inCart.length}
            >
              <div className="progress-bar" style={{ width: `${percent}%` }} />
            </div>
            <span className="text-sm font-semibold tabular-nums text-stone-700">
              {inCart.length}/{total}
            </span>
          </div>
        )}
        <form onSubmit={quickAdd} className="flex gap-2">
          <label htmlFor="quick-add" className="sr-only">
            Add an item
          </label>
          <input
            id="quick-add"
            ref={quickAddRef}
            className="input h-12 flex-1 text-base"
            placeholder="Add an item, e.g. 2 lb chicken"
            value={draft}
            onChange={event => setDraft(event.target.value)}
            enterKeyHint="enter"
            autoComplete="off"
            disabled={adding}
          />
          <button
            type="submit"
            className="btn-primary h-12 w-12 flex-shrink-0 p-0"
            disabled={adding || !draft.trim()}
            aria-label="Add item"
          >
            <PlusIcon className="h-5 w-5" />
          </button>
        </form>
      </div>

      {total === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-stone-300 px-6 py-10 text-center">
          <p className="font-medium text-stone-800">This list is empty</p>
          <p className="mt-1 text-sm text-stone-500">
            Add items above, or build a list from a meal plan.
          </p>
        </div>
      ) : complete ? (
        <section
          className="surface-warm mt-4 rounded-3xl p-6 text-center animate-scale-in"
          aria-live="polite"
        >
          <CheckCircleSolidIcon className="mx-auto h-10 w-10 text-primary" />
          <h2 className="mt-2 font-display text-xl font-semibold text-stone-900">
            Everything's in the cart
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            {total} item{total === 1 ? '' : 's'} done. Enjoy the cooking.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link to="/grocery" className="btn-primary btn-sm">
              Done shopping
            </Link>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="btn-secondary btn-sm"
            >
              Delete list
            </button>
          </div>
        </section>
      ) : (
        <div className="mt-2 space-y-5">
          {groupByAisle(toBuy).map(group => (
            <section key={group.aisle} aria-labelledby={`aisle-${group.aisle}`}>
              <h2
                id={`aisle-${group.aisle}`}
                className="mb-1 flex items-center justify-between px-2 text-xs font-semibold uppercase tracking-[0.12em] text-stone-500"
              >
                {group.aisle}
                <span className="tabular-nums text-stone-400">{group.items.length}</span>
              </h2>
              <ul className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white px-1 shadow-xs">
                {group.items.map(item => (
                  <GroceryRow
                    key={item.id}
                    item={item}
                    onToggle={toggle}
                    onSave={save}
                    onDelete={remove}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {inCart.length > 0 && (
        <section className="mt-6" aria-labelledby="cart-heading">
          <h2 id="cart-heading">
            <button
              type="button"
              onClick={() => setShowCart(value => !value)}
              aria-expanded={showCart}
              className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold text-stone-600 transition hover:bg-stone-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-soft"
            >
              <CheckCircleSolidIcon className="h-4 w-4 text-primary" />
              In the cart ({inCart.length})
              <ChevronDownIcon
                className={`ml-auto h-4 w-4 transition-transform ${showCart ? 'rotate-180' : ''}`}
              />
            </button>
          </h2>
          {showCart && (
            <ul className="mt-1 divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white/70 px-1 animate-fade-in">
              {[...inCart]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(item => (
                  <GroceryRow
                    key={item.id}
                    item={item}
                    onToggle={toggle}
                    onSave={save}
                    onDelete={remove}
                  />
                ))}
            </ul>
          )}
        </section>
      )}

      {showEmail && (
        <EmailListDialog
          sending={sending}
          onSend={emails => void sendEmail(emails)}
          onClose={() => setShowEmail(false)}
        />
      )}

      <ConfirmDialog
        isOpen={confirmDelete}
        title="Delete this list?"
        description="The list and its items will be removed. Recipes and meal plans are not affected."
        confirmLabel="Delete list"
        tone="danger"
        loading={deleting}
        onCancel={() => {
          if (!deleting) setConfirmDelete(false);
        }}
        onConfirm={deleteList}
      />
    </div>
  );
}

function GrocerySkeleton() {
  return (
    <div className="mx-auto max-w-2xl" role="status" aria-label="Loading list">
      <div className="skeleton mb-4 h-4 w-24" />
      <div className="skeleton h-8 w-56" />
      <div className="skeleton mt-6 h-2 w-full" />
      <div className="skeleton mt-3 h-12 w-full rounded-xl" />
      {[0, 1].map(section => (
        <div key={section} className="mt-6 space-y-2">
          <div className="skeleton h-3 w-20" />
          {Array.from({ length: 4 }, (_, row) => (
            <div key={row} className="skeleton h-14 w-full rounded-xl" />
          ))}
        </div>
      ))}
    </div>
  );
}
