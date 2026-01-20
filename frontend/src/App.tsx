import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import RecipesPage from './pages/RecipesPage';
import RecipeDetailPage from './pages/RecipeDetailPage';
import GenerateRecipePage from './pages/GenerateRecipePage';
import GroceryListsPage from './pages/GroceryListsPage';
import GroceryListDetailPage from './pages/GroceryListDetailPage';
import SettingsPage from './pages/SettingsPage';
import Layout from './components/Layout';
import { AuthProvider } from './contexts/AuthContextProvider';
import { useAuth } from './hooks/useAuth';

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f97316]"></div>
      </div>
    );
  }

  return (
    <Router>
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
          element={
            isAuthenticated ? (
              <Layout>
                <Navigate to="/dashboard" />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/dashboard"
          element={
            isAuthenticated ? (
              <Layout>
                <DashboardPage />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/recipes"
          element={
            isAuthenticated ? (
              <Layout>
                <RecipesPage />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/recipes/:id"
          element={
            isAuthenticated ? (
              <Layout>
                <RecipeDetailPage />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/generate"
          element={
            isAuthenticated ? (
              <Layout>
                <GenerateRecipePage />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/grocery"
          element={
            isAuthenticated ? (
              <Layout>
                <GroceryListsPage />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/grocery/:id"
          element={
            isAuthenticated ? (
              <Layout>
                <GroceryListDetailPage />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/settings"
          element={
            isAuthenticated ? (
              <Layout>
                <SettingsPage />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
