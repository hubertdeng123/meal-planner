import type { ReactNode } from 'react';
import type { IngredientRules, UserPreferences } from '../types';
import { ChipInput } from './ui/ChipInput';
import { ChoiceChips, MultiChoiceChips } from './ui/ChoiceChips';
import { PreferenceNumberInput } from './ui/PreferenceNumberInput';
import { PreferenceToggle } from './ui/PreferenceToggle';

const CUISINES = [
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
  'Vietnamese',
  'Greek',
  'Middle Eastern',
  'Spanish',
  'German',
  'British',
];
const DIETARY_RESTRICTIONS = [
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
  'Dairy-Free',
  'Keto',
  'Paleo',
  'Low-Carb',
  'Nut-Free',
  'Kosher',
  'Halal',
  'Low-Sodium',
  'Diabetic',
  'Heart-Healthy',
];
const PROTEINS = [
  'Chicken',
  'Beef',
  'Pork',
  'Fish',
  'Seafood',
  'Turkey',
  'Lamb',
  'Tofu',
  'Tempeh',
  'Beans',
  'Lentils',
  'Eggs',
];
const COOKING_METHODS = [
  'Grilling',
  'Baking',
  'Roasting',
  'Stir-frying',
  'Steaming',
  'Sauteing',
  'Boiling',
  'Braising',
  'Slow cooking',
  'Pressure cooking',
  'Air frying',
  'Deep frying',
];
const COMMON_INGREDIENTS = [
  'Garlic',
  'Onion',
  'Tomato',
  'Bell peppers',
  'Mushrooms',
  'Spinach',
  'Broccoli',
  'Carrots',
  'Ginger',
  'Lemon',
  'Cilantro',
  'Coconut milk',
];
const FLAVOR_PROFILES = [
  'Savory',
  'Sweet',
  'Umami',
  'Fresh/Citrusy',
  'Rich/Creamy',
  'Smoky',
  'Tangy',
  'Earthy',
  'Aromatic',
  'Comfort Food',
  'Light & Clean',
  'Bold & Robust',
];
const NUTRITIONAL_NEEDS = [
  'High-protein',
  'Low-carb',
  'High-fiber',
  'Heart-healthy',
  'Weight-loss',
  'Muscle-building',
  'Anti-inflammatory',
  'Immune-boosting',
  'Energy-boosting',
];
const HEALTH_CONDITIONS = [
  'Diabetes',
  'Heart disease',
  'High blood pressure',
  'High cholesterol',
  'Digestive issues',
  'Arthritis',
  'Food allergies',
  'Celiac disease',
];
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const ETHICAL_CHOICES = [
  'Organic',
  'Local/Seasonal',
  'Fair Trade',
  'Sustainable Seafood',
  'Grass-fed',
  'Free-range',
];
const RELIGIOUS_DIETARY_LAWS = [
  'Kosher',
  'Halal',
  'Hindu Vegetarian',
  'Jain',
  'Buddhist Vegetarian',
];

type SpiceLevel = NonNullable<UserPreferences['food_preferences']['preferred_spice_level']>;

const SPICE_LEVELS: Array<{ value: SpiceLevel; label: string }> = [
  { value: 'none', label: 'No heat' },
  { value: 'mild', label: 'Mild' },
  { value: 'medium', label: 'Medium' },
  { value: 'hot', label: 'Hot' },
  { value: 'very_hot', label: 'Very hot' },
];

const INGREDIENT_GROUPS: Array<{
  key: keyof IngredientRules;
  label: string;
  hint: string;
  tone: 'primary' | 'danger';
}> = [
  { key: 'preferred', label: 'Love', hint: 'Show up more often.', tone: 'primary' },
  {
    key: 'must_include',
    label: 'Use regularly',
    hint: 'Work these in most weeks.',
    tone: 'primary',
  },
  { key: 'disliked', label: 'Rather not', hint: 'Avoid when there is a choice.', tone: 'danger' },
  { key: 'must_avoid', label: 'Never', hint: 'Allergies and hard nos.', tone: 'danger' },
];

interface PreferenceSectionProps {
  preferences: UserPreferences;
  onChange: (preferences: UserPreferences) => void;
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-5 border-t border-stone-100 pt-5 first:border-t-0 first:pt-0">
      <legend className="sr-only">{title}</legend>
      {children}
    </fieldset>
  );
}

