import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CalendarMealIcon, GroceryBagIcon, HungryHelperLogo, SparklesIcon } from './ui/AppIcons';

const highlights = [
  {
    icon: SparklesIcon,
    title: 'Recipes that fit your week',
    body: 'Generated around your pantry, preferences, and the time you actually have.',
  },
  {
    icon: CalendarMealIcon,
    title: 'A plan you can stick to',
    body: 'Fill breakfast, lunch, and dinner slots in minutes, with smart autofill.',
  },
  {
    icon: GroceryBagIcon,
    title: 'Lists that build themselves',
    body: 'Ingredients merged and sorted by aisle, ready for the store.',
  },
];

interface AuthLayoutProps {
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthLayout({ children, footer }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-paper lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <aside className="relative hidden overflow-hidden bg-[#f8f1e6] text-stone-900 lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage: 'radial-gradient(rgba(166,62,36,0.16) 1.1px, transparent 1.1px)',
            backgroundSize: '18px 18px',
          }}
        />
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#e7b39a] opacity-50 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-[#f3d7b0] opacity-70 blur-3xl" />

        <Link to="/login" className="relative flex items-center gap-3">
          <HungryHelperLogo size={38} />
          <span className="font-display text-xl font-semibold">Hungry Helper</span>
        </Link>

        <div className="relative max-w-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a63e24]">
            Your weeknight sous-chef
          </p>
          <h2 className="mt-4 font-display text-5xl font-semibold leading-[1.05] xl:text-6xl">
            Dinner plans,
            <br />
            <span className="italic text-[#a63e24]">minus the drama.</span>
          </h2>
          <ul className="mt-10 space-y-5">
            {highlights.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-4">
                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-white shadow-xs ring-1 ring-[#e6d8c8]">
                  <Icon className="h-5 w-5 text-[#a63e24]" />
                </span>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-stone-600">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-stone-500">Plan smarter. Waste less. Eat better.</p>
      </aside>

      <div className="flex min-h-screen flex-col px-5 py-8 sm:px-10 lg:min-h-0">
        <Link to="/login" className="flex items-center gap-2.5 lg:hidden">
          <HungryHelperLogo size={32} />
          <span className="font-display text-lg font-semibold text-stone-900">Hungry Helper</span>
        </Link>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md animate-slide-in-up">{children}</div>
        </div>
        {footer && <div className="text-center text-sm text-stone-600">{footer}</div>}
      </div>
    </div>
  );
}
