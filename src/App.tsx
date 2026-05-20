import { BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import LoginPage from './components/LoginPage';
import SignUpPage from './components/SignUpPage';
import ConfirmSignUpPage from './components/ConfirmSignUpPage';
import PasswordResetPage from './components/PasswordResetPage';
import MovieDetailRouteGuard from './components/MovieDetailRouteGuard';
import MovieListPage from './components/MovieListPage';
import MoviePlayerPage from './components/MoviePlayerPage';
import MovieManagementPage from './components/admin/MovieManagementPage';
import AdminDashboard from './components/AdminDashboard';
import { AdminAuthProvider, AdminRouteGuard } from './components/admin/AdminAuth';
import AdminLoginPage from './components/admin/AdminLoginPage';
import SubscriptionPage from './components/SubscriptionPage';
import SubscriptionCompletionPage from './components/SubscriptionCompletionPage';
import PurchaseCompletionPage from './components/PurchaseCompletionPage';
import AccountSettingsPage from './components/AccountSettingsPage';
import SearchResultsPage from './components/SearchResultsPage';
import WatchlistPage from './components/WatchlistPage';
import LibraryPage from './components/LibraryPage';
import GenreResultsPage from './components/GenreResultsPage';
import { ScrollToTop } from './components/common/ScrollToTop';

function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<MovieListPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/signup/confirm" element={<ConfirmSignUpPage />} />
        <Route path="/password-reset" element={<PasswordResetPage />} />
        <Route path="/movies/:id" element={<MovieDetailRouteGuard />} />
        <Route path="/watch/:id" element={<MoviePlayerPage />} />
        <Route path="/search" element={<SearchResultsPage />} />
        <Route path="/genres/:genreName" element={<GenreResultsPage />} />
        <Route
          path="/admin/login"
          element={(
            <AdminAuthProvider>
              <AdminLoginPage />
            </AdminAuthProvider>
          )}
        />
        <Route
          path="/admin"
          element={(
            <AdminAuthProvider>
              <AdminRouteGuard>
                <AdminDashboard />
              </AdminRouteGuard>
            </AdminAuthProvider>
          )}
        />
        <Route
          path="/admin/movies"
          element={(
            <AdminAuthProvider>
              <AdminRouteGuard>
                <MovieManagementPage />
              </AdminRouteGuard>
            </AdminAuthProvider>
          )}
        />
        <Route path="/subscription/complete" element={<SubscriptionCompletionPage />} />
        <Route path="/purchase/complete" element={<PurchaseCompletionPage />} />
        <Route path="/subscription" element={<SubscriptionPage />} />
        <Route path="/account" element={<AccountSettingsPage />} />
        <Route path="/watchlist" element={<WatchlistPage />} />
        <Route path="/library" element={<LibraryPage />} />
      </Routes>
    </Router>
  );
}

export default App;
