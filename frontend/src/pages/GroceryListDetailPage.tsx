import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { useToast } from '../contexts/ToastContext';

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

      // Track recently checked items for animation
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

      // Clear message after 5 seconds
      setTimeout(() => {
        setNotificationMessage(null);
      }, 5000);
    } catch (error: unknown) {
      console.error('Failed to send notification:', error);

      // Handle different types of errors with specific messages
      let errorMessage = 'Could not send the grocery email.';
      const apiError = error as APIError;

      if (apiError.response?.status === 400) {
        // User-related errors (like disabled notifications, invalid email)
        errorMessage =
          apiError.response?.data?.detail ||
          'Double-check notification settings and the email address.';
      } else if (apiError.response?.status === 503) {
        // Service unavailable (SMTP configuration, connection, authentication issues)
        errorMessage =
          apiError.response?.data?.detail || 'Email service is taking a break. Try again soon.';
      } else if (apiError.response?.status === 500) {
        // Internal server errors (template errors, unexpected issues)
        errorMessage = apiError.response?.data?.detail || 'Something went sideways. Try again.';
      } else if (('code' in apiError && apiError.code === 'NETWORK_ERROR') || !apiError.response) {
        // Network connectivity issues
        errorMessage = 'Network hiccup. Check your connection and try again.';
      }

      setNotificationMessage({
        type: 'error',
        text: errorMessage,
      });

      // Clear error message after 5 seconds
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

    // Clear error for this field
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
    // Validate all email fields
    const newErrors = additionalEmails.map(email => {
      if (email.trim() === '') return '';
      if (!validateEmail(email.trim())) return 'Invalid email address';
      return '';
    });

    setEmailErrors(newErrors);

    // Check if there are any validation errors
    const hasErrors = newErrors.some(error => error !== '');
    if (hasErrors) return;

    // Send notification
    const validEmails = additionalEmails.filter(email => email.trim() !== '');
    handleSendNotification(validEmails);
    setShowNotificationModal(false);

    // Reset form
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
  const checkedCount = groceryList ? groceryList.items.filter(item => item.checked).length : 0;
  const completionPercentage = getCompletionPercentage();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2"
          style={{ borderBottomColor: 'var(--primary)' }}
        ></div>
      </div>
    );
  }

  if (!groceryList) {
    return (
      <div className="text-center py-12">
        <p className="text-stone-500">We couldn't find that list.</p>
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
  const categories = Object.keys(filteredGroupedItems)
    .filter(category => filteredGroupedItems[category].length > 0)
    .sort(sortCategoryNames);

  return (
    <div>
      {/* Notification Message */}
      {notificationMessage && (
        <div
          className={`mb-4 rounded-2xl p-4 border ${
            notificationMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          <p className="text-sm">{notificationMessage.text}</p>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <button onClick={() => navigate('/grocery')} className="icon-button-outline mr-3">
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div className="flex items-center flex-1">
            <ShoppingCartIcon className="h-8 w-8 text-emerald-500 mr-3" />
            <div>
              <h1 className="text-2xl font-semibold text-stone-900">
                {groceryList.name || 'Grocery list'}
              </h1>
              <p className="text-sm text-stone-500">
                Created {new Date(groceryList.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex space-x-3">
            {/* Enhanced Send Notification Button Group */}
            <div className="relative">
              <div className="flex">
                {/* Main Send Button */}
                <button
                  onClick={() => handleSendNotification()}
                  disabled={sendingNotification}
                  className="flex items-center rounded-l-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50"
                >
                  {sendingNotification ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-600 mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <EnvelopeIcon className="h-4 w-4 mr-2" />
                      Email me
                    </>
                  )}
                </button>

                {/* Dropdown Toggle Button */}
                <button
                  onClick={() => setShowSendDropdown(!showSendDropdown)}
                  disabled={sendingNotification}
                  className="rounded-r-full border border-l-0 border-slate-200 bg-white px-2 py-2 text-slate-600 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-soft"
                  title="More sending options"
                >
                  <ChevronDownIcon
                    className={`h-4 w-4 transition-transform duration-200 ${showSendDropdown ? 'rotate-180' : ''}`}
                  />
                </button>
              </div>

              {/* Dropdown Menu */}
              {showSendDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-lg border border-slate-200 z-10">
                  <div className="py-2">
                    <button
                      onClick={() => {
                        setShowSendDropdown(false);
                        setShowNotificationModal(true);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center"
                    >
                      <PlusIcon className="h-4 w-4 mr-3 text-slate-400" />
                      Send to extra people
                    </button>
                    <div className="border-t border-slate-100 my-1"></div>
                    <div className="px-4 py-2 text-xs text-slate-500">
                      "Email me" sends it to your account address
                    </div>
                  </div>
                </div>
              )}

              {/* Click outside to close dropdown */}
              {showSendDropdown && (
                <div className="fixed inset-0 z-0" onClick={() => setShowSendDropdown(false)}></div>
              )}
            </div>

            <button onClick={() => setShowAddModal(true)} className="btn-primary">
              <PlusIcon className="h-4 w-4 mr-2" />
              Add item
            </button>
          </div>
        </div>

        {/* Progress with celebration at 100% */}
        <div
          className={`surface progress-fun p-4 transition-all duration-500 sticky top-20 z-20 ${
            completionPercentage === 100 ? 'animate-celebration-glow ring-2 ring-emerald-300' : ''
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-stone-700">Progress</span>
            <span className="text-sm text-stone-500">
              {checkedCount} of {groceryList.items.length} checked
            </span>
          </div>
          <div className="relative w-full bg-stone-200 rounded-full h-2.5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out bg-emerald-500"
              style={{ width: `${completionPercentage}%` }}
            />
            {completionPercentage === 100 && (
              <div className="absolute inset-0 bg-emerald-400/30 animate-pulse rounded-full" />
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            {completionPercentage === 100 ? (
              <InlineStatus label="All done" tone="success" className="animate-bounce-in" />
            ) : (
              <InlineStatus label={`${completionPercentage}% done`} tone="neutral" />
            )}
            <span className="text-stone-500">Tap-friendly controls below speed up shopping.</span>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
            <button
              className="btn-secondary !px-4 !py-2.5 text-xs"
              disabled={bulkUpdating || checkedCount === 0}
              onClick={handleUncheckAll}
            >
              Uncheck all
            </button>
            <button
              className="btn-secondary !px-4 !py-2.5 text-xs"
              onClick={() => setHideChecked(prev => !prev)}
            >
              {hideChecked ? 'Show checked' : 'Collapse checked'}
            </button>
          </div>
        </div>

        {/* Completion banner - shown when 100% done */}
        {completionPercentage === 100 && groceryList.items.length > 0 && (
          <div
            className="mt-4 p-5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 animate-slide-in-up"
            style={{ animationFillMode: 'forwards' }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-emerald-800 flex items-center gap-2">
                  <span className="text-2xl">🛒</span>
                  Shopping complete!
                </h3>
                <p className="text-emerald-700 text-sm mt-1">Ready to start cooking?</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => navigate('/meal-plans')} className="btn-secondary">
                  Back to meal plans
                </button>
                <button onClick={() => setShowArchiveDialog(true)} className="btn-danger">
                  <ArchiveBoxIcon className="h-4 w-4 mr-2" />
                  Archive list
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Items by Category */}
      {categories.length === 0 ? (
        <EmptyState
          icon={<ShoppingCartIcon className="h-12 w-12" />}
          title={groceryList.items.length === 0 ? 'Nothing on the list yet' : 'All items checked'}
          description={
            groceryList.items.length === 0
              ? 'Add a few items to get rolling.'
              : 'Nice work. Everything is checked off.'
          }
          action={
            groceryList.items.length === 0 ? (
              <button onClick={() => setShowAddModal(true)} className="btn-primary">
                <PlusIcon className="h-4 w-4 mr-2" />
                Add an item
              </button>
            ) : (
              <button onClick={() => setHideChecked(false)} className="btn-secondary">
                Show checked items
              </button>
            )
          }
        />
      ) : (
        <div className="space-y-6">
          {categories.map(category => (
            <SectionCard
              key={category}
              bare
              className="overflow-hidden"
              title={category}
              subtitle={`${groupedItems[category].filter(item => item.checked).length} of ${groupedItems[category].length} checked`}
              headerClassName="category-header-fun px-4 py-3 border-b border-slate-200/70 bg-slate-50 mb-0"
              contentClassName="divide-y divide-stone-200/70"
            >
              {filteredGroupedItems[category].map(item => (
                <div
                  key={item.id}
                  className={`px-4 py-3 flex items-center transition-all duration-200 ${
                    recentlyChecked.has(item.id) ? 'bg-emerald-50' : ''
                  }`}
                >
                  <label className="flex h-10 w-10 items-center justify-center mr-2 relative rounded-full hover:bg-stone-100">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => handleToggleItem(item)}
                      className={`h-6 w-6 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500 transition-transform ${
                        recentlyChecked.has(item.id) ? 'animate-check-in' : ''
                      }`}
                      aria-label={`Mark ${item.name} as ${item.checked ? 'unchecked' : 'checked'}`}
                    />
                    {recentlyChecked.has(item.id) && (
                      <span className="absolute inset-0 rounded-full bg-emerald-400/30 animate-success-ripple" />
                    )}
                  </label>

                  {editingItem?.id === item.id ? (
                    <EditItemForm
                      item={item}
                      onSave={updates => handleUpdateItem(item, updates)}
                      onCancel={() => setEditingItem(null)}
                    />
                  ) : (
                    <div className="flex-1 flex items-center justify-between">
                      <div className="flex-1 relative">
                        <div className="flex items-center">
                          <span
                            className={`font-medium transition-colors duration-200 ${
                              item.checked ? 'text-stone-400' : 'text-stone-900'
                            }`}
                          >
                            {item.name}
                          </span>
                          {item.quantity && (
                            <span
                              className={`ml-2 text-sm transition-colors duration-200 ${
                                item.checked ? 'text-stone-300' : 'text-stone-500'
                              }`}
                            >
                              {item.quantity} {item.unit}
                            </span>
                          )}
                        </div>
                        {item.checked && (
                          <span
                            className="absolute left-0 top-1/2 h-px bg-stone-400 animate-strike"
                            style={{ width: '100%', maxWidth: '200px' }}
                          />
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setEditingItem(item)}
                          className="icon-button-muted h-10 w-10"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setItemToDelete(item)}
                          className="icon-button-danger h-10 w-10"
                          title={`Delete ${item.name}`}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </SectionCard>
          ))}
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
              <label className="block text-sm font-medium text-stone-700 mb-1">Item name *</label>
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
                <label className="block text-sm font-medium text-stone-700 mb-1">Quantity</label>
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
                <label className="block text-sm font-medium text-stone-700 mb-1">Unit</label>
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
              <label className="block text-sm font-medium text-stone-700 mb-1">Category</label>
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
            <label className="block text-sm font-medium text-stone-700">
              Additional recipients (optional)
            </label>

            {additionalEmails.map((email, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="flex-1">
                  <input
                    type="email"
                    value={email}
                    onChange={e => handleEmailChange(index, e.target.value)}
                    className={`input w-full ${emailErrors[index] ? 'border-red-300' : ''}`}
                    placeholder="email@example.com"
                  />
                  {emailErrors[index] && (
                    <p className="text-red-500 text-xs mt-1">{emailErrors[index]}</p>
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
              className="text-sm flex items-center transition-colors"
              style={{ color: 'var(--primary)' }}
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
    <div className="flex-1 grid grid-cols-4 gap-2 items-center">
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
        <button onClick={handleSave} className="icon-button text-emerald-600 hover:bg-emerald-50">
          <CheckIcon className="h-4 w-4" />
        </button>
        <button onClick={onCancel} className="icon-button-danger">
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
