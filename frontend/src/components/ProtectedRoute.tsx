import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Layout from './Layout';

interface ProtectedRouteProps {
  children: React.ReactNode;
  mode?: 'full' | 'condensed' | 'focus';
}

export default function ProtectedRoute({ children, mode = 'full' }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Layout mode={mode}>{children}</Layout>;
}
