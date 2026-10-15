import { Link } from 'react-router-dom';
import { MagnifyingGlassIcon } from '../components/ui/AppIcons';
import { EmptyState } from '../components/ui/EmptyState';

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <EmptyState
        icon={<MagnifyingGlassIcon />}
        title="This page isn't on the menu"
        description="The link may be old, or the page may have moved."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/dashboard" className="btn-primary">
              Go to today
            </Link>
            <Link to="/recipes" className="btn-secondary">
              Browse recipes
            </Link>
          </div>
        }
      />
    </div>
  );
}