export function TastePreferences({ preferences, onChange }: PreferenceSectionProps) {
  const food = preferences.food_preferences;
  const types = preferences.food_type_rules;
  const setFood = (patch: Partial<typeof food>) =>
    onChange({ ...preferences, food_preferences: { ...food, ...patch } });
  const setTypes = (patch: Partial<typeof types>) =>
    onChange({ ...preferences, food_type_rules: { ...types, ...patch } });

  return (
    <div className="space-y-5">
      <Group title="Flavour">
        <MultiChoiceChips
          label="Cuisines you love"
          options={CUISINES}
          values={food.cuisines}
          onChange={cuisines => setFood({ cuisines })}
        />
        <ChoiceChips
          label="Spice level"
          size="sm"
          options={SPICE_LEVELS}
          value={food.preferred_spice_level ?? 'medium'}
          onChange={preferred_spice_level => setFood({ preferred_spice_level })}
        />
        <MultiChoiceChips
          label="Flavours"
          options={FLAVOR_PROFILES}
          values={food.flavor_profiles ?? []}
          onChange={flavor_profiles => setFood({ flavor_profiles })}
        />
      </Group>
      <Group title="Diet">
        <MultiChoiceChips
          label="Dietary needs"
          options={DIETARY_RESTRICTIONS}
          values={preferences.dietary_restrictions}
          onChange={dietary_restrictions => onChange({ ...preferences, dietary_restrictions })}
        />
        <MultiChoiceChips
          label="Proteins"
          options={PROTEINS}
          values={types.protein_preferences}
          onChange={protein_preferences => setTypes({ protein_preferences })}
        />
      </Group>
      <Group title="Cooking">
        <MultiChoiceChips
          label="Cooking methods you enjoy"
          options={COOKING_METHODS}
          values={types.cooking_methods_preferred}
          onChange={cooking_methods_preferred => setTypes({ cooking_methods_preferred })}
        />
        <ChoiceChips
          label="Recipe complexity"
          size="sm"
          options={[
            { value: 'simple', label: 'Simple', hint: 'few steps' },
            { value: 'medium', label: 'Balanced' },
            { value: 'complex', label: 'Ambitious', hint: 'new techniques' },
          ]}
          value={types.meal_complexity_preference}
          onChange={meal_complexity_preference => setTypes({ meal_complexity_preference })}
        />
      </Group>
    </div>
  );
}

export function IngredientPreferences({ preferences, onChange }: PreferenceSectionProps) {
  const rules = preferences.ingredient_rules;

  const setGroup = (key: keyof IngredientRules, names: string[]) => {
    const reasons = new Map(rules[key].map(rule => [rule.ingredient.toLowerCase(), rule.reason]));
    onChange({
      ...preferences,
      ingredient_rules: {
        ...rules,
        [key]: names.map(ingredient => ({
          ingredient,
          reason: reasons.get(ingredient.toLowerCase()) ?? 'Personal preference',
        })),
      },
    });
  };

  const used = new Set(
    INGREDIENT_GROUPS.flatMap(group => rules[group.key].map(rule => rule.ingredient.toLowerCase()))
  );
  const suggestions = COMMON_INGREDIENTS.filter(item => !used.has(item.toLowerCase()));

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {INGREDIENT_GROUPS.map((group, index) => (
        <ChipInput
          key={group.key}
          label={group.label}
          hint={group.hint}
          tone={group.tone}
          values={rules[group.key].map(rule => rule.ingredient)}
          onChange={names => setGroup(group.key, names)}
          placeholder="Add an ingredient"
          suggestions={index === 0 ? suggestions.slice(0, 8) : undefined}
          suggestionsLabel="Try"
        />
      ))}
    </div>
  );
}

