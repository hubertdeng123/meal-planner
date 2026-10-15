import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CheckCircleSolidIcon,
  PlusIcon,
  ShoppingBagIcon,
  TrashIcon,
} from '../components/ui/AppIcons';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { OverflowMenu } from '../components/ui/OverflowMenu';
import { SkeletonGrid } from '../components/ui/Skeletons';
import { NewListDialog, type NewListRequest } from '../components/grocery/NewListDialog';
import { useToast } from '../contexts/ToastContext';
import groceryService from '../services/grocery.service';
import mealPlanService from '../services/mealPlan.service';
import type { GroceryList } from '../types';
import { formatLocalDate } from '../utils/date';
import { groupByAisle } from '../utils/grocery';

const PAGE_SIZE = 12;

function listTitle(list: GroceryList): string {
  return (
    list.name ||
    `List from ${formatLocalDate(list.created_at, { weekday: 'short', month: 'short', day: 'numeric' })}`
  );
}

export default function GroceryListsPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [lists, setLists] = useState<GroceryList[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'more'>('loading');
  const [showNew, setShowNew] = useState(false);
  const [creating, setCreating] = useState(false);
  const [listToDelete, setListToDelete] = useState<GroceryList | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(
    async (targetPage: number) => {
      setStatus(targetPage === 1 ? 'loading' : 'more');
      try {
        const result = await groceryService.getGroceryListsPaginated({
          page: targetPage,
          pageSize: PAGE_SIZE,
          sort: 'created_at',
          order: 'desc',
        });
        setLists(current => (targetPage === 1 ? result.items : [...current, ...result.items]));
        setPage(targetPage);
        setTotalPages(result.total_pages);
        setStatus('ready');
      } catch (error) {
        console.error('Failed to load grocery lists:', error);
        if (targetPage === 1) setStatus('error');
        else {
          setStatus('ready');
          addToast('Could not load more lists.', 'error');
        }
      }
    },
    [addToast]
  );

  useEffect(() => {
    void load(1);
  }, [load]);

  const create = async (request: NewListRequest) => {
    setCreating(true);
    try {
      const list =
        request.source === 'plan'
          ? await mealPlanService.createGroceryList(request.planId)
          : request.source === 'recipes'
            ? await groceryService.createGroceryListFromRecipes(request.recipeIds)
            : await groceryService.createGroceryList({});
      navigate(`/grocery/${list.id}`);
    } catch (error) {
      console.error('Failed to create grocery list:', error);
      addToast('Could not build that list. Try again?', 'error');
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!listToDelete) return;
    setDeleting(true);
    try {
      await groceryService.deleteGroceryList(listToDelete.id);
      setLists(current => current.filter(list => list.id !== listToDelete.id));
      addToast('List deleted.', 'success');
      setListToDelete(null);
    } catch (error) {
      console.error('Failed to delete grocery list:', error);
      addToast('Could not delete that list. Try again?', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const active = lists.filter(
    list => list.items.length === 0 || list.items.some(item => !item.checked)
  );
  const done = lists.filter(
    list => list.items.length > 0 && list.items.every(item => item.checked)
  );

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Groceries</h1>
          <p className="page-subtitle">Shop by aisle. Check things off as they go in the cart.</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setShowNew(true)}>
          <PlusIcon className="h-4 w-4" />
          New list
        </button>
      </header>

      {status === 'loading' ? (
        <SkeletonGrid count={4} variant="card" testId="grocery-loading" />
      ) : status === 'error' ? (
        <ErrorState
          title="Couldn't load your lists"
          description="Check your connection and try again."
          onRetry={() => void load(1)}
        />
      ) : lists.length === 0 ? (
        <EmptyState
          icon={<ShoppingBagIcon className="h-10 w-10" />}
          title="No grocery lists yet"
          description="Build one from this week's plan or a few recipes, and it's sorted by aisle for you."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <button type="button" className="btn-primary" onClick={() => setShowNew(true)}>
                New list
              </button>
              <Link to="/meal-plans" className="btn-secondary">
                Go to meal plans
              </Link>
            </div>
          }
        />
      ) : (
        <div className="space-y-8 animate-fade-in">
          {active.length > 0 && (
            <section aria-labelledby="active-heading">
              <h2 id="active-heading" className="section-title mb-3">
                To shop
              </h2>
              <ListGrid lists={active} onDelete={setListToDelete} />
            </section>
          )}
          {done.length > 0 && (
            <section aria-labelledby="done-heading">
              <h2 id="done-heading" className="section-title mb-3">
                Done
              </h2>
              <ListGrid lists={done} onDelete={setListToDelete} />
            </section>
          )}
          {page < totalPages && (
            <div className="flex justify-center">
              <button
                type="button"
                className="btn-secondary"
                disabled={status === 'more'}
                onClick={() => void load(page + 1)}
              >
                {status === 'more' ? 'Loading…' : 'Show older lists'}
              </button>
            </div>
          )}
        </div>
      )}

      {showNew && (
        <NewListDialog
          creating={creating}
          onCreate={request => void create(request)}
          onClose={() => setShowNew(false)}
        />
      )}

      <ConfirmDialog
        isOpen={Boolean(listToDelete)}
        title="Delete this list?"
        description="The list and its items will be removed."
        confirmLabel="Delete list"
        tone="danger"
        loading={deleting}
        onCancel={() => {
          if (!deleting) setListToDelete(null);
        }}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function ListGrid({
  lists,
  onDelete,
}: {
  lists: GroceryList[];
  onDelete: (list: GroceryList) => void;
}) {
  return (
    <ul className="stagger grid gap-3 sm:grid-cols-2">
      {lists.map(list => {
        const total = list.items.length;
        const checked = list.items.filter(item => item.checked).length;
        const left = total - checked;
        const percent = total ? Math.round((checked / total) * 100) : 0;
        const aisles = groupByAisle(list.items.filter(item => !item.checked))
          .slice(0, 3)
          .map(group => group.aisle);
        const done = total > 0 && left === 0;
        return (
          <li
            key={list.id}
            className="relative rounded-2xl border border-stone-200 bg-white p-4 shadow-xs transition hover:shadow-md"
          >
            <Link
              to={`/grocery/${list.id}`}
              className="block rounded-lg pr-10 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-soft"
            >
              <span className="block truncate font-semibold text-stone-900">{listTitle(list)}</span>
              <span className="mt-0.5 flex items-center gap-1.5 text-sm text-stone-500">
                {done ? (
                  <>
                    <CheckCircleSolidIcon className="h-4 w-4 text-primary" />
                    All {total} items in the cart
                  </>
                ) : total === 0 ? (
                  'Empty list'
                ) : (
                  `${left} of ${total} left${aisles.length ? ` · ${aisles.join(', ')}` : ''}`
                )}
              </span>
              {total > 0 && (
                <span className="progress-track mt-4 block h-1.5" aria-hidden="true">
                  <span className="progress-bar block" style={{ width: `${percent}%` }} />
                </span>
              )}
            </Link>
            <div className="absolute right-2 top-2">
              <OverflowMenu
                label={`Actions for ${listTitle(list)}`}
                buttonClassName="icon-button-muted h-9 w-9"
                items={[
                  {
                    label: 'Delete list',
                    icon: TrashIcon,
                    tone: 'danger',
                    onSelect: () => onDelete(list),
                  },
                ]}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
