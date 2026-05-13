import { BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import LoginPage from './components/LoginPage';
import SignUpPage from './components/SignUpPage';
import ConfirmSignUpPage from './components/ConfirmSignUpPage';
import PasswordResetPage from './components/PasswordResetPage';
import MovieDetailPage from './components/MovieDetailPage';
import MovieListPage from './components/MovieListPage';
import MoviePlayerPage from './components/MoviePlayerPage';
import MovieManagementPage from './components/admin/MovieManagementPage';
import AdminDashboard from './components/AdminDashboard';
import SubscriptionPage from './components/SubscriptionPage';
import SubscriptionCompletionPage from './components/SubscriptionCompletionPage';
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
        <Route path="/movies/:id" element={<MovieDetailPage />} />
        <Route path="/watch/:id" element={<MoviePlayerPage />} />
        <Route path="/search" element={<SearchResultsPage />} />
        <Route path="/genres/:genreName" element={<GenreResultsPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/movies" element={<MovieManagementPage />} />
        <Route path="/subscription/complete" element={<SubscriptionCompletionPage />} />
        <Route path="/subscription" element={<SubscriptionPage />} />
        <Route path="/account" element={<AccountSettingsPage />} />
        <Route path="/watchlist" element={<WatchlistPage />} />
        <Route path="/library" element={<LibraryPage />} />
      </Routes>
    </Router>
  );
}

export default App;
