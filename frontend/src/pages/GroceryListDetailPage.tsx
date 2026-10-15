import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ShoppingCartIcon,
  PlusIcon,
  TrashIcon,
  CheckIcon,
  PencilIcon,
  XMarkIcon,
  ArrowLeftIcon,
  EnvelopeIcon,
  ChevronDownIcon,
  ArchiveBoxIcon,
  CalendarIcon,
  CheckCircleIcon,
  PantryIcon,
} from '../components/ui/AppIcons';
import groceryService from '../services/grocery.service';
import notificationService from '../services/notification.service';
import type {
  GroceryList,
  GroceryItem,
  GroceryItemCreate,
  GroceryItemUpdate,
  APIError,
} from '../types';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { InlineStatus } from '../components/ui/InlineStatus';
import { ModalShell } from '../components/ui/ModalShell';
import { SectionCard } from '../components/ui/SectionCard';
import { KitchenSubNav } from '../components/ui/KitchenSubNav';
import { useToast } from '../contexts/ToastContext';
import { formatLocalDate } from '../utils/date';

interface GroupedItems {
  [category: string]: GroceryItem[];
}

const CATEGORY_ORDER = ['Produce', 'Meat & Seafood', 'Dairy', 'Pantry', 'Other'] as const;

function sortCategoryNames(a: string, b: string) {
  const aIndex = CATEGORY_ORDER.indexOf(a as (typeof CATEGORY_ORDER)[number]);
  const bIndex = CATEGORY_ORDER.indexOf(b as (typeof CATEGORY_ORDER)[number]);
  const aRank = aIndex === -1 ? CATEGORY_ORDER.length : aIndex;
  const bRank = bIndex === -1 ? CATEGORY_ORDER.length : bIndex;
  if (aRank !== bRank) return aRank - bRank;
  return a.localeCompare(b);
}