export function RoutinePreferences({ preferences, onChange }: PreferenceSectionProps) {
  const rules = preferences.scheduling_rules;
  const set = (patch: Partial<typeof rules>) =>
    onChange({ ...preferences, scheduling_rules: { ...rules, ...patch } });

  return (
    <div className="space-y-5">
      <MultiChoiceChips
        label="Days you usually cook"
        options={DAYS_OF_WEEK}
        values={rules.preferred_cooking_days}
        onChange={preferred_cooking_days => set({ preferred_cooking_days })}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <PreferenceNumberInput
          label="Weeknight time limit"
          unit="min"
          placeholder="30"
          value={rules.max_prep_time_weekdays}
          onChange={max_prep_time_weekdays => set({ max_prep_time_weekdays })}
        />
        <PreferenceNumberInput
          label="Weekend time limit"
          unit="min"
          placeholder="60"
          value={rules.max_prep_time_weekends}
          onChange={max_prep_time_weekends => set({ max_prep_time_weekends })}
        />
      </div>
      <ChoiceChips
        label="Leftovers"
        size="sm"
        options={[
          { value: 'low', label: 'Fresh every night' },
          { value: 'medium', label: 'Now and then' },
          { value: 'high', label: 'Happy to repeat' },
        ]}
        value={rules.leftover_tolerance}
        onChange={leftover_tolerance => set({ leftover_tolerance })}
      />
      <PreferenceToggle
        label="Batch cooking"
        description="Favour recipes that scale up and keep well."
        checked={rules.batch_cooking_preference}
        onChange={batch_cooking_preference => set({ batch_cooking_preference })}
      />
    </div>
  );
}

export function NutritionPreferences({ preferences, onChange }: PreferenceSectionProps) {
  const rules = preferences.nutritional_rules;
  const dietary = preferences.dietary_rules;
  const set = (patch: Partial<typeof rules>) =>
    onChange({ ...preferences, nutritional_rules: { ...rules, ...patch } });
  const setDietary = (patch: Partial<typeof dietary>) =>
    onChange({ ...preferences, dietary_rules: { ...dietary, ...patch } });
  const macros = rules.macro_targets ?? {};

  return (
    <div className="space-y-5">
      <Group title="Targets">
        <div className="grid gap-4 sm:grid-cols-4">
          <PreferenceNumberInput
            label="Calories"
            unit="kcal"
            placeholder="2000"
            value={rules.daily_calorie_target}
            onChange={daily_calorie_target => set({ daily_calorie_target })}
          />
          <PreferenceNumberInput
            label="Protein"
            unit="g"
            placeholder="120"
            value={macros.protein_g}
            onChange={protein_g => set({ macro_targets: { ...macros, protein_g } })}
          />
          <PreferenceNumberInput
            label="Carbs"
            unit="g"
            placeholder="200"
            value={macros.carbs_g}
            onChange={carbs_g => set({ macro_targets: { ...macros, carbs_g } })}
          />
          <PreferenceNumberInput
            label="Fat"
            unit="g"
            placeholder="67"
            value={macros.fat_g}
            onChange={fat_g => set({ macro_targets: { ...macros, fat_g } })}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <PreferenceNumberInput
            label="Max sodium"
            unit="mg"
            placeholder="2300"
            value={rules.max_sodium_mg}
            onChange={max_sodium_mg => set({ max_sodium_mg })}
          />
          <PreferenceNumberInput
            label="Min fibre"
            unit="g"
            placeholder="25"
            value={rules.min_fiber_g}
            onChange={min_fiber_g => set({ min_fiber_g })}
          />
          <PreferenceNumberInput
            label="Max sugar"
            unit="g"
            placeholder="50"
            value={rules.max_sugar_g}
            onChange={max_sugar_g => set({ max_sugar_g })}
          />
        </div>
        <p className="helper-text mt-0">Daily amounts. Leave blank for no target.</p>
        <MultiChoiceChips
          label="Goals"
          options={NUTRITIONAL_NEEDS}
          values={rules.special_nutritional_needs}
          onChange={special_nutritional_needs => set({ special_nutritional_needs })}
        />
      </Group>
      <Group title="Health and values">
        <MultiChoiceChips
          label="Health considerations"
          options={HEALTH_CONDITIONS}
          values={dietary.health_conditions}
          onChange={health_conditions => setDietary({ health_conditions })}
        />
        <MultiChoiceChips
          label="Sourcing"
          options={ETHICAL_CHOICES}
          values={dietary.ethical_choices}
          onChange={ethical_choices => setDietary({ ethical_choices })}
        />
        <MultiChoiceChips
          label="Religious dietary laws"
          options={RELIGIOUS_DIETARY_LAWS}
          values={dietary.religious_dietary_laws}
          onChange={religious_dietary_laws => setDietary({ religious_dietary_laws })}
        />
      </Group>
    </div>
  );
}
