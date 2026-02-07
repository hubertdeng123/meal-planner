import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContextProvider';
import { ToastProvider } from './contexts/ToastContext';
import ToastContainer from './components/ui/ToastContainer';
import { useAuth } from './hooks/useAuth';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const RecipesPage = lazy(() => import('./pages/RecipesPage'));
const RecipeDetailPage = lazy(() => import('./pages/RecipeDetailPage'));
const GenerateRecipePage = lazy(() => import('./pages/GenerateRecipePage'));
const GroceryListsPage = lazy(() => import('./pages/GroceryListsPage'));
const GroceryListDetailPage = lazy(() => import('./pages/GroceryListDetailPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const MealPlansPage = lazy(() => import('./pages/MealPlansPage'));
const MealPlanDetailPage = lazy(() => import('./pages/MealPlanDetailPage'));
const PantryPage = lazy(() => import('./pages/PantryPage'));

function RouteFallback() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="flex items-center gap-3 text-sm text-stone-500">
        <div
          className="animate-spin rounded-full h-5 w-5 border-b-2"
          style={{ borderBottomColor: 'var(--primary)' }}
        ></div>
        Loading page...
      </div>
    </div>
  );
}

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Router>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />}
          />
          <Route
            path="/register"
            element={isAuthenticated ? <Navigate to="/dashboard" /> : <RegisterPage />}
          />
          <Route
            path="/"
            element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />}
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recipes"
            element={
              <ProtectedRoute>
                <RecipesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recipes/:id"
            element={
              <ProtectedRoute>
                <RecipeDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/generate"
            element={
              <ProtectedRoute mode="focus">
                <GenerateRecipePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/grocery"
            element={
              <ProtectedRoute>
                <GroceryListsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/grocery/:id"
            element={
              <ProtectedRoute mode="focus">
                <GroceryListDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/meal-plans"
            element={
              <ProtectedRoute>
                <MealPlansPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/meal-plans/:id"
            element={
              <ProtectedRoute>
                <MealPlanDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pantry"
            element={
              <ProtectedRoute>
                <PantryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppRoutes />
        <ToastContainer />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
