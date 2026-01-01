import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  SparklesIcon,
  BookOpenIcon,
  ArrowRightIcon,
  FireIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline';
import recipeService from '../services/recipe.service';
import type { Recipe } from '../types';

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
      <section className="relative overflow-hidden rounded-[32px] border-2 border-orange-200/70 bg-gradient-to-br from-orange-50 via-amber-50 to-rose-50 p-6 shadow-sm md:p-10">
        <div className="absolute right-8 top-6 h-20 w-20 rounded-full bg-orange-200/40 blur-2xl" />
        <div className="absolute bottom-6 left-6 h-16 w-16 rounded-full bg-rose-200/40 blur-2xl" />
        <div className="absolute inset-0 opacity-50 [background-image:radial-gradient(#fdba74_1px,transparent_1px)] [background-size:18px_18px]" />

        <div className="relative grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-200/70 bg-white/80 px-4 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-orange-600 shadow-sm">
              Hungry Helper HQ
            </span>
            <h1 className="text-4xl font-semibold text-orange-950 md:text-5xl">
              Welcome back. Ready to cook up something delightful?
            </h1>
            <p className="text-lg text-slate-600">
              Spin up recipes that match your cravings, ingredients, and kitchen energy. You’re one
              click away from a new favorite.
            </p>
            <div className="rounded-2xl border border-orange-200/70 bg-white/70 px-4 py-3 text-sm text-slate-600">
              Pick a quick action below to jump in.
            </div>
            <div className="flex flex-wrap gap-3 text-xs">
              <div className="rounded-full border border-orange-200/70 bg-white/70 px-3 py-2 font-semibold text-orange-700">
                {totalRecipes} recipes in your cookbook
              </div>
              <div className="rounded-full border border-amber-200/70 bg-white/70 px-3 py-2 font-semibold text-amber-700">
                Avg time: {avgCookTime > 0 ? `${avgCookTime} min` : 'not yet'}
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-orange-200/70 bg-white/80 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                Kitchen snapshot
              </p>
              <FireIcon className="h-5 w-5 text-orange-500" />
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-orange-500"></div>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-orange-100/70 bg-orange-50/60 px-4 py-3">
                  <p className="text-xs font-semibold text-slate-500">Total recipes</p>
                  <p className="text-2xl font-semibold text-orange-950">{totalRecipes}</p>
                </div>
                <div className="rounded-2xl border border-emerald-100/70 bg-emerald-50/60 px-4 py-3">
                  <p className="text-xs font-semibold text-slate-500">Most loved tag</p>
                  <p className="text-lg font-semibold text-slate-800 capitalize">
                    {favoriteCuisine}
                  </p>
                </div>
                <div className="rounded-2xl border border-sky-100/70 bg-sky-50/60 px-4 py-3">
                  <p className="text-xs font-semibold text-slate-500">Average cook time</p>
                  <p className="text-lg font-semibold text-slate-800">
                    {avgCookTime > 0 ? `${avgCookTime} minutes` : 'No data yet'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-slate-900">Quick picks</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Link
              to="/generate"
              className="group relative overflow-hidden rounded-3xl border border-orange-200/70 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-orange-300/80"
            >
              <div className="absolute -right-6 top-6 h-20 w-20 rounded-full bg-orange-100/70 blur-2xl" />
              <div className="relative space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
                    <SparklesIcon className="h-6 w-6" />
                  </div>
                  <ArrowRightIcon className="h-5 w-5 text-orange-400 transition-all duration-300 group-hover:translate-x-1" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Generate recipe</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Spin up a personalized recipe in minutes.
                  </p>
                </div>
              </div>
            </Link>

            <Link
              to="/recipes"
              className="group relative overflow-hidden rounded-3xl border border-blue-200/70 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-300/80"
            >
              <div className="absolute -right-6 top-6 h-20 w-20 rounded-full bg-blue-100/70 blur-2xl" />
              <div className="relative space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                    <BookOpenIcon className="h-6 w-6" />
                  </div>
                  <ArrowRightIcon className="h-5 w-5 text-blue-400 transition-all duration-300 group-hover:translate-x-1" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Browse recipes</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Revisit the hits and rate your favorites.
                  </p>
                </div>
              </div>
            </Link>

            <Link
              to="/grocery"
              className="group relative overflow-hidden rounded-3xl border border-emerald-200/70 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300/80 sm:col-span-2"
            >
              <div className="absolute -right-6 top-6 h-20 w-20 rounded-full bg-emerald-100/70 blur-2xl" />
              <div className="relative space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                    <ShoppingBagIcon className="h-6 w-6" />
                  </div>
                  <ArrowRightIcon className="h-5 w-5 text-emerald-400 transition-all duration-300 group-hover:translate-x-1" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Build a grocery list</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Turn your recipes into an organized shopping plan.
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-orange-200/60 bg-white/80 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Latest recipes</h2>
            <Link to="/recipes" className="btn-secondary text-sm">
              View all
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-orange-500"></div>
            </div>
          ) : recipes.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-orange-200/70 bg-orange-50/70 p-6 text-center">
              <p className="text-sm text-slate-600">
                Your latest recipes will show up here once you create them.
              </p>
              <Link to="/generate" className="btn-primary mt-4 inline-flex">
                Generate your first recipe
              </Link>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {recipes.slice(0, 3).map(recipe => (
                <Link
                  key={recipe.id}
                  to={`/recipes/${recipe.id}`}
                  className="group flex items-start justify-between rounded-2xl border border-slate-200/70 bg-white px-4 py-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-orange-200/70"
                >
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-900">{recipe.name}</p>
                    <div className="flex flex-wrap gap-2">
                      {recipe.tags.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          className="rounded-full bg-orange-50 px-2 py-1 text-[0.65rem] font-semibold text-orange-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <ArrowRightIcon className="h-4 w-4 text-slate-400 transition-all duration-300 group-hover:translate-x-1 group-hover:text-orange-400" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
