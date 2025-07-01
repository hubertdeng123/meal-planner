import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  CalendarIcon,
  SparklesIcon,
  StarIcon,
  PlusIcon,
  ShoppingCartIcon,
  ArrowLeftIcon,
  TrashIcon,
  XMarkIcon,
  EnvelopeIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';
import mealPlanningService, {
  type MealPlanStreamCallbacks,
} from '../services/meal-planning.service';
import groceryService from '../services/grocery.service';
import notificationService from '../services/notification.service';
import type {
  WeeklyScheduleRequest,
  WeeklyMealPlan,
  MealSlot,
  RecipeSuggestion,
  MealType,
  GroceryList,
  GroceryItem,
} from '../types';

export default function WeeklyMealPlanPage() {
  const navigate = useNavigate();
  const { id: mealPlanId } = useParams<{ id: string }>();
  const [step, setStep] = useState<'schedule' | 'planning' | 'selection'>('schedule');
  const [viewMode, setViewMode] = useState(false); // true when viewing existing plan
  const [activeTab, setActiveTab] = useState<'recipes' | 'grocery'>('recipes');
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [loading, setLoading] = useState(false);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyMealPlan | null>(null);
  const [groceryList, setGroceryList] = useState<GroceryList | null>(null);
  const [groceryLoading, setGroceryLoading] = useState(false);
  const [selectedRecipeDetail, setSelectedRecipeDetail] = useState<{
    recipe: RecipeSuggestion;
    slotInfo: { date: string; mealType: MealType };
  } | null>(null);

  // Notification state
  const [sendingNotification, setSendingNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [additionalEmails, setAdditionalEmails] = useState<string[]>(['']);
  const [emailErrors, setEmailErrors] = useState<string[]>([]);
  const [showSendDropdown, setShowSendDropdown] = useState(false);
  const [notificationType, setNotificationType] = useState<'grocery' | 'weekly-plan'>(
    'weekly-plan'
  );

  // Streaming state - using same pattern as GenerateRecipePage
  const [isStreaming, setIsStreaming] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [thinkingContent, setThinkingContent] = useState('');
  const [planningContent, setPlanningContent] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  // Ref for auto-scrolling
  const contentRef = useRef<HTMLDivElement>(null);

  // Load existing meal plan if we have an ID
  useEffect(() => {
    if (mealPlanId) {
      setViewMode(true);
      setLoadingPlan(true);

      const loadPlan = async () => {
        try {
          const plan = await mealPlanningService.getMealPlanDetails(parseInt(mealPlanId));
          setWeeklyPlan(plan);
          setStep('selection');
        } catch (error) {
          console.error('Failed to load meal plan:', error);
          alert('Failed to load meal plan. Redirecting to meal plans list.');
          navigate('/meal-planning');
        } finally {
          setLoadingPlan(false);
        }
      };
      loadPlan();
    }
  }, [mealPlanId, navigate]);

  useEffect(() => {
    // Auto-scroll content
    if (contentRef.current && (thinkingContent || planningContent)) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [thinkingContent, planningContent]);

  // Auto-clear thinking content after it gets too long (every ~500 characters)
  useEffect(() => {
    if (thinkingContent.length > 500 && isThinking) {
      // Keep only the last sentence or two by finding the last period
      const lastPeriodIndex = thinkingContent.lastIndexOf('.', thinkingContent.length - 50);
      if (lastPeriodIndex > 100) {
        const recentContent = thinkingContent.slice(lastPeriodIndex + 1).trim();
        if (recentContent) {
          setThinkingContent(recentContent + ' ');
        }
      }
    }
  }, [thinkingContent, isThinking]);

  // Helper function to format thinking content as cohesive sentences
  const formatThinkingContent = (content: string) => {
    if (!content) return '';

    // Remove any markdown-like formatting
    let formatted = content
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/`(.*?)`/g, '$1') // Remove code formatting
      .replace(/#{1,6}\s*/g, '') // Remove headers
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links, keep text
      .replace(/[-*+]\s+/g, '') // Remove bullet points
      .replace(/\d+\.\s+/g, '') // Remove numbered lists
      .trim();

    // Ensure it ends with proper sentence punctuation for readability
    if (formatted && !formatted.match(/[.!?]$/)) {
      formatted += '...';
    }

    return formatted;
  };

  // Schedule form state
  const [scheduleForm, setScheduleForm] = useState<WeeklyScheduleRequest>({
    start_date: '',
    cooking_days: [],
    meal_types: [],
    servings: 4,
    difficulty: '',
    dietary_restrictions: [],
    preferred_cuisines: [],
    must_include_ingredients: [],
    must_avoid_ingredients: [],
  });

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

  const cuisineOptions = [
    'Italian',
    'Mexican',
    'Chinese',
    'Japanese',
    'Indian',
    'Thai',
    'French',
    'Mediterranean',
    'American',
    'Korean',
  ];
  const dietaryOptions = [
    'Vegetarian',
    'Vegan',
    'Gluten-Free',
    'Dairy-Free',
    'Low-Carb',
    'Keto',
    'Paleo',
    'Low-Sodium',
  ];
  const difficultyLevels = ['Easy', 'Medium', 'Hard'];

  const handleScheduleSubmit = async () => {
    if (
      !scheduleForm.start_date ||
      scheduleForm.cooking_days.length === 0 ||
      scheduleForm.meal_types.length === 0
    ) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setStep('planning');
    setIsStreaming(true);

    // Reset streaming state
    setStatusMessage('');
    setThinkingContent('');
    setPlanningContent('');
    setIsThinking(false);

    try {
      console.log('🎯 Starting meal plan generation with form data:', scheduleForm);

      const callbacks: MealPlanStreamCallbacks = {
        onStatus: message => {
          console.log('📊 STATUS callback triggered:', message);
          setStatusMessage(message);
        },

        onThinkingStart: message => {
          console.log('🧠 THINKING_START callback triggered:', message);
          setIsThinking(true);
          setThinkingContent('');
        },

        onThinking: chunk => {
          console.log('🧠 THINKING callback triggered with chunk length:', chunk.length);
          setThinkingContent(prev => {
            const newContent = prev + chunk;
            console.log('🧠 Updated thinking content total length:', newContent.length);
            return newContent;
          });
        },

        onThinkingStop: message => {
          console.log('🧠 THINKING_STOP callback triggered:', message);
          setStatusMessage(message);
          setIsThinking(false);
          // Clear thinking content after a brief delay when thinking stops
          setTimeout(() => {
            setThinkingContent('');
          }, 2000);
        },

        onContent: chunk => {
          console.log('📝 CONTENT callback triggered with chunk length:', chunk.length);
          setPlanningContent(prev => prev + chunk);
        },

        onComplete: (mealPlan, message) => {
          console.log('🎉 COMPLETE callback triggered:', message);
          setStatusMessage(message);
          setLoading(false);
          setIsStreaming(false);
          setIsThinking(false);

          // Navigate to selection step after a short delay
          setTimeout(() => {
            setWeeklyPlan(mealPlan);
            setStep('selection');
          }, 2000);
        },

        onError: (error, details) => {
          console.error('❌ ERROR callback triggered:', error, details);
          const errorMsg = `Failed to create meal plan: ${error}${details ? '\nDetails: ' + details : ''}`;
          alert(errorMsg);
          setStep('schedule');
        },
      };

      await mealPlanningService.createWeeklyMealPlanStreamWithCallbacks(scheduleForm, callbacks);
      console.log('🏁 Stream processing completed');
    } catch (error: any) {
      console.error('Failed to create meal plan:', error);
      console.error('Error type:', typeof error);
      console.error('Error stack:', error.stack);
      const errorMsg = error.message || error.toString() || 'Unknown error occurred';
      alert(
        `Failed to create meal plan: ${errorMsg}\n\nPlease check the browser console for more details.`
      );
      setStep('schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleViewRecipeDetail = (recipe: RecipeSuggestion, mealSlot: MealSlot) => {
    console.log('🔍 handleViewRecipeDetail called:', { recipe, mealSlot });
    console.log('🔍 Recipe data:', recipe);
    console.log('🔍 Recipe has ID?', !!recipe?.id, 'ID value:', recipe?.id);
    console.log('🔍 Recipe structure check:', {
      hasName: !!recipe?.name,
      hasIngredients: !!recipe?.ingredients,
      hasInstructions: !!recipe?.instructions,
      recipeKeys: recipe ? Object.keys(recipe).join(', ') : 'no recipe',
    });

    if (!recipe) {
      console.log('🔍 Recipe has no ID, showing modal');
      setSelectedRecipeDetail(null);
      return;
    }

    setSelectedRecipeDetail({
      recipe,
      slotInfo: { date: mealSlot.date, mealType: mealSlot.meal_type },
    });
    console.log('🔍 handleViewRecipeDetail completed');
  };

  const handleSelectRecipe = async (mealSlotIndex: number, recipeIndex: number) => {
    if (!weeklyPlan) return;

    try {
      // Update local state immediately for responsive UI
      const updatedPlan = { ...weeklyPlan };
      updatedPlan.meal_slots[mealSlotIndex].selected_recipe_index = recipeIndex;
      setWeeklyPlan(updatedPlan);

      // Save to backend if this is a saved meal plan (has an ID)
      if (weeklyPlan.id) {
        await mealPlanningService.updateRecipeSelection(weeklyPlan.id, mealSlotIndex, recipeIndex);
      }
    } catch (error) {
      console.error('Failed to save recipe selection:', error);
      // Optionally show an error message to the user
      // For now, the local state update will still work
    }
  };

  const handleGenerateGroceryList = async () => {
    if (!weeklyPlan) return;

    setGroceryLoading(true);
    try {
      // Get selected recipes and their ingredients
      const selectedRecipes = weeklyPlan.meal_slots
        .filter(slot => slot.selected_recipe_index !== undefined)
        .map(slot => slot.recipe_suggestions[slot.selected_recipe_index!]);

      if (selectedRecipes.length === 0) {
        alert('Please select at least one recipe first.');
        return;
      }

      // Create grocery list in the database
      // Since these are AI-generated recipes without IDs, we need to create the grocery list manually
      const groceryListData = await groceryService.createGroceryList({
        meal_plan_id: weeklyPlan.id,
      });

      // Aggregate ingredients from all selected recipes
      const ingredientMap = new Map<string, { quantity: number; unit: string; category: string }>();

      selectedRecipes.forEach(recipe => {
        recipe.ingredients.forEach(ingredient => {
          const key = ingredient.name.toLowerCase();
          const category = categorizeIngredient(ingredient.name);

          if (ingredientMap.has(key)) {
            const existing = ingredientMap.get(key)!;
            if (existing.unit === ingredient.unit) {
              existing.quantity += ingredient.quantity;
            } else {
              // Different units, create separate entry
              const newKey = `${key} (${ingredient.unit})`;
              ingredientMap.set(newKey, {
                quantity: ingredient.quantity,
                unit: ingredient.unit,
                category,
              });
            }
          } else {
            ingredientMap.set(key, {
              quantity: ingredient.quantity,
              unit: ingredient.unit,
              category,
            });
          }
        });
      });

      // Add grocery items to the database
      const groceryItems: GroceryItem[] = [];
      for (const [name, details] of ingredientMap.entries()) {
        const addedItem = await groceryService.addGroceryItem(groceryListData.id, {
          name,
          quantity: details.quantity,
          unit: details.unit,
          category: details.category,
        });
        groceryItems.push(addedItem);
      }

      // Update the grocery list with the added items
      const finalGroceryList: GroceryList = {
        ...groceryListData,
        items: groceryItems,
      };

      setGroceryList(finalGroceryList);
      setActiveTab('grocery'); // Switch to grocery tab instead of changing step
    } catch (error) {
      console.error('Failed to generate grocery list:', error);
      alert('Failed to generate grocery list. Please try again.');
    } finally {
      setGroceryLoading(false);
    }
  };

  const categorizeIngredient = (ingredientName: string): string => {
    const name = ingredientName.toLowerCase();

    const produce = [
      'tomato',
      'onion',
      'garlic',
      'potato',
      'carrot',
      'bell pepper',
      'mushroom',
      'spinach',
      'lettuce',
      'cucumber',
      'avocado',
      'lemon',
      'lime',
      'parsley',
      'basil',
      'cilantro',
      'ginger',
      'apple',
      'banana',
    ];

    const dairy = ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'egg', 'mozzarella', 'parmesan'];

    const meat = [
      'chicken',
      'beef',
      'pork',
      'fish',
      'salmon',
      'shrimp',
      'turkey',
      'bacon',
      'sausage',
    ];

    const pantry = [
      'rice',
      'pasta',
      'flour',
      'sugar',
      'salt',
      'pepper',
      'oil',
      'vinegar',
      'soy sauce',
      'olive oil',
      'bread',
      'beans',
      'lentils',
    ];

    for (const item of produce) {
      if (name.includes(item)) return 'Produce';
    }

    for (const item of dairy) {
      if (name.includes(item)) return 'Dairy';
    }

    for (const item of meat) {
      if (name.includes(item)) return 'Meat & Seafood';
    }

    for (const item of pantry) {
      if (name.includes(item)) return 'Pantry';
    }

    return 'Other';
  };

  const handleToggleGroceryItem = async (itemId: number) => {
    if (!groceryList) return;

    try {
      const item = groceryList.items.find(i => i.id === itemId);
      if (!item) return;

      const updatedItem = await groceryService.toggleGroceryItem(
        groceryList.id,
        itemId,
        !item.checked
      );

      setGroceryList({
        ...groceryList,
        items: groceryList.items.map(i => (i.id === itemId ? updatedItem : i)),
      });
    } catch (error) {
      console.error('Failed to toggle item:', error);
      alert('Failed to update item. Please try again.');
    }
  };

  const handleDeleteGroceryItem = async (itemId: number) => {
    if (!groceryList) return;

    try {
      await groceryService.deleteGroceryItem(groceryList.id, itemId);

      setGroceryList({
        ...groceryList,
        items: groceryList.items.filter(item => item.id !== itemId),
      });
    } catch (error) {
      console.error('Failed to delete item:', error);
      alert('Failed to delete item. Please try again.');
    }
  };

  const getSelectedMealsCount = () => {
    if (!weeklyPlan) return 0;
    return weeklyPlan.meal_slots.filter(slot => slot.selected_recipe_index !== undefined).length;
  };

  const getTotalMealsCount = () => {
    return weeklyPlan?.meal_slots.length || 0;
  };

  const getSlotsWithSelectedRecipes = () => {
    if (!weeklyPlan) return [];
    return weeklyPlan.meal_slots.filter(slot => slot.selected_recipe_index !== undefined);
  };

  const groupSlotsByDay = (slots: MealSlot[]) => {
    const grouped: { [date: string]: MealSlot[] } = {};
    slots.forEach(slot => {
      const dateKey = slot.date;
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(slot);
    });
    return grouped;
  };

  // Notification functions
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
    } catch (error: any) {
      console.error('Failed to send notification:', error);

      // Handle different types of errors with specific messages
      let errorMessage = 'Failed to send grocery notification.';

      if (error.response?.status === 400) {
        errorMessage =
          error.response.data?.detail ||
          'Please check your notification settings and email address.';
      } else if (error.response?.status === 503) {
        errorMessage =
          error.response.data?.detail ||
          'Email service is currently unavailable. Please try again later or contact support.';
      } else if (error.response?.status === 500) {
        errorMessage =
          error.response.data?.detail ||
          'An internal error occurred. Please try again or contact support.';
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
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

  const handleSendWeeklyPlanNotification = async (emails: string[] = []) => {
    if (!weeklyPlan) return;

    setSendingNotification(true);
    setNotificationMessage(null);

    try {
      const validEmails = emails.filter(email => email.trim() !== '');

      // If the meal plan doesn't have an ID (AI-generated), we need to extract and pass the data
      if (!weeklyPlan.id) {
        // Extract recipe data from the AI-generated meal plan for email
        const weeklyRecipes: { [day: string]: Array<{ name: string; meal_type: string }> } = {};

        weeklyPlan.meal_slots.forEach(slot => {
          if (slot.selected_recipe_index !== undefined) {
            const recipe = slot.recipe_suggestions[slot.selected_recipe_index];
            if (recipe) {
              const dayName = new Date(slot.date).toLocaleDateString('en-US', { weekday: 'long' });

              if (!weeklyRecipes[dayName]) {
                weeklyRecipes[dayName] = [];
              }

              weeklyRecipes[dayName].push({
                name: recipe.name,
                meal_type: slot.meal_type.charAt(0).toUpperCase() + slot.meal_type.slice(1),
              });
            }
          }
        });

        // Send a custom request to the backend with the extracted data
        const result = await notificationService.sendWeeklyMealPlanNotification(
          undefined, // No meal plan ID
          validEmails.length > 0 ? validEmails : undefined,
          weeklyRecipes // Pass the extracted recipe data
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
      } else {
        // Use existing logic for saved meal plans
        const result = await notificationService.sendWeeklyMealPlanNotification(
          weeklyPlan.id,
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
      }

      // Clear message after 5 seconds
      setTimeout(() => {
        setNotificationMessage(null);
      }, 5000);
    } catch (error: any) {
      console.error('Failed to send weekly plan notification:', error);

      // Handle different types of errors with specific messages
      let errorMessage = 'Failed to send weekly meal plan notification.';

      if (error.response?.status === 400) {
        errorMessage =
          error.response.data?.detail ||
          'Please check your notification settings and email address.';
      } else if (error.response?.status === 503) {
        errorMessage =
          error.response.data?.detail ||
          'Email service is currently unavailable. Please try again later or contact support.';
      } else if (error.response?.status === 500) {
        errorMessage =
          error.response.data?.detail ||
          'An internal error occurred. Please try again or contact support.';
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
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
    if (notificationType === 'grocery') {
      handleSendNotification(validEmails);
    } else if (notificationType === 'weekly-plan') {
      handleSendWeeklyPlanNotification(validEmails);
    }
    setShowNotificationModal(false);

    // Reset form
    setAdditionalEmails(['']);
    setEmailErrors([]);
  };

  // Loading state for existing meal plan
  if (loadingPlan) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading meal plan...</p>
        </div>
      </div>
    );
  }

  if (step === 'planning' && loading) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="text-center mb-8">
          <SparklesIcon className="mx-auto h-16 w-16 text-orange-500 animate-pulse" />
          <h2 className="mt-4 text-xl font-semibold text-gray-900">🍽️ Weekly Meal Planning</h2>
          <p className="mt-2 text-gray-600">
            Our Hungry Helper chef is crafting your personalized weekly meal plan...
          </p>
        </div>

        {/* Status Display */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
            <p className="text-sm font-medium text-gray-900">{statusMessage}</p>
          </div>

          {/* Progress bar could go here if needed */}
        </div>

        {/* Streaming Content Display */}
        {isStreaming && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                📅 Meal Plan Generation
                {loading && (
                  <span className="ml-2 flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
                  </span>
                )}
              </h3>
            </div>
            <div
              ref={contentRef}
              className="p-6 max-h-96 overflow-y-auto"
              style={{
                lineHeight: '1.6',
                fontSize: '15px',
              }}
            >
              {/* Thinking Display */}
              {isThinking && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <div className="animate-pulse h-2 w-2 bg-blue-500 rounded-full mt-2"></div>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-blue-800 italic">
                        {thinkingContent
                          ? formatThinkingContent(thinkingContent)
                          : 'Hungry Helper is thinking about your meal plan...'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Content Display */}
              {planningContent && (
                <div className="prose prose-sm max-w-none text-gray-700">
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                    {planningContent}
                  </pre>
                </div>
              )}

              {/* Default message when no content yet */}
              {!thinkingContent && !planningContent && (
                <div className="text-gray-500 italic">Starting meal plan generation...</div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (step === 'schedule') {
    return (
      <div className="max-w-3xl mx-auto">
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/meal-planning')}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to Meal Plans
          </button>
        </div>

        <div className="text-center mb-8">
          <CalendarIcon className="mx-auto h-12 w-12 text-orange-500" />
          <h1 className="mt-4 text-3xl font-bold text-gray-900">Plan Your Week</h1>
          <p className="mt-2 text-gray-600">
            Tell us your cooking schedule and preferences, and we'll generate personalized recipe
            suggestions
          </p>
        </div>

        <div className="card p-8">
          <div className="space-y-8">
            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Week Starting Date *
              </label>
              <input
                type="date"
                value={scheduleForm.start_date}
                onChange={e => setScheduleForm({ ...scheduleForm, start_date: e.target.value })}
                className="input w-full max-w-xs"
                required
              />
            </div>

            {/* Cooking Days */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Which days will you cook? *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {daysOfWeek.map(day => (
                  <label
                    key={day}
                    className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={scheduleForm.cooking_days.includes(day)}
                      onChange={e => {
                        if (e.target.checked) {
                          setScheduleForm({
                            ...scheduleForm,
                            cooking_days: [...scheduleForm.cooking_days, day],
                          });
                        } else {
                          setScheduleForm({
                            ...scheduleForm,
                            cooking_days: scheduleForm.cooking_days.filter(d => d !== day),
                          });
                        }
                      }}
                      className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-900 capitalize">{day}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Meal Types */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Which meals do you want to plan? *
              </label>
              <div className="grid grid-cols-2 gap-3">
                {mealTypes.map(mealType => (
                  <label
                    key={mealType}
                    className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={scheduleForm.meal_types.includes(mealType)}
                      onChange={e => {
                        if (e.target.checked) {
                          setScheduleForm({
                            ...scheduleForm,
                            meal_types: [...scheduleForm.meal_types, mealType],
                          });
                        } else {
                          setScheduleForm({
                            ...scheduleForm,
                            meal_types: scheduleForm.meal_types.filter(m => m !== mealType),
                          });
                        }
                      }}
                      className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-900 capitalize">
                      {mealType}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Servings and Difficulty */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Servings
                </label>
                <select
                  value={scheduleForm.servings}
                  onChange={e =>
                    setScheduleForm({ ...scheduleForm, servings: parseInt(e.target.value) })
                  }
                  className="input w-full"
                >
                  <option value={1}>1 person</option>
                  <option value={2}>2 people</option>
                  <option value={4}>4 people</option>
                  <option value={6}>6 people</option>
                  <option value={8}>8 people</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Difficulty Level
                </label>
                <select
                  value={scheduleForm.difficulty}
                  onChange={e => setScheduleForm({ ...scheduleForm, difficulty: e.target.value })}
                  className="input w-full"
                >
                  <option value="">Any difficulty</option>
                  {difficultyLevels.map(level => (
                    <option key={level} value={level.toLowerCase()}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Preferences */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Preferred Cuisines */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Cuisines
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {cuisineOptions.map(cuisine => (
                    <label key={cuisine} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={scheduleForm.preferred_cuisines?.includes(cuisine) || false}
                        onChange={e => {
                          const current = scheduleForm.preferred_cuisines || [];
                          if (e.target.checked) {
                            setScheduleForm({
                              ...scheduleForm,
                              preferred_cuisines: [...current, cuisine],
                            });
                          } else {
                            setScheduleForm({
                              ...scheduleForm,
                              preferred_cuisines: current.filter(c => c !== cuisine),
                            });
                          }
                        }}
                        className="h-3 w-3 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-900">{cuisine}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Dietary Restrictions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dietary Restrictions
                </label>
                <div className="space-y-2">
                  {dietaryOptions.map(restriction => (
                    <label key={restriction} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={scheduleForm.dietary_restrictions?.includes(restriction) || false}
                        onChange={e => {
                          const current = scheduleForm.dietary_restrictions || [];
                          if (e.target.checked) {
                            setScheduleForm({
                              ...scheduleForm,
                              dietary_restrictions: [...current, restriction],
                            });
                          } else {
                            setScheduleForm({
                              ...scheduleForm,
                              dietary_restrictions: current.filter(r => r !== restriction),
                            });
                          }
                        }}
                        className="h-3 w-3 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-900">{restriction}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-6">
              <button
                onClick={handleScheduleSubmit}
                disabled={
                  !scheduleForm.start_date ||
                  scheduleForm.cooking_days.length === 0 ||
                  scheduleForm.meal_types.length === 0
                }
                className="btn-primary"
              >
                <SparklesIcon className="h-4 w-4 mr-2" />
                Generate Meal Plan
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'selection' && weeklyPlan) {
    // For recipe selection, show ALL meal slots, not just selected ones
    const allSlots = viewMode ? getSlotsWithSelectedRecipes() : weeklyPlan.meal_slots;
    const groupedSlots = groupSlotsByDay(allSlots);
    const daysWithRecipes = Object.keys(groupedSlots).sort();

    return (
      <div className="max-w-6xl mx-auto">
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

        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={() => (viewMode ? navigate('/meal-planning') : setStep('schedule'))}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            {viewMode ? 'Back to Meal Plans' : 'Back to Schedule'}
          </button>
        </div>

        <div className="text-center mb-8">
          <StarIcon className="mx-auto h-12 w-12 text-orange-500" />
          <h1 className="mt-4 text-3xl font-bold text-gray-900">
            {viewMode ? 'View Meal Plan' : 'Choose Your Recipes'}
          </h1>
          <p className="mt-2 text-gray-600">
            {viewMode
              ? 'Review your planned meals for the week'
              : 'Select 1 recipe from each set of 3 AI-generated options'}
          </p>

          <div className="mt-4 flex justify-center">
            {viewMode ? (
              <div className="bg-blue-100 rounded-lg px-4 py-2">
                <span className="text-sm font-medium text-blue-800">
                  📅 Saved Plan - {weeklyPlan.name}
                </span>
              </div>
            ) : (
              <div className="bg-orange-100 rounded-lg px-4 py-2">
                <span className="text-sm font-medium text-orange-800">
                  {getSelectedMealsCount()} of {getTotalMealsCount()} meals selected
                </span>
              </div>
            )}
          </div>
        </div>

        {!viewMode && (
          <>
            {/* Recipe Selection Interface */}
            <div className="space-y-8">
              {daysWithRecipes.map(date => (
                <div
                  key={date}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                >
                  <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {new Date(date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </h3>
                  </div>
                  <div className="p-6">
                    {groupedSlots[date].map((mealSlot, slotIndex) => {
                      const mealSlotIndex = weeklyPlan.meal_slots.findIndex(
                        slot => slot.date === mealSlot.date && slot.meal_type === mealSlot.meal_type
                      );

                      return (
                        <div key={slotIndex} className="mb-8">
                          <h4 className="text-md font-medium text-gray-900 mb-4 capitalize flex items-center">
                            <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2.5 py-0.5 rounded-full uppercase tracking-wide mr-2">
                              {mealSlot.meal_type}
                            </span>
                            Choose your {mealSlot.meal_type} recipe:
                          </h4>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {mealSlot.recipe_suggestions?.map((recipe, recipeIndex) => (
                              <div
                                key={recipeIndex}
                                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                                  mealSlot.selected_recipe_index === recipeIndex
                                    ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200'
                                    : 'border-gray-200 hover:border-orange-300 hover:bg-gray-50'
                                }`}
                                onClick={() => handleSelectRecipe(mealSlotIndex, recipeIndex)}
                              >
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1">
                                    <h5 className="font-medium text-gray-900 text-sm leading-tight mb-2">
                                      {recipe.name}
                                    </h5>
                                    <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                                      {recipe.description}
                                    </p>
                                  </div>
                                  {mealSlot.selected_recipe_index === recipeIndex && (
                                    <CheckCircleIconSolid className="h-5 w-5 text-orange-500 flex-shrink-0 ml-2" />
                                  )}
                                </div>

                                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                    {recipe.cuisine || 'Unknown'}
                                  </span>
                                  <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded">
                                    {(recipe.prep_time || 0) + (recipe.cook_time || 0)} min
                                  </span>
                                </div>

                                <div className="flex space-x-2">
                                  <button
                                    onClick={e => {
                                      e.stopPropagation();
                                      handleViewRecipeDetail(recipe, mealSlot);
                                    }}
                                    className="flex-1 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                                  >
                                    View Details
                                  </button>
                                  <button
                                    onClick={e => {
                                      e.stopPropagation();
                                      handleSelectRecipe(mealSlotIndex, recipeIndex);
                                    }}
                                    className="flex-1 px-3 py-2 text-xs font-medium text-orange-700 bg-orange-100 hover:bg-orange-200 rounded transition-colors"
                                  >
                                    {mealSlot.selected_recipe_index === recipeIndex
                                      ? 'Selected'
                                      : 'Select'}
                                  </button>
                                </div>
                              </div>
                            )) || (
                              <div className="col-span-3 text-center py-8 text-gray-500">
                                <p>No recipe suggestions available for this meal.</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Action Buttons */}
              <div className="mt-8 text-center">
                <button
                  onClick={() => setViewMode(true)}
                  disabled={getSelectedMealsCount() === 0}
                  className="btn-primary"
                >
                  Continue to Review ({getSelectedMealsCount()} meals selected)
                </button>
              </div>
            </div>
          </>
        )}

        {/* View Mode - Show Selected Recipes */}
        {viewMode && (
          <>
            {/* Tab Navigation */}
            <div className="mb-8">
              <nav className="flex space-x-8" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab('recipes')}
                  className={`${
                    activeTab === 'recipes'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
                >
                  <StarIcon className="h-5 w-5 mr-2" />
                  Recipes ({getSelectedMealsCount()})
                </button>
                <button
                  onClick={() => setActiveTab('grocery')}
                  className={`${
                    activeTab === 'grocery'
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
                >
                  <ShoppingCartIcon className="h-5 w-5 mr-2" />
                  Grocery List
                  {groceryList && (
                    <span className="ml-1 bg-green-100 text-green-800 text-xs rounded-full px-2 py-1">
                      {groceryList.items.length}
                    </span>
                  )}
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'recipes' && (
              <div className="space-y-8">
                {daysWithRecipes.length === 0 ? (
                  <div className="text-center py-12">
                    <StarIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-lg font-medium text-gray-900">No recipes selected</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      This meal plan has no selected recipes to display.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Selected Recipes by Day */}
                    {daysWithRecipes.map(date => (
                      <div
                        key={date}
                        className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                      >
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {new Date(date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </h3>
                        </div>
                        <div className="p-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {groupedSlots[date].map((mealSlot, slotIndex) => {
                              const recipe =
                                mealSlot.recipe_suggestions?.[mealSlot.selected_recipe_index!];

                              return (
                                <div
                                  key={slotIndex}
                                  className="border rounded-lg p-4 bg-green-50 border-green-200"
                                >
                                  <div className="flex items-start justify-between mb-3">
                                    <div>
                                      <span className="inline-block bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full uppercase tracking-wide mb-2">
                                        {mealSlot.meal_type}
                                      </span>
                                      <h4 className="font-medium text-gray-900 text-sm leading-tight">
                                        {recipe?.name || 'Untitled Recipe'}
                                      </h4>
                                    </div>
                                    <CheckCircleIconSolid className="h-5 w-5 text-green-500 flex-shrink-0" />
                                  </div>

                                  <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                                    {recipe?.description || 'No description available'}
                                  </p>

                                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                      {recipe?.cuisine || 'Unknown'}
                                    </span>
                                    <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded">
                                      {(recipe?.prep_time || 0) + (recipe?.cook_time || 0)} min
                                    </span>
                                  </div>

                                  <div className="flex space-x-2">
                                    <button
                                      onClick={() => handleViewRecipeDetail(recipe, mealSlot)}
                                      className="flex-1 px-3 py-2 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded transition-colors"
                                    >
                                      View Details
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Action Buttons for Recipes Tab */}
                    <div className="mt-8 text-center space-y-4">
                      {!groceryList && (
                        <button
                          onClick={handleGenerateGroceryList}
                          disabled={getSelectedMealsCount() === 0 || groceryLoading}
                          className="btn-primary"
                        >
                          {groceryLoading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Generating Grocery List...
                            </>
                          ) : (
                            <>
                              <ShoppingCartIcon className="h-4 w-4 mr-2" />
                              Generate Grocery List ({getSelectedMealsCount()} meals)
                            </>
                          )}
                        </button>
                      )}

                      {groceryList && (
                        <div className="flex justify-center space-x-4">
                          <button
                            onClick={() => setActiveTab('grocery')}
                            className="btn-secondary flex items-center"
                          >
                            <ShoppingCartIcon className="h-4 w-4 mr-2" />
                            View Grocery List ({groceryList.items.length} items)
                          </button>
                          <button
                            onClick={() => {
                              setNotificationType('weekly-plan');
                              handleSendWeeklyPlanNotification();
                            }}
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
                                Email Weekly Plan
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'grocery' && (
              <div>
                {!groceryList ? (
                  <div className="text-center py-12">
                    <ShoppingCartIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-lg font-medium text-gray-900">
                      No grocery list generated
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Generate a grocery list from your selected recipes to start shopping.
                    </p>
                    <div className="mt-6">
                      <button
                        onClick={handleGenerateGroceryList}
                        disabled={getSelectedMealsCount() === 0 || groceryLoading}
                        className="btn-primary"
                      >
                        {groceryLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Generating...
                          </>
                        ) : (
                          <>
                            <ShoppingCartIcon className="h-4 w-4 mr-2" />
                            Generate Grocery List ({getSelectedMealsCount()} meals)
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Grocery List Content */}
                    {(() => {
                      const groupedItems = groceryList.items.reduce(
                        (groups, item) => {
                          const category = item.category || 'Other';
                          if (!groups[category]) {
                            groups[category] = [];
                          }
                          groups[category].push(item);
                          return groups;
                        },
                        {} as { [category: string]: GroceryItem[] }
                      );

                      const categories = Object.keys(groupedItems).sort();
                      const completedItems = groceryList.items.filter(item => item.checked).length;
                      const totalItems = groceryList.items.length;
                      const completionPercentage =
                        totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

                      return (
                        <div>
                          <div className="text-center mb-8">
                            <ShoppingCartIcon className="mx-auto h-12 w-12 text-green-500" />
                            <h2 className="mt-4 text-2xl font-bold text-gray-900">
                              Your Grocery List
                            </h2>
                            <p className="mt-2 text-gray-600">
                              Generated from your weekly meal plan
                            </p>
                            <div className="mt-4 flex justify-center">
                              <div className="bg-green-100 rounded-lg px-4 py-2">
                                <span className="text-sm font-medium text-green-800">
                                  {completedItems} of {totalItems} items completed (
                                  {completionPercentage}%)
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="mb-8 bg-white rounded-lg shadow p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700">
                                Shopping Progress
                              </span>
                              <span className="text-sm text-gray-500">
                                {completionPercentage}% complete
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${completionPercentage}%` }}
                              />
                            </div>
                          </div>

                          {/* Enhanced Action Buttons */}
                          <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <button
                              onClick={() => setActiveTab('recipes')}
                              className="btn-secondary flex items-center"
                            >
                              <ArrowLeftIcon className="h-4 w-4 mr-2" />
                              Back to Recipes
                            </button>

                            <div className="flex flex-col sm:flex-row gap-3">
                              {/* Notification Buttons */}
                              <div className="relative">
                                <div className="flex">
                                  {/* Main Send Button */}
                                  <button
                                    onClick={() => {
                                      setNotificationType('weekly-plan');
                                      handleSendWeeklyPlanNotification();
                                    }}
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
                                        Email Weekly Plan
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
                                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                                    <div className="py-2">
                                      <button
                                        onClick={() => {
                                          setNotificationType('weekly-plan');
                                          setShowSendDropdown(false);
                                          setShowNotificationModal(true);
                                        }}
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 flex flex-col"
                                      >
                                        <div className="flex items-center">
                                          <span className="text-lg mr-3">📅</span>
                                          <span className="font-medium">
                                            Send Complete Weekly Plan
                                          </span>
                                        </div>
                                        <span className="text-xs text-gray-500 ml-8 mt-1">
                                          Recipe names + grocery list
                                        </span>
                                      </button>
                                      <button
                                        onClick={() => {
                                          setNotificationType('grocery');
                                          setShowSendDropdown(false);
                                          setShowNotificationModal(true);
                                        }}
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 flex flex-col"
                                      >
                                        <div className="flex items-center">
                                          <span className="text-lg mr-3">🛒</span>
                                          <span className="font-medium">
                                            Send Grocery List Only
                                          </span>
                                        </div>
                                        <span className="text-xs text-gray-500 ml-8 mt-1">
                                          Shopping list only
                                        </span>
                                      </button>
                                      <div className="border-t border-gray-100 my-1"></div>
                                      <div className="px-4 py-2 text-xs text-gray-500">
                                        Quick send goes to your account email
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Click outside to close dropdown */}
                                {showSendDropdown && (
                                  <div
                                    className="fixed inset-0 z-0"
                                    onClick={() => setShowSendDropdown(false)}
                                  ></div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Grocery Items by Category */}
                          {categories.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-lg shadow">
                              <ShoppingCartIcon className="mx-auto h-12 w-12 text-gray-400" />
                              <h3 className="mt-2 text-sm font-medium text-gray-900">No items</h3>
                              <p className="mt-1 text-sm text-gray-500">
                                No grocery items were generated.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-6">
                              {categories.map(category => (
                                <div key={category} className="bg-white rounded-lg shadow">
                                  <div className="px-4 py-3 border-b border-gray-200">
                                    <h3 className="text-lg font-medium text-gray-900">
                                      {category}
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                      {groupedItems[category].filter(item => item.checked).length}{' '}
                                      of {groupedItems[category].length} completed
                                    </p>
                                  </div>
                                  <div className="divide-y divide-gray-200">
                                    {groupedItems[category].map(item => (
                                      <div key={item.id} className="px-4 py-3 flex items-center">
                                        <button
                                          onClick={() => handleToggleGroceryItem(item.id)}
                                          className={`flex-shrink-0 h-5 w-5 rounded border-2 flex items-center justify-center mr-3 transition-colors duration-200 ${
                                            item.checked
                                              ? 'bg-green-500 border-green-500 text-white'
                                              : 'border-gray-300 hover:border-green-400'
                                          }`}
                                        >
                                          {item.checked && (
                                            <CheckCircleIconSolid className="h-3 w-3" />
                                          )}
                                        </button>

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

                                        <button
                                          onClick={() => handleDeleteGroceryItem(item.id)}
                                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                                        >
                                          <TrashIcon className="h-4 w-4" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // Recipe Detail Modal
  if (selectedRecipeDetail) {
    const { recipe, slotInfo } = selectedRecipeDetail;

    if (!recipe) {
      return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border max-w-md shadow-lg rounded-md bg-white">
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Recipe Not Found</h3>
              <p className="text-gray-600 mb-4">The recipe details could not be loaded.</p>
              <button onClick={() => setSelectedRecipeDetail(null)} className="btn-primary">
                Close
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border max-w-4xl shadow-lg rounded-md bg-white">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                {recipe?.name || 'Untitled Recipe'}
              </h3>
              <p className="text-sm text-gray-500">
                {new Date(slotInfo.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}{' '}
                - {slotInfo.mealType}
              </p>
            </div>
            <button
              onClick={() => setSelectedRecipeDetail(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recipe Info */}
            <div className="lg:col-span-2">
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Description</h4>
                <p className="text-gray-700">{recipe?.description || 'No description available'}</p>
              </div>

              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Instructions</h4>
                <ol className="space-y-3">
                  {recipe?.instructions?.map((step, index) => (
                    <li key={index} className="flex">
                      <span className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center justify-center mr-3 mt-0.5">
                        {index + 1}
                      </span>
                      <span className="text-gray-700">{step}</span>
                    </li>
                  )) || <li className="text-gray-500 italic">No instructions available</li>}
                </ol>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Recipe Stats */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-semibold text-gray-900 mb-3">Recipe Details</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cuisine:</span>
                    <span className="font-medium">{recipe?.cuisine || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Difficulty:</span>
                    <span className="font-medium">{recipe?.difficulty || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Prep Time:</span>
                    <span className="font-medium">{recipe?.prep_time || 0} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cook Time:</span>
                    <span className="font-medium">{recipe?.cook_time || 0} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Servings:</span>
                    <span className="font-medium">{recipe?.servings || 0}</span>
                  </div>
                  {recipe?.nutrition && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Calories:</span>
                      <span className="font-medium">{recipe.nutrition.calories}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Ingredients */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-semibold text-gray-900 mb-3">Ingredients</h5>
                <ul className="space-y-2">
                  {recipe?.ingredients?.map((ingredient, index) => (
                    <li key={index} className="flex justify-between text-sm">
                      <span className="text-gray-700">
                        {ingredient?.name || 'Unknown ingredient'}
                      </span>
                      <span className="text-gray-600 font-medium">
                        {ingredient?.quantity || 0} {ingredient?.unit || ''}
                      </span>
                    </li>
                  )) || <li className="text-gray-500 italic">No ingredients available</li>}
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button onClick={() => setSelectedRecipeDetail(null)} className="btn-secondary">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  {
    /* Send Notification Modal */
  }
  {
    showNotificationModal && (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-md shadow-lg rounded-md bg-white">
          <div className="mt-3">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {notificationType === 'weekly-plan' ? 'Send Weekly Meal Plan' : 'Send Grocery List'}
            </h3>

            <p className="text-sm text-gray-600 mb-4">
              {notificationType === 'weekly-plan'
                ? 'Send your complete weekly meal plan with recipe names and grocery list to additional email addresses.'
                : 'Send your grocery list to additional email addresses. The email will include all unchecked items organized by category.'}
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
                    {notificationType === 'weekly-plan' ? 'Send Plan' : 'Send List'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
