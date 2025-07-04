import { useState, useEffect, useCallback } from 'react';
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
} from '@heroicons/react/24/outline';
import { CheckIcon as CheckIconSolid } from '@heroicons/react/24/solid';
import groceryService from '../services/grocery.service';
import notificationService from '../services/notification.service';
import type {
  GroceryList,
  GroceryItem,
  GroceryItemCreate,
  GroceryItemUpdate,
  APIError,
} from '../types';

interface GroupedItems {
  [category: string]: GroceryItem[];
}

export default function GroceryListDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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

  useEffect(() => {
    if (id) {
      loadGroceryList();
    }
  }, [id, loadGroceryList]);

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

  const handleToggleItem = async (item: GroceryItem) => {
    if (!groceryList) return;

    try {
      const updatedItem = await groceryService.toggleGroceryItem(
        groceryList.id,
        item.id,
        !item.checked
      );

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
      alert('Failed to add item. Please try again.');
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
      alert('Failed to update item. Please try again.');
    }
  };

  const handleDeleteItem = async (item: GroceryItem) => {
    if (!groceryList || !window.confirm('Delete this item?')) return;

    try {
      await groceryService.deleteGroceryItem(groceryList.id, item.id);
      setGroceryList({
        ...groceryList,
        items: groceryList.items.filter(i => i.id !== item.id),
      });
    } catch (error) {
      console.error('Failed to delete item:', error);
      alert('Failed to delete item. Please try again.');
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
      let errorMessage = 'Failed to send grocery notification.';
      const apiError = error as APIError;

      if (apiError.response?.status === 400) {
        // User-related errors (like disabled notifications, invalid email)
        errorMessage =
          apiError.response?.data?.detail ||
          'Please check your notification settings and email address.';
      } else if (apiError.response?.status === 503) {
        // Service unavailable (SMTP configuration, connection, authentication issues)
        errorMessage =
          apiError.response?.data?.detail ||
          'Email service is currently unavailable. Please try again later or contact support.';
      } else if (apiError.response?.status === 500) {
        // Internal server errors (template errors, unexpected issues)
        errorMessage =
          apiError.response?.data?.detail ||
          'An internal error occurred. Please try again or contact support.';
      } else if (('code' in apiError && apiError.code === 'NETWORK_ERROR') || !apiError.response) {
        // Network connectivity issues
        errorMessage =
          'Network connection error. Please check your internet connection and try again.';
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!groceryList) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Grocery list not found.</p>
      </div>
    );
  }

  const groupedItems = groupItemsByCategory(groceryList.items);
  const categories = Object.keys(groupedItems).sort();

  return (
    <div>
      {/* Notification Message */}
      {notificationMessage && (
        <div
          className={`mb-4 rounded-lg p-4 ${
            notificationMessage.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          <p className="text-sm">{notificationMessage.text}</p>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <button
            onClick={() => navigate('/grocery')}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg mr-3"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div className="flex items-center flex-1">
            <ShoppingCartIcon className="h-8 w-8 text-green-500 mr-3" />
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Grocery List</h1>
              <p className="text-sm text-gray-500">
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
                  className="btn-secondary flex items-center rounded-r-none border-r-0 px-4 py-2"
                >
                  {sendingNotification ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <EnvelopeIcon className="h-4 w-4 mr-2" />
                      Send to Me
                    </>
                  )}
                </button>

                {/* Dropdown Toggle Button */}
                <button
                  onClick={() => setShowSendDropdown(!showSendDropdown)}
                  disabled={sendingNotification}
                  className="btn-secondary rounded-l-none px-2 py-2 border-l border-gray-300 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  title="More sending options"
                >
                  <ChevronDownIcon
                    className={`h-4 w-4 transition-transform duration-200 ${showSendDropdown ? 'rotate-180' : ''}`}
                  />
                </button>
              </div>

              {/* Dropdown Menu */}
              {showSendDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                  <div className="py-2">
                    <button
                      onClick={() => {
                        setShowSendDropdown(false);
                        setShowNotificationModal(true);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      <PlusIcon className="h-4 w-4 mr-3 text-gray-400" />
                      Send to additional recipients
                    </button>
                    <div className="border-t border-gray-100 my-1"></div>
                    <div className="px-4 py-2 text-xs text-gray-500">
                      "Send to Me" sends the list to your account email
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
              Add Item
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm text-gray-500">
              {groceryList.items.filter(item => item.checked).length} of {groceryList.items.length}{' '}
              completed
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${getCompletionPercentage()}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">{getCompletionPercentage()}% complete</p>
        </div>
      </div>

      {/* Items by Category */}
      {categories.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <ShoppingCartIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No items</h3>
          <p className="mt-1 text-sm text-gray-500">Add some items to your grocery list.</p>
          <div className="mt-6">
            <button onClick={() => setShowAddModal(true)} className="btn-primary">
              <PlusIcon className="h-4 w-4 mr-2" />
              Add your first item
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {categories.map(category => (
            <div key={category} className="bg-white rounded-lg shadow">
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">{category}</h3>
                <p className="text-sm text-gray-500">
                  {groupedItems[category].filter(item => item.checked).length} of{' '}
                  {groupedItems[category].length} completed
                </p>
              </div>
              <div className="divide-y divide-gray-200">
                {groupedItems[category].map(item => (
                  <div key={item.id} className="px-4 py-3 flex items-center">
                    <button
                      onClick={() => handleToggleItem(item)}
                      className={`flex-shrink-0 h-5 w-5 rounded border-2 flex items-center justify-center mr-3 transition-colors duration-200 ${
                        item.checked
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'border-gray-300 hover:border-green-400'
                      }`}
                    >
                      {item.checked && <CheckIconSolid className="h-3 w-3" />}
                    </button>

                    {editingItem?.id === item.id ? (
                      <EditItemForm
                        item={item}
                        onSave={updates => handleUpdateItem(item, updates)}
                        onCancel={() => setEditingItem(null)}
                      />
                    ) : (
                      <div className="flex-1 flex items-center justify-between">
                        <div
                          className={`flex-1 ${item.checked ? 'line-through text-gray-500' : ''}`}
                        >
                          <div className="flex items-center">
                            <span className="font-medium">{item.name}</span>
                            {item.quantity && (
                              <span className="ml-2 text-sm text-gray-500">
                                {item.quantity} {item.unit}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setEditingItem(item)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add Item</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item Name *
                  </label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
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

              <div className="mt-6 flex justify-end space-x-3">
                <button onClick={() => setShowAddModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={handleAddItem}
                  disabled={!newItem.name.trim()}
                  className="btn-primary"
                >
                  Add Item
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send Notification Modal */}
      {showNotificationModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Send Grocery List</h3>

              <p className="text-sm text-gray-600 mb-4">
                Send this grocery list to additional email addresses. The email will include all
                unchecked items organized by category.
              </p>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Additional Recipients (optional)
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
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="Remove email field"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  onClick={addEmailField}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add another email
                </button>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
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
                      Send List
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
        <button onClick={handleSave} className="p-1 text-green-600 hover:bg-green-50 rounded">
          <CheckIcon className="h-4 w-4" />
        </button>
        <button onClick={onCancel} className="p-1 text-red-600 hover:bg-red-50 rounded">
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
