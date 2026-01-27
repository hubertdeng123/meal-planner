import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline';

export interface BreadcrumbItem {
  label: string;
  href?: string; // If undefined, this is the current page (not clickable)
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  showHome?: boolean; // Whether to show home icon as first item
}

export default function Breadcrumbs({ items, showHome = true }: BreadcrumbsProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav
      className="flex items-center space-x-2 text-sm mb-6 text-stone-500"
      aria-label="Breadcrumb"
    >
      {showHome && (
        <>
          <Link
            to="/dashboard"
            className="text-stone-500 hover:text-stone-700 transition-colors duration-200"
            aria-label="Dashboard"
          >
            <HomeIcon className="h-5 w-5" />
          </Link>
          {items.length > 0 && (
            <ChevronRightIcon className="h-4 w-4 text-stone-400 flex-shrink-0" />
          )}
        </>
      )}

      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <Fragment key={index}>
            {item.href ? (
              <Link
                to={item.href}
                className="text-stone-500 hover:text-stone-700 transition-colors duration-200 truncate max-w-xs"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className="text-stone-900 font-semibold truncate max-w-xs animate-fade-in"
                aria-current="page"
              >
                {item.label}
              </span>
            )}

            {!isLast && <ChevronRightIcon className="h-4 w-4 text-stone-400 flex-shrink-0" />}
          </Fragment>
        );
      })}
    </nav>
  );
}
