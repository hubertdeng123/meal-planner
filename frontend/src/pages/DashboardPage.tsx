import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRightIcon,
  SparkleWandIcon,
  RecipeBookIcon,
  ShoppingCartCheckIcon,
  FireStatsIcon,
} from '../components/ui/AppIcons';
import recipeService from '../services/recipe.service';
import type { Recipe } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { SectionCard } from '../components/ui/SectionCard';
import { StatPill } from '../components/ui/StatPill';

export default function DashboardPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    try {
      const data = await recipeService.getRecipes(0, 100); // Get up to 100 recipes for stats
      setRecipes(data);
    } catch (error) {
      console.error('Failed to load recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats from recipes
  const totalRecipes = recipes.length;

  // Find favorite cuisine from tags
  const cuisineCounts = recipes.reduce(
    (acc, recipe) => {
      recipe.tags.forEach(tag => {
        acc[tag] = (acc[tag] || 0) + 1;
      });
      return acc;
    },
    {} as Record<string, number>
  );

  const favoriteCuisine = Object.entries(cuisineCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';

  // Calculate average cook time
  const avgCookTime =
    recipes.length > 0
      ? Math.round(
          recipes.reduce(
            (sum, r) => sum + (r.prep_time_minutes || 0) + (r.cook_time_minutes || 0),
            0
          ) / recipes.length
        )
      : 0;

  return (
    <div className="space-y-10">
      <SectionCard className="relative overflow-hidden" bare>
        <div className="p-6 md:p-10">
          <PageHeader
            noMargin
            title="Ready to make dinner a little more fun?"
            subtitle="Match what you want, what you have, and how much energy you feel like spending."
            actions={
              <Link to="/generate" className="btn-primary">
                Start with a recipe
              </Link>
            }
          />
        </div>
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5 px-6 pb-6 md:px-10 md:pb-10">
            <div className="rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 text-sm text-slate-600">
              Pick a launchpad to get moving.
            </div>
            <div className="flex flex-wrap gap-3 text-xs">
              <div className="chip">{totalRecipes} recipes in your vault</div>
              <div className="chip">
                Avg time: {avgCookTime > 0 ? `${avgCookTime} min` : 'still warming up'}
              </div>
            </div>
          </div>

          <div className="surface mx-6 mb-6 p-6 md:mx-10 md:mb-10">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                Snapshot
              </p>
              <FireStatsIcon size={28} />
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div
                  className="h-8 w-8 animate-spin rounded-full border-b-2"
                  style={{ borderBottomColor: 'var(--primary)' }}
                ></div>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                <StatPill
                  label="Total recipes"
                  value={totalRecipes}
                  tone="warm"
                  className="opacity-0 animate-slide-in-up"
                  style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}
                />
                <StatPill
                  label="Most cooked tag"
                  value={<span className="capitalize">{favoriteCuisine}</span>}
                  tone="success"
                  className="opacity-0 animate-slide-in-up"
                  style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}
                />
                <StatPill
                  label="Average cook time"
                  value={avgCookTime > 0 ? `${avgCookTime} minutes` : 'No data yet'}
                  className="opacity-0 animate-slide-in-up"
                  style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}
                />
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="section-title">Quick picks</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Link
              to="/generate"
              className="group relative overflow-hidden rounded-3xl border border-stone-200/70 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-stone-300 opacity-0 animate-slide-in-up"
              style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}
            >
              <div className="relative space-y-4">
                <div className="flex items-center justify-between">
                  <div className="icon-container-premium icon-container-orange">
                    <SparkleWandIcon size={26} />
                  </div>
                  <ArrowRightIcon className="h-5 w-5 text-stone-400 transition-all duration-300 group-hover:translate-x-1 group-hover:text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-stone-900">Whip up a recipe</h3>
                  <p className="mt-2 text-sm text-stone-600">Get a fresh recipe in minutes.</p>
                </div>
              </div>
            </Link>

            <Link
              to="/recipes"
              className="group relative overflow-hidden rounded-3xl border border-stone-200/70 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-stone-300 opacity-0 animate-slide-in-up"
              style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}
            >
              <div className="relative space-y-4">
                <div className="flex items-center justify-between">
                  <div className="icon-container-premium icon-container-amber">
                    <RecipeBookIcon size={26} />
                  </div>
                  <ArrowRightIcon className="h-5 w-5 text-stone-400 transition-all duration-300 group-hover:translate-x-1 group-hover:text-amber-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-stone-900">Browse recipes</h3>
                  <p className="mt-2 text-sm text-stone-600">
                    Revisit the hits and rate your faves.
                  </p>
                </div>
              </div>
            </Link>

            <Link
              to="/grocery"
              className="group relative overflow-hidden rounded-3xl border border-stone-200/70 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-stone-300 sm:col-span-2 opacity-0 animate-slide-in-up"
              style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}
            >
              <div className="relative space-y-4">
                <div className="flex items-center justify-between">
                  <div className="icon-container-premium icon-container-emerald">
                    <ShoppingCartCheckIcon size={26} />
                  </div>
                  <ArrowRightIcon className="h-5 w-5 text-stone-400 transition-all duration-300 group-hover:translate-x-1 group-hover:text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-stone-900">Build a grocery list</h3>
                  <p className="mt-2 text-sm text-stone-600">
                    Turn recipes into a tidy shopping plan.
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        <div className="surface p-6">
          <div className="flex items-center justify-between">
            <h2 className="section-title">Latest recipes</h2>
            <Link to="/recipes" className="btn-secondary text-sm">
              View all
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div
                className="h-8 w-8 animate-spin rounded-full border-b-2"
                style={{ borderBottomColor: 'var(--primary)' }}
              ></div>
            </div>
          ) : recipes.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-stone-200/70 bg-stone-50 p-6 text-center">
              <p className="text-sm text-stone-600">
                Your newest recipes will land here once you make a few.
              </p>
              <Link to="/generate" className="btn-primary mt-4 inline-flex">
                Make your first recipe
              </Link>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {recipes.slice(0, 3).map((recipe, index) => (
                <Link
                  key={recipe.id}
                  to={`/recipes/${recipe.id}`}
                  className="group flex items-start justify-between rounded-2xl border border-stone-200/70 bg-white px-4 py-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-stone-300 opacity-0 animate-slide-in-up"
                  style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'forwards' }}
                >
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-stone-900">{recipe.name}</p>
                    <div className="flex flex-wrap gap-2">
                      {recipe.tags.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          className="rounded-full px-2 py-1 text-[0.65rem] font-semibold"
                          style={{
                            backgroundColor: 'var(--primary-soft)',
                            color: 'var(--primary-hover)',
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <ArrowRightIcon className="h-4 w-4 text-stone-400 transition-all duration-300 group-hover:translate-x-1" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