export default function GroceryListDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [groceryList, setGroceryList] = useState<GroceryList | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<GroceryItem | null>(null);
  const [sendingNotification, setSendingNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [additionalEmails, setAdditionalEmails] = useState<string[]>(['']);
  const [emailErrors, setEmailErrors] = useState<string[]>([]);
  const [newItem, setNewItem] = useState<GroceryItemCreate>({
    name: '',
    quantity: undefined,
    unit: '',
    category: 'Other',
  });
  const [showSendDropdown, setShowSendDropdown] = useState(false);
  const [hideChecked, setHideChecked] = useState(false);
  const [selectedAisle, setSelectedAisle] = useState<string>('all');
  const [recentlyChecked, setRecentlyChecked] = useState<Set<number>>(new Set());
  const [itemToDelete, setItemToDelete] = useState<GroceryItem | null>(null);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const loadGroceryList = useCallback(async () => {
    if (!id) return;

    try {
      const data = await groceryService.getGroceryList(parseInt(id));
      setGroceryList(data);
    } catch (error) {
      console.error('Failed to load grocery list:', error);
      navigate('/grocery');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    if (id) {
      loadGroceryList();
    }
  }, [id, loadGroceryList]);

  const handleToggleItem = async (item: GroceryItem) => {
    if (!groceryList) return;

    const isChecking = !item.checked;

    try {
      const updatedItem = await groceryService.toggleGroceryItem(
        groceryList.id,
        item.id,
        !item.checked
      );

      if (isChecking) {
        setRecentlyChecked(prev => new Set(prev).add(item.id));
        setTimeout(() => {
          setRecentlyChecked(prev => {
            const next = new Set(prev);
            next.delete(item.id);
            return next;
          });
        }, 500);
      }

      setGroceryList({
        ...groceryList,
        items: groceryList.items.map(i => (i.id === item.id ? updatedItem : i)),
      });
    } catch (error) {
      console.error('Failed to toggle item:', error);
    }
  };

  const handleAddItem = async () => {
    if (!groceryList || !newItem.name.trim()) return;

    try {
      const addedItem = await groceryService.addGroceryItem(groceryList.id, newItem);
      setGroceryList({
        ...groceryList,
        items: [...groceryList.items, addedItem],
      });
      setNewItem({ name: '', quantity: undefined, unit: '', category: 'Other' });
      setShowAddModal(false);
    } catch (error) {
      console.error('Failed to add item:', error);
      addToast('Could not add that item. Try again?', 'error');
    }
  };

  const handleUpdateItem = async (item: GroceryItem, updates: GroceryItemUpdate) => {
    if (!groceryList) return;

    try {
      const updatedItem = await groceryService.updateGroceryItem(groceryList.id, item.id, updates);

      setGroceryList({
        ...groceryList,
        items: groceryList.items.map(i => (i.id === item.id ? updatedItem : i)),
      });
      setEditingItem(null);
    } catch (error) {
      console.error('Failed to update item:', error);
      addToast('Could not save that edit. Try again?', 'error');
    }
  };

  const handleDeleteItem = async () => {
    if (!groceryList || !itemToDelete) return;

    try {
      await groceryService.deleteGroceryItem(groceryList.id, itemToDelete.id);
      setGroceryList({
        ...groceryList,
        items: groceryList.items.filter(i => i.id !== itemToDelete.id),
      });
      setItemToDelete(null);
    } catch (error) {
      console.error('Failed to delete item:', error);
      addToast('Could not delete that item. Try again?', 'error');
    }
  };

  const handleArchiveList = async () => {
    if (!groceryList) return;
    setArchiving(true);
    try {
      await groceryService.deleteGroceryList(groceryList.id);
      addToast('Grocery list archived.', 'success');
      navigate('/grocery');
    } catch (error) {
      console.error('Failed to archive list:', error);
      addToast('Could not archive that list. Try again?', 'error');
    } finally {
      setArchiving(false);
    }
  };

  const handleSendNotification = async (emails: string[] = []) => {
    if (!groceryList) return;

    setSendingNotification(true);
    setNotificationMessage(null);

    try {
      const validEmails = emails.filter(email => email.trim() !== '');
      const result = await notificationService.sendGroceryNotification(
        groceryList.id,
        validEmails.length > 0 ? validEmails : undefined
      );

      let successMessage = result.detail;

      if (result.failed && result.failed.length > 0) {
        const failedEmails = result.failed.map(f => f.email).join(', ');
        successMessage += ` (Failed to send to: ${failedEmails})`;
      }

      setNotificationMessage({
        type: 'success',
        text: successMessage,
      });

      setTimeout(() => {
        setNotificationMessage(null);
      }, 5000);
    } catch (error: unknown) {
      console.error('Failed to send notification:', error);

      let errorMessage = 'Could not send the grocery email.';
      const apiError = error as APIError;

      if (apiError.response?.status === 400) {
        errorMessage =
          apiError.response?.data?.detail ||
          'Double-check notification settings and the email address.';
      } else if (apiError.response?.status === 503) {
        errorMessage =
          apiError.response?.data?.detail || 'Email service is taking a break. Try again soon.';
      } else if (apiError.response?.status === 500) {
        errorMessage = apiError.response?.data?.detail || 'Something went sideways. Try again.';
      } else if (('code' in apiError && apiError.code === 'NETWORK_ERROR') || !apiError.response) {
        errorMessage = 'Network hiccup. Check your connection and try again.';
      }

      setNotificationMessage({
        type: 'error',
        text: errorMessage,
      });

      setTimeout(() => {
        setNotificationMessage(null);
      }, 5000);
    } finally {
      setSendingNotification(false);
    }
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (index: number, value: string) => {
    const newEmails = [...additionalEmails];
    newEmails[index] = value;
    setAdditionalEmails(newEmails);

    const newErrors = [...emailErrors];
    newErrors[index] = '';
    setEmailErrors(newErrors);
  };

  const addEmailField = () => {
    setAdditionalEmails([...additionalEmails, '']);
    setEmailErrors([...emailErrors, '']);
  };

  const removeEmailField = (index: number) => {
    const newEmails = additionalEmails.filter((_, i) => i !== index);
    const newErrors = emailErrors.filter((_, i) => i !== index);
    setAdditionalEmails(newEmails);
    setEmailErrors(newErrors);
  };

  const handleSendWithEmails = () => {
    const newErrors = additionalEmails.map(email => {
      if (email.trim() === '') return '';
      if (!validateEmail(email.trim())) return 'Invalid email address';
      return '';
    });

    setEmailErrors(newErrors);

    const hasErrors = newErrors.some(error => error !== '');
    if (hasErrors) return;

    const validEmails = additionalEmails.filter(email => email.trim() !== '');
    handleSendNotification(validEmails);
    setShowNotificationModal(false);

    setAdditionalEmails(['']);
    setEmailErrors([]);
  };

  const applyBulkCheckState = async (
    items: GroceryItem[],
    checked: boolean,
    successMessage: string
  ) => {
    if (!groceryList || items.length === 0) return;

    setBulkUpdating(true);
    try {
      const updatedItems = await Promise.all(
        items.map(item => groceryService.updateGroceryItem(groceryList.id, item.id, { checked }))
      );

      const updatedById = new Map(updatedItems.map(item => [item.id, item]));
      setGroceryList({
        ...groceryList,
        items: groceryList.items.map(item => updatedById.get(item.id) || item),
      });
      addToast(successMessage, 'success');
    } catch (error) {
      console.error('Failed bulk grocery update:', error);
      addToast('Could not update those items. Try again?', 'error');
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleUncheckAll = async () => {
    if (!groceryList) return;
    const checkedItems = groceryList.items.filter(item => item.checked);
    if (checkedItems.length === 0) {
      addToast('There are no checked items to reset.', 'info');
      return;
    }
    await applyBulkCheckState(
      checkedItems,
      false,
      `Unchecked ${checkedItems.length} item${checkedItems.length === 1 ? '' : 's'}.`
    );
  };

  const groupItemsByCategory = (items: GroceryItem[]): GroupedItems => {
    return items.reduce((groups, item) => {
      const category = item.category || 'Other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
      return groups;
    }, {} as GroupedItems);
  };

  const getCompletionPercentage = () => {
    if (!groceryList || groceryList.items.length === 0) return 0;
    return Math.round(
      (groceryList.items.filter(item => item.checked).length / groceryList.items.length) * 100
    );
  };

  const groupedItems = useMemo(
    () => (groceryList ? groupItemsByCategory(groceryList.items) : {}),
    [groceryList]
  );
  const allCategories = useMemo(
    () => Object.keys(groupedItems).sort(sortCategoryNames),
    [groupedItems]
  );
  const checkedCount = groceryList ? groceryList.items.filter(item => item.checked).length : 0;
  const totalItems = groceryList ? groceryList.items.length : 0;
  const completionPercentage = getCompletionPercentage();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2"
          style={{ borderBottomColor: 'var(--primary)' }}
        />
      </div>
    );
  }

  if (!groceryList) {
    return (
      <div className="text-center py-12">
        <p className="text-[#78716C]">We couldn't find that list.</p>
      </div>
    );
  }

  const filteredGroupedItems = hideChecked
    ? Object.fromEntries(
        Object.entries(groupedItems).map(([category, items]) => [
          category,
          items.filter(item => !item.checked),
        ])
      )
    : groupedItems;

  const activeAisle =
    selectedAisle !== 'all' && allCategories.includes(selectedAisle) ? selectedAisle : 'all';

  const categories = Object.keys(filteredGroupedItems)
    .filter(category => filteredGroupedItems[category].length > 0)
    .filter(category => activeAisle === 'all' || category === activeAisle)
    .sort(sortCategoryNames);

  return (
    <div>
      <KitchenSubNav
        actions={
          <Link to="/grocery" className="btn-ghost text-xs">
            <ArrowLeftIcon className="h-3.5 w-3.5" />
            <span>All Grocery Lists</span>
          </Link>
        }
      />

      {/* Notification Message */}
      {notificationMessage && (
        <div
          className={`mb-4 rounded-2xl p-4 border ${
            notificationMessage.type === 'success'
              ? 'bg-[#ECF5F0] border-[#3F624D]/25 text-[#2F6F4E]'
              : 'bg-[#FEE2E2] border-[#B91C1C]/25 text-[#991B1B]'
          }`}
        >
          <p className="text-sm font-medium">{notificationMessage.text}</p>
        </div>
      )}

      {/* Responsive Mobile-First Header */}
      <div className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-5">
          <div className="flex items-start gap-3.5 min-w-0">
            <button
              onClick={() => navigate('/grocery')}
              className="icon-button-outline shrink-0 mt-0.5"
              title="Back to grocery lists"
              aria-label="Back to grocery lists"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div className="icon-container-premium icon-container-emerald shrink-0 hidden sm:flex">
              <ShoppingCartIcon className="h-6 w-6 text-[#2F6F4E]" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#1C1917] tracking-tight break-words">
                  {groceryList.name || 'Grocery list'}
                </h1>
                {groceryList.meal_plan_id && (
                  <Link
                    to={`/meal-plans/${groceryList.meal_plan_id}`}
                    className="inline-flex items-center gap-1 rounded-full border border-[#C84B31]/25 bg-[#F9F1EA] px-2.5 py-0.5 text-xs font-semibold text-[#9A3412] hover:bg-[#F3E5D8]"
                  >
                    <CalendarIcon className="h-3 w-3" />
                    <span>Plan #{groceryList.meal_plan_id}</span>
                  </Link>
                )}
              </div>
              <p className="mt-1 text-sm text-[#78716C]">
                Created {formatLocalDate(groceryList.created_at)} •{' '}
                <span className="tabular-nums">{totalItems} items</span> across{' '}
                <span className="tabular-nums">{allCategories.length} aisles</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:shrink-0">
            {/* Email Split Button */}
            <div className="relative">
              <div className="inline-flex">
                <button
                  onClick={() => handleSendNotification()}
                  disabled={sendingNotification}
                  className="inline-flex items-center rounded-l-full border border-[#D6CEC2] bg-white px-4 py-2.5 text-sm font-semibold text-[#1C1917] shadow-2xs transition-colors hover:bg-[#FAF7F2] disabled:opacity-50"
                >
                  {sendingNotification ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#57534E] mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <EnvelopeIcon className="h-4 w-4 mr-2 text-[#57534E]" />
                      Email me
                    </>
                  )}
                </button>

                <button
                  onClick={() => setShowSendDropdown(!showSendDropdown)}
                  disabled={sendingNotification}
                  className="inline-flex items-center rounded-r-full border border-l-0 border-[#D6CEC2] bg-white px-2.5 py-2.5 text-[#57534E] shadow-2xs transition-colors hover:bg-[#FAF7F2] hover:text-[#1C1917]"
                  title="More sending options"
                  aria-label="More sending options"
                  aria-expanded={showSendDropdown}
                >
                  <ChevronDownIcon
                    className={`h-4 w-4 transition-transform duration-200 ${
                      showSendDropdown ? 'rotate-180' : ''
                    }`}
                  />
                </button>
              </div>

              {showSendDropdown && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-[#E7E0D6] bg-white shadow-lg z-30">
                  <div className="py-2">
                    <button
                      onClick={() => {
                        setShowSendDropdown(false);
                        setShowNotificationModal(true);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm font-medium text-[#1C1917] hover:bg-[#FAF7F2] flex items-center"
                    >
                      <PlusIcon className="h-4 w-4 mr-2.5 text-[#78716C]" />
                      Send to extra people
                    </button>
                    <div className="border-t border-[#E7E0D6] my-1" />
                    <div className="px-4 py-2 text-xs text-[#78716C]">
                      "Email me" sends this checklist to your account email address.
                    </div>
                  </div>
                </div>
              )}

              {showSendDropdown && (
                <div className="fixed inset-0 z-20" onClick={() => setShowSendDropdown(false)} />
              )}
            </div>

            <button onClick={() => setShowAddModal(true)} className="btn-primary">
              <PlusIcon className="h-4 w-4" />
              <span>Add item</span>
            </button>
          </div>
        </div>

        {/* Shopping Progress & Aisle Quick-Filter Bar */}
        <div
          className={`surface p-4 sm:p-5 transition-all duration-300 sticky top-20 z-20 ${
            completionPercentage === 100 && totalItems > 0
              ? 'border-[#3F624D]/40 bg-[#ECF5F0]/90 backdrop-blur-md'
              : 'bg-white/95 backdrop-blur-md'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-semibold text-[#1C1917]">Shopping Progress</span>
              {completionPercentage === 100 && totalItems > 0 ? (
                <InlineStatus label="All done" tone="success" />
              ) : (
                <InlineStatus label={`${completionPercentage}% done`} tone="neutral" />
              )}
            </div>
            <span className="text-sm font-medium text-[#57534E] tabular-nums">
              {checkedCount} of {totalItems} checked
            </span>
          </div>

          <div className="relative w-full bg-[#E7E0D6] rounded-full h-2.5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out bg-[#2F6F4E]"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Aisle Quick-Filter Pills */}
            {allCategories.length > 0 ? (
              <div
                role="group"
                aria-label="Filter by store aisle"
                className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0"
              >
                <button
                  type="button"
                  onClick={() => setSelectedAisle('all')}
                  aria-pressed={activeAisle === 'all'}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors tabular-nums ${
                    activeAisle === 'all'
                      ? 'border-[#1C1917] bg-[#1C1917] text-white'
                      : 'border-[#E7E0D6] bg-[#FAF7F2] text-[#57534E] hover:border-[#D6CEC2] hover:text-[#1C1917]'
                  }`}
                >
                  All Aisles ({allCategories.length})
                </button>
                {allCategories.map(cat => {
                  const catItems = groupedItems[cat] || [];
                  const remainingCount = catItems.filter(i => !i.checked).length;
                  const isSelected = activeAisle === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedAisle(prev => (prev === cat ? 'all' : cat))}
                      aria-pressed={isSelected}
                      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors tabular-nums ${
                        isSelected
                          ? 'border-[#C84B31] bg-[#F9F1EA] text-[#9A3412]'
                          : remainingCount === 0
                            ? 'border-[#3F624D]/25 bg-[#ECF5F0] text-[#2F6F4E]'
                            : 'border-[#E7E0D6] bg-[#FAF7F2] text-[#57534E] hover:border-[#D6CEC2] hover:text-[#1C1917]'
                      }`}
                    >
                      {cat} ({remainingCount})
                    </button>
                  );
                })}
              </div>
            ) : (
              <span className="text-xs text-[#78716C]">
                Add items to organize your list by aisle.
              </span>
            )}

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                className="btn-secondary !px-3.5 !py-1.5 text-xs"
                disabled={bulkUpdating || checkedCount === 0}
                onClick={handleUncheckAll}
              >
                Uncheck all
              </button>
              <button
                className="btn-secondary !px-3.5 !py-1.5 text-xs"
                aria-pressed={hideChecked}
                onClick={() => setHideChecked(prev => !prev)}
              >
                {hideChecked ? 'Show checked' : 'Collapse checked'}
              </button>
            </div>
          </div>
        </div>

        {/* 100% Completion Banner */}
        {completionPercentage === 100 && totalItems > 0 && (
          <div className="mt-4 rounded-3xl border border-[#3F624D]/30 bg-[#ECF5F0] p-5 sm:p-6 animate-slide-in-up">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="icon-container-premium icon-container-emerald shrink-0">
                  <CheckCircleIcon className="h-6 w-6 text-[#2F6F4E]" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-semibold text-[#1C1917]">
                    Shopping complete!
                  </h3>
                  <p className="text-sm text-[#2F6F4E] mt-0.5">
                    Every aisle is checked off. Update your pantry staples or head back to your meal
                    plan.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <button onClick={() => navigate('/meal-plans')} className="btn-secondary">
                  Back to meal plans
                </button>
                <button onClick={() => navigate('/pantry')} className="btn-secondary">
                  <PantryIcon className="h-4 w-4" />
                  <span>Manage pantry</span>
                </button>
                <button onClick={() => setShowArchiveDialog(true)} className="btn-danger">
                  <ArchiveBoxIcon className="h-4 w-4" />
                  <span>Archive list</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Items by Aisle / Category */}
      {categories.length === 0 ? (
        <EmptyState
          icon={<ShoppingCartIcon className="h-12 w-12" />}
          title={totalItems === 0 ? 'Nothing on the list yet' : 'All items checked'}
          description={
            totalItems === 0
              ? 'Add a few ingredients to get your shopping run started.'
              : 'Everything in this view is checked off.'
          }
          action={
            totalItems === 0 ? (
              <button onClick={() => setShowAddModal(true)} className="btn-primary">
                <PlusIcon className="h-4 w-4" />
                Add an item
              </button>
            ) : (
              <div className="flex flex-wrap justify-center gap-2">
                {activeAisle !== 'all' && (
                  <button onClick={() => setSelectedAisle('all')} className="btn-secondary">
                    Show all aisles
                  </button>
                )}
                {hideChecked && (
                  <button onClick={() => setHideChecked(false)} className="btn-secondary">
                    Show checked items
                  </button>
                )}
              </div>
            )
          }
        />
      ) : (
        <div className="space-y-6">
          {categories.map(category => {
            const categoryTotal = groupedItems[category].length;
            const categoryChecked = groupedItems[category].filter(item => item.checked).length;
            const aisleComplete = categoryTotal > 0 && categoryChecked === categoryTotal;

            return (
              <SectionCard
                key={category}
                bare
                className="overflow-hidden"
                title={
                  <span className="inline-flex items-center gap-2.5">
                    <span>{category}</span>
                    {aisleComplete && (
                      <span className="rounded-full bg-[#ECF5F0] border border-[#3F624D]/25 px-2.5 py-0.5 font-sans text-xs font-semibold text-[#2F6F4E]">
                        Aisle done
                      </span>
                    )}
                  </span>
                }
                subtitle={`${categoryChecked} of ${categoryTotal} checked`}
                headerClassName="bg-[#FAF7F2] border-b border-[#E7E0D6] px-5 py-3.5 mb-0"
                contentClassName="divide-y divide-[#E7E0D6]/80"
              >
                {filteredGroupedItems[category].map(item => (
                  <div
                    key={item.id}
                    className={`min-h-[52px] px-4 sm:px-5 py-3 flex items-center gap-3 transition-colors duration-150 ${
                      recentlyChecked.has(item.id)
                        ? 'bg-[#ECF5F0]/70'
                        : item.checked
                          ? 'bg-[#FAF7F2]/60'
                          : 'bg-white hover:bg-[#FAF7F2]/50'
                    }`}
                  >
                    <label className="flex h-11 w-11 shrink-0 items-center justify-center relative rounded-full cursor-pointer hover:bg-[#F3EFE6]/80">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => handleToggleItem(item)}
                        className={`h-5 w-5 rounded border-[#D6CEC2] text-[#2F6F4E] focus:ring-[#2F6F4E] transition-transform cursor-pointer ${
                          recentlyChecked.has(item.id) ? 'animate-check-in' : ''
                        }`}
                        style={{ accentColor: '#2F6F4E' }}
                        aria-label={`Mark ${item.name} as ${item.checked ? 'unchecked' : 'checked'}`}
                      />
                      {recentlyChecked.has(item.id) && (
                        <span className="absolute inset-0 rounded-full bg-[#2F6F4E]/20 animate-success-ripple" />
                      )}
                    </label>

                    {editingItem?.id === item.id ? (
                      <EditItemForm
                        item={item}
                        onSave={updates => handleUpdateItem(item, updates)}
                        onCancel={() => setEditingItem(null)}
                      />
                    ) : (
                      <div className="flex-1 flex items-center justify-between gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleToggleItem(item)}
                          className="flex-1 text-left flex flex-wrap items-center gap-2 min-w-0 py-1 focus:outline-none"
                        >
                          <span
                            className={`text-base font-medium transition-colors duration-150 ${
                              item.checked
                                ? 'text-[#78716C] line-through decoration-[#78716C]'
                                : 'text-[#1C1917]'
                            }`}
                          >
                            {item.name}
                          </span>
                          {(item.quantity || item.unit) && (
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-mono tabular-nums ${
                                item.checked
                                  ? 'border-[#E7E0D6] bg-[#F3EFE6]/50 text-[#78716C]'
                                  : 'border-[#E7E0D6] bg-[#FAF7F2] text-[#57534E]'
                              }`}
                            >
                              {[item.quantity, item.unit].filter(Boolean).join(' ')}
                            </span>
                          )}
                        </button>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => setEditingItem(item)}
                            className="icon-button-muted h-10 w-10"
                            title={`Edit ${item.name}`}
                            aria-label={`Edit ${item.name}`}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setItemToDelete(item)}
                            className="icon-button-danger h-10 w-10"
                            title={`Delete ${item.name}`}
                            aria-label={`Delete ${item.name}`}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </SectionCard>
            );
          })}
        </div>
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <ModalShell
          size="sm"
          title="Add item"
          onClose={() => setShowAddModal(false)}
          footer={
            <>
              <button onClick={() => setShowAddModal(false)} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleAddItem}
                disabled={!newItem.name.trim()}
                className="btn-primary"
              >
                Add item
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1C1917] mb-1">Item name *</label>
              <input
                type="text"
                value={newItem.name}
                onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                className="input w-full"
                placeholder="e.g., Bananas"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-[#1C1917] mb-1">Quantity</label>
                <input
                  type="number"
                  value={newItem.quantity || ''}
                  onChange={e =>
                    setNewItem({
                      ...newItem,
                      quantity: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  className="input w-full"
                  placeholder="2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1C1917] mb-1">Unit</label>
                <input
                  type="text"
                  value={newItem.unit || ''}
                  onChange={e => setNewItem({ ...newItem, unit: e.target.value })}
                  className="input w-full"
                  placeholder="lbs"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1C1917] mb-1">Category</label>
              <select
                value={newItem.category || ''}
                onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                className="input w-full"
              >
                <option value="Produce">Produce</option>
                <option value="Dairy">Dairy</option>
                <option value="Meat & Seafood">Meat & Seafood</option>
                <option value="Pantry">Pantry</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </ModalShell>
      )}

      {/* Send Notification Modal */}
      {showNotificationModal && (
        <ModalShell
          size="sm"
          title="Send grocery list"
          description="Send this list to extra emails. We'll include unchecked items by category."
          onClose={() => {
            setShowNotificationModal(false);
            setAdditionalEmails(['']);
            setEmailErrors([]);
          }}
          footer={
            <>
              <button
                onClick={() => {
                  setShowNotificationModal(false);
                  setAdditionalEmails(['']);
                  setEmailErrors([]);
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSendWithEmails}
                disabled={sendingNotification}
                className="btn-primary flex items-center"
              >
                {sendingNotification ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <EnvelopeIcon className="h-4 w-4 mr-2" />
                    Send list
                  </>
                )}
              </button>
            </>
          }
        >
          <div className="space-y-3">
            <label className="block text-sm font-medium text-[#1C1917]">
              Additional recipients (optional)
            </label>

            {additionalEmails.map((email, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="flex-1">
                  <input
                    type="email"
                    value={email}
                    onChange={e => handleEmailChange(index, e.target.value)}
                    className={`input w-full ${emailErrors[index] ? 'border-[#B91C1C]' : ''}`}
                    placeholder="email@example.com"
                  />
                  {emailErrors[index] && (
                    <p className="text-[#B91C1C] text-xs mt-1">{emailErrors[index]}</p>
                  )}
                </div>
                {additionalEmails.length > 1 && (
                  <button
                    onClick={() => removeEmailField(index)}
                    className="icon-button-danger"
                    title="Remove email field"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}

            <button
              onClick={addEmailField}
              className="text-sm font-semibold flex items-center transition-colors text-[#C84B31] hover:text-[#B83B22]"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Add another email
            </button>
          </div>
        </ModalShell>
      )}

      <ConfirmDialog
        isOpen={Boolean(itemToDelete)}
        title="Delete item?"
        description={
          itemToDelete
            ? `"${itemToDelete.name}" will be removed from this grocery list.`
            : 'This item will be removed from this grocery list.'
        }
        confirmLabel="Delete item"
        tone="danger"
        onCancel={() => setItemToDelete(null)}
        onConfirm={handleDeleteItem}
      />

      <ConfirmDialog
        isOpen={showArchiveDialog}
        title="Archive this grocery list?"
        description="This removes the list from Grocery Lists once your shopping is complete."
        confirmLabel="Archive list"
        tone="danger"
        loading={archiving}
        onCancel={() => {
          if (!archiving) {
            setShowArchiveDialog(false);
          }
        }}
        onConfirm={handleArchiveList}
      />
    </div>
  );
}

function EditItemForm({
  item,
  onSave,
  onCancel,
}: {
  item: GroceryItem;
  onSave: (updates: GroceryItemUpdate) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(item.quantity || '');
  const [unit, setUnit] = useState(item.unit || '');

  const handleSave = () => {
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      quantity: quantity ? parseFloat(quantity.toString()) : undefined,
      unit,
      category: item.category || 'Other',
    });
  };

  return (
    <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        className="input text-sm"
        placeholder="Item name"
      />
      <input
        type="number"
        value={quantity}
        onChange={e => setQuantity(e.target.value)}
        className="input text-sm"
        placeholder="Qty"
      />
      <input
        type="text"
        value={unit}
        onChange={e => setUnit(e.target.value)}
        className="input text-sm"
        placeholder="Unit"
      />
      <div className="flex items-center space-x-1">
        <button
          onClick={handleSave}
          className="icon-button text-[#2F6F4E] hover:bg-[#ECF5F0]"
          title="Save changes"
        >
          <CheckIcon className="h-4 w-4" />
        </button>
        <button onClick={onCancel} className="icon-button-danger" title="Cancel editing">
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
